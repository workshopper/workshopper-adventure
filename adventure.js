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

  if (options.showHeader)
    options.header = '\n {green}{bold}{title}{/bold}{/green}'
          + '\n{green}{bold}{titleUnderline}{/bold}{/green}'
          + '\n {yellow}{bold}{currentExercise.name}{/bold}{/yellow}'
          + '\n {yellow}{italic}{progress.state_resolved}{/italic}{/yellow}'
          + '\n\n'

  if (options.footerFile) {
    if (!Array.isArray(options.footerFile))
      options.footerFile = [options.footerFile]
  } else {
    options.footerFile = []
  }
  options.footerFile.push(path.join(__dirname, './i18n/footer/{lang}.md'))


  this.helpFile    = options.helpFile
  this.footer      = options.footer

  // an `onComplete` hook function *must* call the callback given to it when it's finished, async or not
  this.onComplete  = typeof options.onComplete == 'function' && options.onComplete

  Core.call(this, options)

  var menuJson = util.getFile(options.menuJson || 'menu.json', this.options.exerciseDir)
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
  this.__defineGetter__('name', this.__.bind(this, 'name'))
  this.__defineGetter__('appName', this.__.bind(this, 'name'))
  this.__defineGetter__('appname', this.__.bind(this, 'name'))
  this.__defineGetter__('lang', this.i18n.lang.bind(this.i18n, 'lang'))
  this.__defineGetter__('width', function () { return this.menuFactory.options.width }.bind(this))
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

LegacyAdventure.prototype.add = function (name_or_object, fn_or_object, fn) {
  var meta
  try {
    meta = createExerciseMeta(this.options.exerciseDir, name_or_object, fn_or_object)
  } catch(e) {
    console.log(e)
    return error(this.__('error.exercise.' + e.id, e))
  }
  return this.addExercise(meta)
}

module.exports = LegacyAdventure