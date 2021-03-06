'use strict'

const fs = require('fs')
const gulp = require('gulp')
const zip = require('gulp-zip')
const del = require('del')
const install = require('gulp-install')
const lambdaDeploy = require('pify')(require('node-aws-lambda').deploy)
const LambdaScheduler = require('node-aws-lambda-scheduler').LambdaScheduler

const config = require('config')

gulp.task('clean', function () {
  return del(['./dist', './dist.zip'])
})

gulp.task('js', function () {
  return gulp
    .src(['app/*'], { base: '.' })
    .pipe(gulp.dest('dist/'))
})

gulp.task('node-mods', function () {
  return gulp
    .src('./package.json')
    .pipe(gulp.dest('dist/'))
    .pipe(install({ production: true }))
})

gulp.task('config', function (done) {
  // TODO Provide a way to validate the config.
  let runtimeConfig = config.get('runtime')
  let awsConfig = config.get('region')
  let prodConfig = Object.assign({}, runtimeConfig)
  console.log(runtimeConfig, awsConfig)
  prodConfig.region = awsConfig

  fs.writeFile('dist/runtime-config.json', JSON.stringify(prodConfig), done)
})

gulp.task('zip', function () {
  return gulp
    .src(['dist/**/*', '!dist/package.json'])
    .pipe(zip('dist.zip'))
    .pipe(gulp.dest('./'))
})

gulp.task('upload', function (callback) {
  const lambdaScheduler = new LambdaScheduler({
    region: config.get('region'),
    functionName: config.get('lambda.functionName'),
    ruleName: config.get('schedule.name'),
    scheduleExpression: config.get('schedule.expression')
  })

  const lambdaDeployConfig = {
    region: config.get('region'),
    handler: config.get('handler'),
    role: config.get('lambda.role'),
    functionName: config.get('lambda.functionName'),
    runtime: config.get('lambda.execution.runtime'),
    timeout: config.get('lambda.execution.timeoutSeconds'),
    memorySize: config.get('lambda.execution.memorySizeMB')
  }

  lambdaDeploy('./dist.zip', lambdaDeployConfig)
    .then(() => lambdaScheduler.schedule())
    .then(callback)
    .catch(callback)
})

gulp.task('invoke', function () {
  const { logpull } = require('./dist/app/handler')
  logpull()
})

gulp.task(
  'deploy',
  gulp.series('clean', 'js', 'node-mods', 'config', 'zip', 'upload')
)
