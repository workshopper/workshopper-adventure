var Adventure = require("./adventure")
  , inherits     = require('util').inherits

module.exports = LegacyWorkshopper

function LegacyWorkshopper(options) {
  if (!(this instanceof LegacyWorkshopper))
    return new LegacyWorkshopper(options)

  if (options.showHeader === undefined)
    options.showHeader = true

  if (options.executeImmediately === undefined)
  	options.executeImmediately = true

  Adventure.apply(this, [options])
}

inherits(LegacyWorkshopper, Adventure)