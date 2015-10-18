const fs           = require('fs')
    , path         = require('path')
    , chalk        = require('chalk')
    , commandico   = require('commandico')
    , inherits     = require('util').inherits
    , EventEmitter = require('events').EventEmitter
    , combinedStream = require('combined-stream')
    , StringStream = require('string-to-stream')

/* jshint -W079 */
const createMenuFactory  = require('simple-terminal-menu/factory')
    , PrintStream        = require('./lib/print')
    , util               = require('./util')
    , i18n               = require('./i18n')
    , storage            = require('./lib/storage')
    , error              = require('./lib/error')
/* jshint +W079 */
  

function WA (options) {
  if (!(this instanceof WA))
    return new WA(options)

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
  this.appStorage   = storage(storage.userDir, '.config', options.name)

  this.exercises   = []
  this._meta       = {}


  try {
    this.i18n        = i18n.init(options, globalStorage, this.appStorage)
  } catch(e) {
    console.log(e.message)
    process.exit(1)
  }
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

inherits(WA, EventEmitter)


WA.prototype.execute = function (args) {
  return this.cli.execute(args)
}

WA.prototype.addExercise = function (meta) {
  this.exercises.push(meta.name)
  this.i18n.updateExercises(this.exercises)
  this._meta[meta.id] = meta
  meta.number = this.exercises.length
  return this
}

WA.prototype.end = function (mode, pass, exercise, callback) {
  var end = (typeof exercise.end == 'function') ? exercise.end.bind(exercise, mode, pass) : setImmediate;
  end(function (err) {
    if (err)
      return error(this.__('error.cleanup', {err: err.message || err}))

    setImmediate(callback || function () {
      process.exit(pass ? 0 : -1)
    })
  }.bind(this))
}

// overall exercise fail
WA.prototype.exerciseFail = function (mode, exercise) {
  if (!exercise.fail) {
    exercise.fail = '\n' +
      '{bold}{red}# {solution.fail.title}{/red}{/bold}\n' +
      '{solution.fail.message}\n'
    exercise.failType = 'txt'
  }
  var stream = new PrintStream(this.createExerciseContext(exercise), this.i18n.lang())
  stream.appendChain(exercise.fail, exercise.failType).pipe(process.stdout)
  this.end(mode, false, exercise)
}

WA.prototype.countRemaining = function () {
  var completed = this.appStorage.get('completed')
  return this.exercises.length - completed ? completed.length : 0
}

WA.prototype.markCompleted = function (exerciseName) {
  var completed = this.appStorage.get('completed') || []

  if (completed.indexOf(exerciseName) === -1) 
    completed.push(exerciseName)

  this.appStorage.save('completed', completed)
}

// overall exercise pass
WA.prototype.exercisePass = function (mode, exercise) {
  var done = function done (files) {
    this.markCompleted(exercise.meta.name)

    if (!exercise.pass) {
      exercise.pass = '\n' +
        '{bold}{green}# {solution.pass.title}{/green}{/bold}\n' +
        '{bold}{solution.pass.message}{/bold}\n'
      exercise.passType = 'txt'
    }

    var stream = new PrintStream(this.createExerciseContext(exercise), this.i18n.lang())
    stream.append(exercise.pass, exercise.passType)

    if (!exercise.hideSolutions) {
      if (files.length > 0 || exercise.solution)
        stream.append(this.__('solution.notes.compare'))
      
      if (files) {
        stream.append({ files: files })
      } else {
        stream.append(exercise.solution, exercise.solutionType)
      }
    }

    var complete = (this.onComplete === 'function') ? this.onComplete.bind(this) : setImmediate;
    complete(function () {
      var remaining = this.countRemaining()
      if (remaining !== 0)
        stream.append(
            this.__n('progress.remaining', remaining) + '\n'
          + this.__('ui.return', {appName: this.name}) + '\n'
        )
      else if (!this.onComplete)
        stream.append(this.__('progress.finished') + '\n')

      stream.pipe(process.stdout).on("end", function () {
        complete(this.end.bind(this, mode, true, exercise))
      }.bind(this))
    }.bind(this))

  }.bind(this)


  if (!exercise.hideSolutions && typeof exercise.getSolutionFiles === 'function') {
    exercise.getSolutionFiles(function (err, files) {
      if (err)
        return error(this.__('solution.notes.load_error', {err: err.message || err}))
      done(files)
    }.bind(this))
  } else {
    done([])
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

WA.prototype.verify = function (args, specifier) {
  return this.process('verify', args, specifier)
}

WA.prototype.run = function (args, specifier) {
  return this.process('run', args, specifier)
}

WA.prototype.process = function (mode, args, specifier) {
  var id

  if (specifier)
    id = this.specifierToId(specifier)
  else
    id = util.idFromName(this.appStorage.get('current'))

  if (!id)
    return error(this.__('error.exercise.none_active'))

  exercise = this.loadExercise(id)

  if (!exercise)
    return error(this.__('error.exercise.missing', {name: specifier}))

  if (exercise.requireSubmission !== false && args.length == 0)
    return error(this.__('ui.usage', {appName: this.options.name, mode: mode}))

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
    new PrintStream(this.createExerciseContext(exercise), this.i18n.lang()).appendChain(result).pipe(process.stdout)
}

WA.prototype.loadExercise = function (id) {
  var meta = this._meta[id]
  
  if (!meta)
    return null

  exercise = meta.fn()
  exercise.meta = meta

  if (typeof exercise.init === 'function')
    exercise.init(this, meta.id, meta.name, meta.dir, meta.number)

  return exercise
}
WA.prototype.specifierToId = function (specifier) {

  if (!isNaN(specifier)) {
    var number = parseInt(specifier, 10)
    if (number >= 0 && number < this.exercises.length) {
      specifier = this.exercises[number]
    } else {
      specifier = ''
    }
  }

  return util.idFromName(specifier)
}
WA.prototype.selectExercise = function (specifier) {
  var id = this.specifierToId(specifier)
  if (!id)
    return error(this.__('error.exercise.missing', {name: specifier}))

  var meta = this._meta[id]
  if (!meta)
    return error(this.__('error.exercise.missing', {name: specifier}))

  this.appStorage.save('current', meta.name)
  return meta.id
}
WA.prototype.createExerciseContext = function (exercise) {
  return this.i18n.extend({
      "currentExercise.name" : exercise.meta.name
    , "progress.count" : exercise.meta.number
    , "progress.total" : this.exercises.length
    , "progress.state_resolved" : this.__('progress.state', {count: exercise.meta.number, amount: this.exercises.length})
  })
}
WA.prototype.printExercise = function printExercise (specifier) {
  var id = this.selectExercise(specifier)
  if (!id)
    return error(this.__('error.exercise.missing', {name: specifier}))

  var exercise = this.loadExercise(id)
    , prepare

  prepare = (typeof exercise.prepare === 'function') ? exercise.prepare.bind(exercise) : setImmediate;
  prepare(function(err) {
    if (err)
      return error(this.__('error.exercise.preparing', {err: err.message || err}))

    var getExerciseText = (typeof exercise.getExerciseText === 'function') ? exercise.getExerciseText.bind(exercise) : setImmediate;
    getExerciseText(function (err, exerciseTextType, exerciseText) {
      if (err)
        return error(this.__('error.exercise.loading', {err: err.message || err}))

      var stream = new PrintStream(this.createExerciseContext(exercise), this.i18n.lang())
        , found = false
      stream.append(exercise.header, exercise.headerType)
       || stream.append({file: exercise.headerFile})
       || stream.append(this.options.header, this.options.headerType)
       || stream.append({file: this.options.headerFile})

      if (stream.append(exercise.problem, exercise.problemType))
        found = true
      if (stream.append(exerciseText, exerciseTextType))
        found = true
      if (!found)
        return error('The exercise "' + name + '" is missing a problem definition!')

      stream.append(exercise.footer, exercise.footerType)
       || stream.append({file: exercise.footerFile})
       || stream.append(this.options.footer, this.options.footerType)
       || stream.append({file: this.options.footerFile})
      stream.pipe(process.stdout)
    }.bind(this))
  }.bind(this))
}

module.exports = WA