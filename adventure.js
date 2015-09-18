const path = require('path')
    , inherits     = require('util').inherits

/* jshint -W079 */
const Core  = require('./core')
    , util  = require('./util')
    , error = require('./lib/print').error
    , createExerciseMeta = require('./lib/createExerciseMeta')
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

  if (typeof options !== 'object')
    return error('You need to provide an options object')

  if (typeof options.name !== 'string')
    return error('You need to provide a `name` String option')


  if (!options.commands)
    options.commands = options.menuItems

  if (options.commands)
    options.commands = options.commands.map(legacyCommands)

  if (options.modifiers)
    options.modifiers = option.modifiers.map(legacyCommands)

  this.helpFile    = options.helpFile
  this.showHeader  = options.showHeader || false
  this.footer      = options.footer
  this.footerFile  = [options.footerFile, path.join(__dirname, './i18n/footer/{lang}.md')]

  // an `onComplete` hook function *must* call the callback given to it when it's finished, async or not
  this.onComplete  = typeof options.onComplete == 'function' && options.onComplete

  Core.call(this, options)

  var menuJson = util.getFile(options.menuJson || 'menu.json', this.exerciseDir)
  if (menuJson) {
    require(menuJson).forEach(this.add.bind(this))
  }
  
  if (options.execute === 'now') {
    this.execute(process.argv.slice(2))
  } else if (options.execute === 'immediatly') {
    setImmediate(this.execute.bind(this, process.argv.slice(2))) 
  }

  // backwards compatibility support
  this.__defineGetter__('title', this.__.bind(this, 'title'))
  this.__defineGetter__('subtitle', this.__.bind(this, 'subtitle'))
  this.__defineGetter__('lang', this.i18n.lang.bind(this.i18n, 'lang'))
  this.__defineGetter__('appName', function () { return this.name }.bind(this))
  this.__defineGetter__('width', function () { return this.menuFactory.width }.bind(this))
  this.__defineGetter__('datadir', function () { return this.dataDir }.bind(this)) // adventure
  this.__defineGetter__('defaultLang', function () { return options.defaultLang }.bind(this))
  this.__defineGetter__('languages', function () { return this.i18n.languages }.bind(this))
  this.__defineGetter__('globalDataDir', function () { return this.global.dir }.bind(this))
  this.__defineGetter__('dataDir', function () { return this.local.dir }.bind(this))
}

inherits(LegacyAdventure, Core)

LegacyAdventure.prototype.add = function (name_or_object, fn_or_object, fn) {
  var meta
  try {
    meta = createExerciseMeta(this.exerciseDir, name_or_object, fn_or_object)
  } catch(e) {
    return error(this.__('error.exercise.' + e.id, e))
  }
  return this.addExercise(meta)
}

module.exports = LegacyAdventure