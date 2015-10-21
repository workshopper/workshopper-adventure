var Adventure = require("./adventure")
  , inherits     = require('util').inherits

module.exports = LegacyWorkshopper

function LegacyWorkshopper(options) {
  if (!(this instanceof LegacyWorkshopper))
    return new LegacyWorkshopper(options)

  if (options.showHeader === undefined || options.showHeader) {
    options.header = require('./default/header')
  }

  if (options.execute === undefined)
  	options.execute = 'immediatly'

  Adventure.apply(this, [options])
}

inherits(LegacyWorkshopper, Adventure)