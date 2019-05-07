const conf = require('../runtime-config.json')
let aws = {}
aws.accessKeyId = process.env.AWS_ACCESS_KEY_ID
aws.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
const fields = require('./fields.json').fields

const AWS = require('aws-sdk')
AWS.config.update({ region: conf.region })
const uuid = require('uuid')
const _ = require('lodash')
const assert = require('assert')
const EventEmitter = require('events').EventEmitter
const fetch = require('node-fetch')
const onExit = require('signal-exit')
const logger = require('logcloudwatch')('cloudflare-group', 'cloudflare-log-stream')

onExit(function (code, signal) {
  console.log(`Exiting with code ${code} ...`)
  if (parseInt(code) === 1) console.log(`Success!`)
  // prevents annoying aws uuid error after process.exit completion
  return process.exit(1)
})

const WatchLogger = {
  info (data) {
    data = JSON.parse(data)
    logger.on('error', function (err) {
      console.error('Error while putting logs:', err)
    })
    return logger.log(data['RayID'], data)
  }
}

class LogPull {
  constructor () {
    this.headers = {
      'X-Auth-Key': conf.cf.authKey,
      'X-Auth-Email': conf.cf.authEmail,
      'Content-Type': 'application/json'
    }
    this.orgId = conf.cf.orgId
    this.fields = fields.join(',')
    this.timer = -Number.parseInt(conf.interval, 10)
  }

  isoTime (ago) {
    let d, isoNow
    d = new Date()
    d.setTime(d.getTime() + ago * 60000)
    isoNow = JSON.parse(JSON.stringify(d))
    return (`${isoNow.substring(0, 16)}:00Z`)
  }

  async parse (res) {
    if (res.status === 200) {
      let logs = await res.text()
      logs = logs.split('\n').slice(0, -4)
      for (const log of logs) {
        console.log(log)
        console.log(WatchLogger.info(log))
      }
    } else {
      console.log('Could not retrieve logs. Ensure your API key is valid and Log Storage is enabled on this zone with your account team')
    }
  }

  async pollZones () {
    let zones = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=50', { headers: this.headers })
    zones = await zones.json()
    for (const zone of zones.result) {
      if (zone.account.id === this.orgId) {
        console.log(zone.name)
        let logs = await this.els(zone.id)
        await this.parse(logs)
      }
    }
  }

  async els (zoneId) {
    console.info(`${zoneId} ${this.isoTime(this.timer - 6)} ${this.isoTime(-6)}`)
    return fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/logs/received?start=${this.isoTime(this.timer - 6)}&end=${this.isoTime(-6)}&fields=${this.fields}`, { headers: this.headers })
  }
}

module.exports.logpull = async function (event, context, callback) {
  try {
    const pull = new LogPull()
    await pull.pollZones()
  } catch (e) {
    console.log(e)
  }
}
