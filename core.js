const fs           = require('fs')
    , path         = require('path')
    , map          = require('map-async')
    , msee         = require('msee')
    , chalk        = require('chalk')
    , commandico   = require('commandico')
    , inherits     = require('util').inherits
    , EventEmitter = require('events').EventEmitter
    , combinedStream = require('combined-stream')
    , StringStream = require('string-to-stream')

/* jshint -W079 */
const createMenuFactory  = require('simple-terminal-menu/factory')
    , print              = require('./lib/print')
    , util               = require('./util')
    , i18n               = require('./i18n')
    , storage            = require('./lib/storage')
    , error              = print.error
/* jshint +W079 */
  

function Core (options) {
  if (!(this instanceof Core))
    return new Core(options)

  if (!options.name)
    throw new Error('The workshopper needs a name to store the progress.');

  if (!options.languages) 
    options.languages = ['en']

  if (!options.defaultLang)
    options.defaultLang = options.languages[0]

  if (options.appDir)
    options.appDir = util.getDir(options.appDir, '.')

  if (options.appDir)
    options.exerciseDir = util.getDir(options.exerciseDir || 'exercises', options.appDir)

  if (!options.menu)
    options.menu = {
        width: 65
      , x: 3
      , y: 2
    }

  if (!options.menuFactory)
    options.menuFactory = createMenuFactory(options.menu, {})

  EventEmitter.call(this)

  this.options     = options

  var globalStorage = storage(storage.userDir, '.config', 'workshopper')
  this.appStorage    = storage(storage.userDir, '.config', options.name)

  this.exercises   = []
  this._meta       = {}

  this.i18n        = i18n.init(options, globalStorage, this.appStorage)
  this.__          = this.i18n.__
  this.__n         = this.i18n.__n

  this.cli = commandico(this, 'menu')
    .loadCommands(path.resolve(__dirname, './lib/commands'))
    .loadModifiers(path.resolve(__dirname, './lib/modifiers'))

  if (options.commands)
    this.cli.addCommands(options.commands)

  if (options.modifiers)
    this.cli.addModifiers(options.modifiers)
}

inherits(Core, EventEmitter)


Core.prototype.execute = function (args) {
  return this.cli.execute(args)
}

Core.prototype.addExercise = function (meta) {
  this.exercises.push(meta.name)
  this.i18n.updateExercises(this.exercises)
  this._meta[meta.id] = meta
  meta.number = this.exercises.length
  return this
}

Core.prototype.end = function (mode, pass, exercise, callback) {
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
Core.prototype.exerciseFail = function (mode, exercise) {
  if (!exercise.fail) {
    exercise.fail = '\n' +
      '{bold}{red}# {solution.fail.title}{/red}{/bold}\n' +
      '{solution.fail.message}\n'
    exercise.failType = 'txt'
  }
  print.text(this.i18n, exercise.fail, exercise.failType)
  this.end(mode, false, exercise)
}


// overall exercise pass
Core.prototype.exercisePass = function (mode, exercise) {
  var done = function done () {
    var completed = (this.appStorage.get('completed')) || []
      , remaining

    if (completed.indexOf(exercise.meta.name) === -1) 
      completed.push(exercise.meta.name)

    if (this.appStorage)
      this.appStorage.save('completed', completed)

    remaining = this.exercises.length - completed.length

    if (!exercise.pass) {
      exercise.pass = '\n' +
        '{bold}{green}# {solution.pass.title}{/green}{/bold}\n' +
        '{bold}{solution.pass.message}{/bold}\n'
      exercise.passType = 'txt'
    }

    print.text(this.i18n, exercise.pass, exercise.passType)

    if (typeof exercise.getSolutionFiles !== 'function' && exercise.solution)
      print.text(this.i18n, exercise.solution, exercise.solutionType)

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

Core.prototype.runExercise = function (exercise, mode, args) {
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
    print.any(this.i18n, result).pipe(process.stdout)
}

Core.prototype.printMenu = function () {
  var __ = this.i18n.__
    , completed = (this.appStorage && this.appStorage.get('completed')) || []
    , isCommandInMenu = function (extra) {
        if (typeof extra.filter === 'function' && !extra.filter(this)) {
          return false
        } 
        return extra.menu !== false
      }.bind(this)
    , exitCommand = {
        name: 'exit',
        handler: process.exit.bind(process, 0)
      }

  this.options.menuFactory.create({
    title: this.i18n.__('title'),
    subtitle: this.i18n.has('subtitle') && this.i18n.__('subtitle'),
    menu: this.exercises.map(function (exercise) {
        return {
          label: chalk.bold('»') + ' ' + __('exercise.' + exercise),
          marker: (completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : '',
          handler: this.printExercise.bind(this, exercise)
        };
      }.bind(this)),
    extras: this.cli.commands
      .reverse()
      .filter(isCommandInMenu)
      .concat(exitCommand)
      .map(function (command) {
        return {
          label: __('menu.' + command.name),
          handler: command.handler.bind(command, this)
        };
      }.bind(this))
    
  });
}

Core.prototype.loadExercise = function (name) {
  var meta = this._meta[util.idFromName(name)]
  
  if (!meta)
    return null

  exercise = meta.fn()

  if (typeof exercise.init === 'function')
    exercise.init(this, meta.id, meta.name, meta.dir, meta.number)
  
  exercise.meta = meta

  return exercise
}

Core.prototype.printExercise = function printExercise (name) {
  var exercise = this.loadExercise(name)
    , afterPreparation

  if (!exercise)
    return error(this.__('error.exercise.missing', {name: name}))

  if (this.appStorage)
    this.appStorage.save('current', exercise.meta.name)

  afterPreparation = function (err) {
    if (err)
      return error(this.__('error.exercise.preparing', {err: err.message || err}))

    afterProblem = function() {

      if (!exercise.problem)
          return error('The exercise "' + name + '" is missing a problem definition!')

      var stream = combinedStream.create()
        , i18nContext = this.i18n.extend({
            "currentExercise.name" : exercise.meta.name
          , "progress.count" : exercise.meta.number
          , "progress.total" : this.exercises.length
          , "progress.state_resolved" : this.__('progress.state', {count: exercise.meta.number, amount: this.exercises.length})
        })

      stream.append(
           print.stringOrFile(i18nContext, exercise.header, exercise.headerType, exercise.headerFile, this.lang)
        || print.stringOrFile(i18nContext, this.options.header, this.options.headerType, this.options.headerFile, this.lang)
        || new StringStream("")
      )

      stream.append(print.any(i18nContext, exercise.problem, exercise.problemType))

      stream.append(
           print.stringOrFile(i18nContext, exercise.footer, exercise.footerType, exercise.footerFile, this.lang)
        || print.stringOrFile(i18nContext, this.options.footer, this.options.footerType, this.options.footerFile, this.lang)
        || new StringStream("")
      )
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

module.exports = Core