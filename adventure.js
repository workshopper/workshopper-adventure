const minimist     = require('minimist')
    , fs           = require('fs')
    , path         = require('path')
    , map          = require('map-async')
    , msee         = require('msee')
    , chalk        = require('chalk')
    , commandico   = require('commandico')
    , inherits     = require('util').inherits
    , EventEmitter = require('events').EventEmitter

/* jshint -W079 */
const createMenu  = require('simple-terminal-menu')
    , print       = require('./lib/print')
    , util        = require('./util')
    , i18n        = require('./i18n')
    , storage     = require('./lib/storage')
    , error       = print.error
/* jshint +W079 */

const defaultWidth = 65

function legacyCommands(item) {
  if (!item.aliases)
    item.aliases = []
  if (item && item.name)
    item.aliases.unshift(item.name)
  return item
}

function Adventure (options) {
  if (!(this instanceof Adventure))
    return new Adventure(options)

  EventEmitter.call(this)

  if (typeof options === 'string')
    options = {name: options}

  if (typeof options !== 'object')
    return error('You need to provide an options object')

  if (typeof options.name !== 'string')
    return error('You need to provide a `name` String option')

  this.name       = options.name
  this.appName    = options.name

  this.appDir        = util.getDir(options.appDir, '.')
  if (this.appDir)
    this.exerciseDir = util.getDir(options.exerciseDir, this.appDir)
                    || util.getDir('exercises', this.appDir)

  this.global        = storage(storage.userDir, '.config', 'workshopper')
  this.local         = storage(storage.userDir, '.config', this.appName)

  this.globalDataDir = this.global.dir
  this.dataDir       = this.local.dir
  
  // Backwards compatibility with adventure
  this.datadir       = this.dataDir
  
  if (!options.languages) {
    // In case a workshopper didn't define a any language
    options.languages = ['en']
  }

  if (!options.defaultLang) {
    options.defaultLang = options.languages[0]
  }

  this.defaultLang = options.defaultLang
  this.menuOptions = options.menu || {}
  this.helpFile    = options.helpFile
  this.footer      = options.footer
  this.showHeader  = options.showHeader || false
  this.footerFile  = [options.footerFile, path.join(__dirname, './i18n/footer/{lang}.md')]

  if (typeof this.menuOptions.width !== 'number')
    this.menuOptions.width = typeof options.width == 'number' ? options.width : defaultWidth

  if (typeof this.menuOptions.x !== 'number')
    this.menuOptions.x = 3

  if (typeof this.menuOptions.y !== 'number')
    this.menuOptions.y = 2
  
  // an `onComplete` hook function *must* call the callback given to it when it's finished, async or not
  this.onComplete  = typeof options.onComplete == 'function' && options.onComplete

  this.exercises = []
  this._meta = {}

  var menuJson = util.getFile(options.menuJson || 'menu.json', this.exerciseDir)
  if (menuJson) {
    require(menuJson).forEach((function (entry) {
      this.add(entry)
    }).bind(this))
  }

  if (options.menuItems && !options.commands)
    options.commands = options.menuItems

  this.options = options

  this.i18n      = i18n.init(this.options, this.exercises, this.global, this.local, this.defaultLang)
  this.__        = this.i18n.__
  this.__n       = this.i18n.__n
  this.languages = this.i18n.languages

  // backwards compatibility for title and subtitle and width
  this.__defineGetter__('title', this.__.bind(this, 'title'))
  this.__defineGetter__('subtitle', this.__.bind(this, 'subtitle'))
  this.__defineGetter__('lang', this.i18n.lang.bind(this.i18n, 'lang'))
  this.__defineGetter__('width', function () {
    return this.menuOptions.width
  }.bind(this))

  this.current = this.local.get('current')

  this.app = commandico(this, 'menu')
    .loadCommands(path.join(__dirname, 'lib/commands'))
    .loadModifiers(path.join(__dirname, 'lib/modifiers'))
    .addCommands((options.commands || []).map(legacyCommands))
    .addModifiers((options.modifiers || []).map(legacyCommands))
}

inherits(Adventure, EventEmitter)


Adventure.prototype.execute = function (args) {
  return this.app.execute(args)
}

