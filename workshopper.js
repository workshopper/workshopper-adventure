const Adventure = require('./adventure')
const util = require('./util')

class LegacyWorkshopper extends Adventure {
  constructor (options = {}) {
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

    super(options)

    var menuJson = util.getFile(options.menuJson || 'menu.json', this.options.exerciseDir)
    if (menuJson) {
      this.addAll(require(menuJson))
    }
  }
}

module.exports = LegacyWorkshopper
