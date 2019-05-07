'use strict'

// const fs = require('fs')
// const env = JSON.parse(fs.readFileSync('./config.json'))
const env = require('../runtime-config.json')
// const aws = env['runtime']['aws']
const cf = env.cf
const fields = require('./fields.json').fields

const AWS = require('aws-sdk')
const uuid = require('uuid')
const _ = require('lodash')
const assert = require('assert')
const util = require('util')
const EventEmitter = require('events').EventEmitter
const fetch = require('node-fetch')
const onExit = require('signal-exit')

onExit(function (code, signal) {
  console.log(`Exiting with code ${code} ...`)
  if (parseInt(code) === 1) console.log(`Success!`)
  // prevents annoying aws uuid error after process.exit completion
  return process.exit(1)
})

class WatchLogger {
  formatter (logGroupName, logStreamName, awsParams) {
    try {
      assert(logGroupName, 'Parameter logGroupName is required.')
      assert(logStreamName, 'Parameter logStreamName is required.')
      awsParams = awsParams || {}

      let cloudwatchlogs = new AWS.CloudWatchLogs(awsParams)

      let ee = new EventEmitter()
      ee.log = function _log () {
        function squash () {
          let x = _.map(arguments, _.identity)
          return x
        }

        let message = squash.apply(this, arguments)
        let _id = uuid.v4()

        cloudwatchlogs.describeLogStreams({
          logGroupName: logGroupName
        }, function (err, data) {
          if (err) {
            ee.emit('error', err)
            return
          }

          let logStream = data.logStreams.find(function (stream) {
            return stream.logStreamName === logStreamName
          })
          let sequenceToken = logStream.uploadSequenceToken
          cloudwatchlogs.putLogEvents({
            logStreamName: logStreamName,
            logGroupName: logGroupName,
            sequenceToken: sequenceToken,
            logEvents: [{
              message: JSON.stringify({ message: message, uuid: _id }),
              timestamp: Date.now()
            }]
          }, function (err) {
            if (!sequenceToken) console.log('skipped uuid sequence')
            if (err) {
              ee.emit('error', err)
            }
          })
        })

        return _id
      }

      return ee
    } catch (e) {
      console.log('skipped uuid sequence')
    }
  }

  info (data) {
    const cwlogger = this.formatter('cloudflare-group', 'cloudflare-log-stream', { enabled: false })
    try {
      data = JSON.parse(data)
      return cwlogger.log(data['RayID'], data)
    } catch (e) {
      console.log('skipped uuid sequence')
    }
  }
}

class LogPull {
  constructor () {
    this.headers = {
      'X-Auth-Key': cf.authKey,
      'X-Auth-Email': cf.authEmail,
      'Content-Type': 'application/json'
    }
    this.orgId = cf.orgId
    this.fields = fields.join(',')
    this.logger = new WatchLogger()
    this.timer = Number.parseInt(env.interval, 10)
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
        console.log(await this.logger.info(log))
      }
    } else {

    }
  }

  async pollZones () {
    let zones = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=50', { headers: this.headers })
    zones = await zones.json()
    for (const zone of zones.result) {
      if (zone.account.id === this.orgId) {
        console.log(zone.name)
        let logs = await this.els(zone.id)
        this.parse(logs)
      }
    }
  }

  async els (zoneId) {
    console.log(`https://api.cloudflare.com/client/v4/zones/${zoneId}/logs/received?start=${this.isoTime(parseInt(this.timer - 6))}&end=${this.isoTime(-6)}&fields=${this.fields}`)
    return fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/logs/received?start=${this.isoTime(parseInt(this.timer - 6))}&end=${this.isoTime(-6)}&fields=${this.fields}`, { headers: this.headers })
  }
}

module.exports.logpull = async function (event, context, callback) {
  await new LogPull().pollZones()
}
