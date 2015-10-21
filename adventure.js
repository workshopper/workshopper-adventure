const path = require('path')
    , inherits     = require('util').inherits

/* jshint -W079 */
const Core  = require('./index')
    , error = require('./lib/print').error
/* jshint +W079 */

function legacyCommands(item) {
  if (!item.aliases)
    item.aliases = []
  if (item && item.name)
    item.aliases.unshift(item.name)
  return item
}

function LegacyAdventure (options) {
  if (!(this instanceof LegacyAdventure))
    return new LegacyAdventure(options)

  if (typeof options === 'string')
    options = {name: options}

  if (!options)
    options = {}

  if (typeof options !== 'object')
    return error('You need to provide an options object')

  if (!options.commands)
    options.commands = options.menuItems

  if (options.commands)
    options.commands = options.commands.map(legacyCommands)

  if (options.modifiers)
    options.modifiers = option.modifiers.map(legacyCommands)

  if (options.helpFile)
    options.help = {file: options.helpFile}

  if (!options.footer) {
    if (options.footerFile) {
      options.footer = { file: options.footerFile }
    } else {
      options.footer = require('./default/footer')
    }
  }

  // an `onComplete` hook function *must* call the callback given to it when it's finished, async or not
  if (typeof options.onComplete == 'function')
    this.onComplete = options.onComplete

  Core.call(this, options)

  if (options.execute === 'now') {
    this.execute(process.argv.slice(2))
  } else if (options.execute === 'immediatly') {
    setImmediate(this.execute.bind(this, process.argv.slice(2))) 
  }

  // backwards compatibility support
  this.__defineGetter__('title', this.__.bind(this, 'title'))
  this.__defineGetter__('subtitle', this.__.bind(this, 'subtitle'))
  this.__defineGetter__('name', this.__.bind(this, 'name'))
  this.__defineGetter__('appName', this.__.bind(this, 'name'))
  this.__defineGetter__('appname', this.__.bind(this, 'name'))
  this.__defineGetter__('lang', this.i18n.lang.bind(this.i18n, 'lang'))
  this.__defineGetter__('width', function () { return this.menuFactory.options.width }.bind(this))
  this.__defineGetter__('helpFile', function () { return this.options.helpFile }.bind(this))
  this.__defineGetter__('footer', function () { return this.options.footer }.bind(this))
  this.__defineGetter__('defaultLang', function () { return this.options.defaultLang }.bind(this))
  this.__defineGetter__('languages', function () { return this.options.languages }.bind(this))
  this.__defineGetter__('globalDataDir', function () { return this.globalStorage.dir }.bind(this))
  this.__defineGetter__('dataDir', function () { return this.appStorage.dir }.bind(this))
  this.__defineGetter__('datadir', function () { return this.appStorage.dir }.bind(this)) // adventure
  this.__defineGetter__('appDir', function () { return this.options.appDir }.bind(this))
  this.__defineGetter__('exerciseDir', function () { return this.options.exerciseDir }.bind(this))
  this.__defineGetter__('current', function () { return this.appStorage.get('current') }.bind(this))
}

inherits(LegacyAdventure, Core)

module.exports = LegacyAdventure