Adventure.prototype.add = function (name_or_object, fn_or_object, fn) {
  var meta
    , dir
    , stat

  meta = (typeof name_or_object === 'object')
    ? name_or_object
    : (typeof fn_or_object === 'object')
      ? fn_or_object
      : {}

  if (typeof name_or_object === 'string')
    meta.name = name_or_object

  if (/^\/\//.test(meta.name))
    return

  if (!meta.id)
    meta.id = util.idFromName(meta.name)

  if (!meta.dir)
    meta.dir = util.dirFromName(this.exerciseDir, meta.name)

  if (meta.dir && !meta.exerciseFile)
    meta.exerciseFile = path.join(meta.dir, './exercise.js')

  if (typeof fn_or_object === 'function')
    meta.fn = fn_or_object

  if (typeof fn === 'function')
    meta.fn = fn

  if (!meta.fn && meta.exerciseFile) {
    try {
      stat = fs.statSync(meta.exerciseFile)
    } catch (err) {
      return error(this.__('error.exercise.missing_file', {exerciseFile: meta.exerciseFile}))
    }

    if (!stat || !stat.isFile())
      return error(this.__('error.exercise.missing_file', {exerciseFile: meta.exerciseFile}))

    meta.fn = (function () {
      return require(meta.exerciseFile)
    }).bind(meta) 
  }

  if (!meta.fn)
    return error(this.__('error.exercise.not_a_workshopper', {exerciseFile: meta.exerciseFile}))


  this.exercises.push(meta.name)
  this._meta[meta.id] = meta
  meta.number = this.exercises.length
  return this
}

Adventure.prototype.end = function (mode, pass, exercise, callback) {
  if (typeof exercise.end == 'function')
    exercise.end(mode, pass, function (err) {
      if (err)
        return error(this.__('error.cleanup', {err: err.message || err}))

      setImmediate(callback || function () {
        process.exit(pass ? 0 : -1)
      })
    }.bind(this))
}

// overall exercise fail
Adventure.prototype.exerciseFail = function (mode, exercise) {
  if (exercise.fail) {
    print.text(this.appName, this.appDir, exercise.failType || 'txt', exercise.fail)
    console.log()
  } else {
    console.log('\n' + chalk.bold.red('# ' + this.__('solution.fail.title')) + '\n')
    console.log(this.__('solution.fail.message', {name: this.__('exercise.' + exercise.meta.name)})) 
  }
  this.end(mode, false, exercise)
}


// overall exercise pass
Adventure.prototype.exercisePass = function (mode, exercise) {
  var done = function done () {
    var completed = this.local.get('completed') || []
      , remaining

    if (completed.indexOf(exercise.meta.name) === -1) 
      completed.push(exercise.meta.name)

    this.local.save('completed', completed)

    remaining = this.exercises.length - completed.length

    if (exercise.pass) {
      print.text(this.appName, this.appDir, exercise.passType || 'txt', exercise.pass)
    } else {
      console.log('\n' + chalk.bold.green('# ' + this.__('solution.pass.title')) + '\n')
      console.log(chalk.bold(this.__('solution.pass.message', {name: this.__('exercise.' + exercise.meta.name)})) + '\n') 
    }

    if (typeof exercise.getSolutionFiles !== 'function' && exercise.solution)
      print.text(this.appName, this.appDir, exercise.solutionType || 'txt', exercise.solution)

    if (remaining === 0) {
      if (this.onComplete)
        return this.onComplete(this.end.bind(this, mode, true, exercise))
      else
        console.log(this.__('progress.finished'))
    } else {
      console.log(this.__n('progress.remaining', remaining))
      console.log(this.__('ui.return', {appName: this.appName}))
    }


    this.end(mode, true, exercise)
  }.bind(this)


  if (!exercise.hideSolutions && typeof exercise.getSolutionFiles === 'function') {
    exercise.getSolutionFiles(function (err, files) {
      if (err)
        return error(this.__('solution.notes.load_error', {err: err.message || err}))
      if (!files.length)
        return done()

      console.log(this.__('solution.notes.compare'))

      function processSolutionFile (file, callback) {
        fs.readFile(file, 'utf8', function (err, content) {
          if (err)
            return callback(err)

          var filename = path.basename(file)

          // code fencing is necessary for msee to render the solution as code
          content = msee.parse('```js\n' + content + '\n```')
          callback(null, { name: filename, content: content })
        })
      }

      function printSolutions (err, solutions) {
        if (err)
          return error(this.__('solution.notes.load_error', {err: err.message || err}))

        solutions.forEach(function (file, i) {
          console.log(chalk.yellow(util.repeat('\u2500', 80)))

          if (solutions.length > 1)
            console.log(chalk.bold.yellow(file.name + ':') + '\n')

          console.log(file.content.replace(/^\n/m, '').replace(/\n$/m, ''))

          if (i == solutions.length - 1)
            console.log(chalk.yellow(util.repeat('\u2500', 80)) + '\n')
        }.bind(this))

        done()
      }

      map(files, processSolutionFile, printSolutions.bind(this))
    }.bind(this))
  } else {
    done()
  }
}

// single 'pass' event for a validation
function onpass (msg) {
  console.log(chalk.green.bold('\u2713 ') + msg)
}


// single 'fail' event for validation
function onfail (msg) {
  console.log(chalk.red.bold('\u2717 ') + msg)
}

Adventure.prototype.runExercise = function (exercise, mode, args) {
  // individual validation events
  if (typeof exercise.on === 'function') {
    exercise.on('pass', onpass)
    exercise.on('fail', onfail)
    exercise.on('pass', this.emit.bind(this, 'pass', exercise, mode))
    exercise.on('fail', this.emit.bind(this, 'fail', exercise, mode)) 
  }

  function done (err, pass) {

    if (pass === undefined && (err === true || err === false || err === undefined || err === null)) {
      pass = err
      err = null
    }

    if (err) {
      // if there was an error then we need to do this after cleanup
      return this.end(mode, true, exercise, function () {
        error(this.__('error.exercise.unexpected_error', {mode: mode, err: (err.message || err) }))
      }.bind(this))
    }

    if (mode == 'run')
      return this.end(mode, true, exercise) // clean up

    if (!pass || exercise.fail)
      return this.exerciseFail(mode, exercise)

    this.exercisePass(mode, exercise)
  }

  var method = exercise[mode]
    , result;

  if (!method)
    return error('This problem doesn\'t have a .' + mode + ' function.')

  if (typeof method !== 'function')
    return error('This .' + mode + ' is a ' + typeof method + '. It should be a function instead.')

  result = (method.length > 1)
        ? method.bind(exercise)(args, done.bind(this))
        : method.bind(exercise)(args)
  
  if (result)
    print.text(this.appName, this.appDir, 'txt', result)
}

Adventure.prototype.printMenu = function () {
  var __ = this.i18n.__
    , menu = createMenu(this.menuOptions)
    , completed = this.local.get('completed') || []

  menu.writeLine(chalk.bold(__('title')))

  if (this.i18n.has('subtitle'))
    menu.writeLine(chalk.italic(__('subtitle')))

  menu.writeSeparator()

  this.exercises.forEach(function (exercise) {
    var label = chalk.bold('»') + ' ' + __('exercise.' + exercise)
      , marker = (completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : ''
    menu.add(label, marker, this.printExercise.bind(this, exercise))
  }.bind(this))

  menu.writeSeparator()

  this.app.commands.reverse().filter(function (extra) {
    return extra.menu !== false
  }.bind(this)).forEach(function (extra) {
    menu.add(chalk.bold(__('menu.' + extra.name)), extra.handler.bind(extra, this))
  }.bind(this))

  menu.add(chalk.bold(__('menu.exit')), process.exit.bind(process, 0))
}

Adventure.prototype.reset = function () {
  this.local.reset()
}

Adventure.prototype.loadExercise = function (name) {
  var meta = this._meta[util.idFromName(name)]
  
  if (!meta)
    return null

  exercise = meta.fn()

  if (typeof exercise.init === 'function')
    exercise.init(this, meta.id, meta.name, meta.dir, meta.number)
  
  exercise.meta = meta

  return exercise
}

Adventure.prototype.printExercise = function printExercise (name) {
  var exercise = this.loadExercise(name)
    , afterPrepare

  if (!exercise)
    return error(this.__('error.exercise.missing', {name: name}))

  if (this.showHeader)
    console.log(
        '\n ' + chalk.green.bold(this.__('title'))
      + '\n' + chalk.green.bold(util.repeat('\u2500', chalk.stripColor(this.__('title')).length + 2))
      + '\n ' + chalk.yellow.bold(this.__('exercise.' + exercise.meta.name))
      + '\n ' + chalk.yellow.italic(this.__('progress.state', {count: exercise.meta.number, amount: this.exercises.length}))
      + '\n'
    )

  this.current = exercise.meta.name

  this.local.save('current', exercise.meta.name)

  afterPreparation = function (err) {
    if (err)
      return error(this.__('error.exercise.preparing', {err: err.message || err}))

    afterProblem = function() {
      var stream = require('combined-stream').create()
        , part
      if (exercise.problem)
        print.text(this.appName, this.appDir, exercise.problemType || 'txt', exercise.problem)
      else {
        part = print.localisedFileStream(this.appName, this.appDir, path.resolve(__dirname, 'i18n/missing_problem/{lang}.md'), this.lang)
        if (part)
          stream.append(part)
      }

      if (exercise.footer || this.footer)
        print.text(this.appName, this.appDir, exercise.footer || this.footer, this.lang)
      else if (this.footerFile !== false) {
        part = print.localisedFirstFileStream(this.appName, this.appDir, this.footerFile || [], this.lang)
        if (part)
          stream.append(part)
      }

      stream.pipe(process.stdout)
    }.bind(this)

    if (!exercise.problem && typeof exercise.getExerciseText === 'function') {
      exercise.getExerciseText(function (err, type, exerciseText) {
        if (err)
          return error(this.__('error.exercise.loading', {err: err.message || err}))
        exercise.problem = exerciseText
        exercise.problemType = type
        afterProblem()
      }.bind(this))
    } else {
      afterProblem()
    }

  }.bind(this)

  if (typeof exercise.prepare === 'function') {
    exercise.prepare(afterPreparation)
  } else {
    afterPreparation(null)
  }
}

module.exports = Adventure