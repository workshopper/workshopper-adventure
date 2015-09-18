const fs           = require('fs')
    , path         = require('path')
    , map          = require('map-async')
    , msee         = require('msee')
    , chalk        = require('chalk')
    , commandico   = require('commandico')
    , inherits     = require('util').inherits
    , EventEmitter = require('events').EventEmitter

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

  if (!options.languages) 
    options.languages = ['en']

  if (!options.defaultLang)
    options.defaultLang = options.languages[0]

  if (options.appDir)
    options.appDir = util.getDir(options.appDir, '.')

  if (options.appDir)
    options.exerciseDir = util.getDir(options.exerciseDir || 'exercises', options.appDir)

  EventEmitter.call(this)

  this.options     = options

  this.name        = options.name
  this.appDir      = options.appDir
  this.exerciseDir = options.exerciseDir

  this.globalStorage = storage(storage.userDir, '.config', 'workshopper')
  if (this.name)
    this.appStorage  = storage(storage.userDir, '.config', this.name)

  this.exercises   = []
  this._meta       = {}

  this.i18n        = i18n.init(options, this.globalStorage, this.appStorage)
  this.__          = this.i18n.__
  this.__n         = this.i18n.__n

  if (this.appStorage)
    this.current = this.appStorage.get('current')
  this.menuFactory = createMenuFactory(options.menu || {}, {
    title: this.i18n.__('title'),
    subtitle: this.i18n.has('subtitle') && this.i18n.__('subtitle')
  })

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
Core.prototype.exercisePass = function (mode, exercise) {
  var done = function done () {
    var compappStorage = (this.local && this.local.get('completed')) || []
      , remaining

    if (completed.indexOf(exercise.meta.name) === -1) 
      completed.push(exercise.meta.name)

    if (this.appStorage)
      this.appStorage.save('completed', completed)

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
    print.any(this.appName, this.appDir, 'txt', result)
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

  this.menuFactory.create({
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

  if (this.appStorage)
    this.appStorage.save('current', exercise.meta.name)

  afterPreparation = function (err) {
    if (err)
      return error(this.__('error.exercise.preparing', {err: err.message || err}))

    afterProblem = function() {
      var stream = require('combined-stream').create()
        , part

      function then() {
        if (exercise.footer || this.footer)
          print.text(this.appName, this.appDir, exercise.footer || this.footer, this.lang)
        else if (this.footerFile !== false) {
          part = print.localisedFirstFileStream(this.appName, this.appDir, this.footerFile || [], this.lang)
          if (part)
            stream.append(part)
        }

        stream.pipe(process.stdout)
      }
      if (exercise.problem)
        print.any(this.appName, this.appDir, exercise.problemType || 'txt', exercise.problem, then.bind(this))
      else {
        part = print.localisedFileStream(this.appName, this.appDir, path.resolve(__dirname, 'i18n/missing_problem/{lang}.md'), this.lang)
        if (part)
          stream.append(part)
        then.apply(this)
      }
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