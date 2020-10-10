const WorkshopperAdventure = require('./index')
const error = require('./lib/print').error

function legacyCommands (item) {
  if (!item.aliases) {
    item.aliases = []
  }
  if (item && item.name) {
    item.aliases.unshift(item.name)
  }
  return item
}

class LegacyAdventure extends WorkshopperAdventure {
  constructor (options = {}) {
    if (typeof options === 'string') {
      options = { name: options }
    }
    if (typeof options !== 'object') {
      return error('You need to provide an options object')
    }
    if (!options.commands) {
      options.commands = options.menuItems
    }
    if (options.commands) {
      options.commands = options.commands.map(legacyCommands)
    }
    if (options.modifiers) {
      options.modifiers = options.modifiers.map(legacyCommands)
    }

    if (options.helpFile) {
      options.help = { file: options.helpFile }
    }

    if (!options.footer) {
      if (options.footerFile) {
        options.footer = { file: options.footerFile }
      }
    }

    if (!options.defaultOutputType) {
      options.defaultOutputType = 'txt'
    }

    if (options.hideSolutions === undefined) {
      options.hideSolutions = true
    }

    if (options.hideRemaining === undefined) {
      options.hideRemaining = true
    }

    super(options)
    // an `onComplete` hook function *must* call the callback given to it when it's finished, async or not
    if (typeof options.onComplete === 'function') {
      this.onComplete = options.onComplete
    }

    if (options.execute === 'now') {
      this.execute(process.argv.slice(2))
    } else if (options.execute === 'immediatly') {
      setImmediate(this.execute.bind(this, process.argv.slice(2)))
    }
  }

  // backwards compatibility support
  get title () {
    return this.__('title')
  }

  get subtitle () {
    return this.__('subtitle')
  }

  get name () {
    return this.__('name')
  }

  get appName () {
    return this.__('name')
  }

  get appname () {
    return this.__('name')
  }

  get lang () {
    return this.i18n.lang('lang')
  }

  get width () {
    return this.menuFactory.options.width
  }

  get helpFile () {
    return this.options.helpFile
  }

  get footer () {
    return this.options.footer
  }

  get defaultLang () {
    return this.options.defaultLang
  }

  get languages () {
    return this.options.languages
  }

  get globalDataDir () {
    return this.globalStorage.dir
  }

  get dataDir () {
    return this.appStorage.dir
  }

  // adventure
  get datadir () {
    return this.appStorage.dir
  }

  get appDir () {
    return this.options.appDir
  }

  get exerciseDir () {
    return this.options.exerciseDir
  }

  get current () {
    return this.appStorage.get('current')
  }

  get _adventures () {
    return this.exercises
  }

  get state () {
    return {
      completed: this.appStorage.get('completed'),
      current: this.appStorage.get('current')
    }
  }

  processResult (result, stream) {
    if (result) {
      stream.append(['```', result, '```'])
    }
    return stream
  }
}

module.exports = LegacyAdventure
