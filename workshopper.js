var Adventure = require('./adventure')
var util = require('./util')
var inherits = require('util').inherits

module.exports = LegacyWorkshopper

function LegacyWorkshopper (options) {
  if (!(this instanceof LegacyWorkshopper)) {
    return new LegacyWorkshopper(options)
  }

  if (!options.header) {
    if (options.showHeader === undefined || options.showHeader) {
      options.header = require('./default/header')
    }
  }
  if (options.hideRemaining === undefined) {
    options.hideRemaining = false
  }

  if (options.requireSubmission === undefined) {
    options.requireSubmission = true
  }

  if (options.pass === undefined) {
    options.pass = require('./default/pass')
  }

  if (options.fail === undefined) {
    options.fail = require('./default/fail')
  }

  if (options.execute === undefined) {
    options.execute = 'immediatly'
  }

  Adventure.apply(this, [options])

  var menuJson = util.getFile(options.menuJson || 'menu.json', this.options.exerciseDir)
  if (menuJson) {
    this.addAll(require(menuJson))
  }
}

inherits(LegacyWorkshopper, Adventure)
