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


WA.prototype.countRemaining = function () {
  var completed = this.appStorage.get('completed')
  return this.exercises.length - completed ? completed.length : 0
}

WA.prototype.markCompleted = function (exerciseName, cb) {
  var completed = this.appStorage.get('completed') || []

  if (completed.indexOf(exerciseName) === -1) 
    completed.push(exerciseName)

  this.appStorage.save('completed', completed)

  if (this.onComplete.length === 0) {
    throw new Error('The workshoppers `.onComplete` method must have at least one callback argument')
  }
  return this.onComplete(cb)
}

WA.prototype.onComplete = function (cb) {
  setImmediate(cb)
}

// overall exercise fail
WA.prototype.exerciseFail = function (mode, exercise, stream, cb) {
  exercise.fail
    ? stream.appendChain(exercise.fail, exercise.failType)
    : stream.appendChain('\n' +
      '{bold}{red}# {solution.fail.title}{/red}{/bold}\n' +
      '{solution.fail.message}\n', 'txt')

  cb()
}

WA.prototype.getExerciseFiles = function (exercise, callback) {
  if (!exercise.hideSolutions && typeof exercise.getSolutionFiles === 'function')
    return exercise.getSolutionFiles(callback)

  setImmediate(callback.bind(null, null, exercise.solutionFiles || []))
}

// overall exercise pass
WA.prototype.exercisePass = function (mode, exercise, stream, cb) {
  this.getExerciseFiles(exercise, function (err, files) {
    if (err)
      return error(this.__('solution.notes.load_error', {err: err.message || err}))

    this.markCompleted(exercise.meta.name, function (err, completeMessage) {
      if (err)
        return cb(err)

      exercise.pass
        ? stream.append(exercise.pass, exercise.passType)
        : stream.append('\n' +
          '{bold}{green}# {solution.pass.title}{/green}{/bold}\n' +
          '{bold}{solution.pass.message}{/bold}\n', 'txt')

      if (!exercise.hideSolutions) {
        if (files.length > 0 || exercise.solution)
          stream.append('{solution.notes.compare}')

        files && files.length > 0
          ? stream.append({ files: files })
          : stream.append(exercise.solution, exercise.solutionType)
      }

      var remaining = this.countRemaining()
      remaining > 0
        ? stream.append(
            '{progress.remaining#' + remaining + '}\n' +
            '{ui.return}\n')
        : stream.append('{progress.finished}\n')

      stream.append(completeMessage)

      cb()
    }.bind(this))
  }.bind(this))
}

WA.prototype.verify = function (args, specifier, cb) {
  return this.process('verify', args, specifier, cb)
}

WA.prototype.run = function (args, specifier, cb) {
  return this.process('run', args, specifier, cb)
}

WA.prototype.process = function (mode, args, specifier, cb) {
  var exercise = this.loadExercise(specifier)

  if (!exercise)
    return cb(this.__('error.exercise.missing', {name: specifier}))

  if (exercise.requireSubmission !== false && args.length == 0)
    return cb(this.__('ui.usage', {appName: this.options.name, mode: mode}))

  var method = exercise[mode]
  if (!method)
    return cb('This problem doesn\'t have a `.' + mode + '` function.')

  if (typeof method !== 'function')
    return cb('The `.' + mode + '` object of the exercise `' + exercise.meta.id + ' is a `' + typeof method + '`. It should be a `function` instead.')

  var cleanup = this.executeExercise(exercise, mode, method, args, (typeof exercise.on === 'function'), cb)
  if (typeof exercise.on === 'function') {
    exercise.on('pass', cleanup.bind(null, null, false))
    exercise.on('fail', cleanup.bind(null, null, true))
    exercise.on('pass', this.emit.bind(this, 'pass', exercise, mode))
    exercise.on('fail', this.emit.bind(this, 'fail', exercise, mode)) 
  }
}

WA.prototype.executeExercise = function (exercise, mode, method, args, hasOtherMeansOfCallback, cb) {
  var result
    , finished = false
    , stream = new PrintStream(this.createExerciseContext(exercise), this.i18n.lang())
    , cleanup = function cleanup(err, pass, message, messageType) {
        if (finished)
          return // TODO: make this easier to debug ... bad case of zalgo

        finished = true

        if (message) {
          if (pass) {
            exercise.pass = message
            exercise.passType = messageType
          } else {
            exercise.fail = message
            exercise.failType = messageType
          }
        }

        if (err)
          return cb(this.__('error.exercise.unexpected_error', {mode: mode, err: (err.message || err) }))

        var end = function (err) {
          if (typeof exercise.end !== 'function')
            return cb(null, pass, stream)

          exercise.end(mode, pass, function (cleanupErr) {
            if (cleanupErr)
              return cb(this.__('error.cleanup', {err: cleanupErr.message || cleanupErr}))

            cb(err, pass, stream)
          }.bind(this))
        }.bind(this)

        if (mode === 'run')
          return setImmediate(end)

        if (pass)
          this.exercisePass(mode, exercise, stream, end)
        else
          this.exerciseFail(mode, exercise, stream, end)

      }.bind(this)

  try {
    result = (method.length <= 1)
      ? method.call(exercise, args)
      : method.call(exercise, args, function callback (err, pass) {
          /*
            callback(true)       -> err=null,  pass=true
            callback(false)      -> err=null,  pass=false
            callback()           -> err=null,  pass=null
            callback(null)       -> err=null,  pass=null
            callback(true, true) -> err=true,  pass="x"
            callback(false, "x") -> err=false, pass="x"
            callback(null, "x")  -> err=null,  pass="x"
            callback("x", false) -> err="x",   pass=false
            callback("x", true)  -> err="x",   pass=true ... pass should be ignored
          */
          if (pass === undefined && (err === true || err === false || err === undefined || err === null)) {
            pass = err
            err = null
          }

          err
            ? cleanup(err)
            : cleanup(null, mode === 'run' || (pass && !exercise.fail))

        }.bind(this))
  } catch (e) {
    return cleanup(e)
  }
  
  if (result || (!hasOtherMeansOfCallback && method.length <= 1)) {
    cleanup(null, true, result)
  }

  return cleanup
}
WA.prototype.loadExercise = function (specifier) {
  var id
  if (specifier)
    id = this.specifierToId(specifier)
  else
    id = util.idFromName(this.appStorage.get('current'))

  if (!id)
    return null

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
WA.prototype.getExerciseText = function printExercise (specifier, callback) {
  var exercise = this.loadExercise(specifier)
    , prepare

  if (!exercise)
    callback(this.__('error.exercise.none_active'))

  prepare = (typeof exercise.prepare === 'function') ? exercise.prepare.bind(exercise) : setImmediate;
  prepare(function(err) {
    if (err)
      return callback(this.__('error.exercise.preparing', {err: err.message || err}))

    var getExerciseText = (typeof exercise.getExerciseText === 'function') ? exercise.getExerciseText.bind(exercise) : setImmediate;
    getExerciseText(function (err, exerciseTextType, exerciseText) {
      if (err)
        return callback(this.__('error.exercise.loading', {err: err.message || err}))

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
        return callback('The exercise "' + name + '" is missing a problem definition!')

      stream.append(exercise.footer, exercise.footerType)
       || stream.append({file: exercise.footerFile})
       || stream.append(this.options.footer, this.options.footerType)
       || stream.append({file: this.options.footerFile})
      callback(null, stream)
    }.bind(this))
  }.bind(this))
}

module.exports = WA