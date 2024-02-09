const path = require('path')
const commandico = require('commandico')
const { EventEmitter } = require('events')

const util = require('./util')
const PrintStream = require('./lib/print')
const storage = require('workshopper-adventure-storage')

class WorkshopperAdventure extends EventEmitter {
  constructor (options = {}) {
    super()
    if (options.appDir) {
      options.appDir = util.getDir(options.appDir, '.')
      if (!options.name) {
        try {
          options.name = require(path.join(options.appDir, 'package.json')).name
        } catch (e) {}
      }
    }

    if (!options.name) {
      throw new Error('The workshopper needs a name to store the progress.')
    }

    if (!options.languages) {
      options.languages = ['en']
    }

    if (!options.defaultLang) {
      options.defaultLang = options.languages[0]
    }

    if (!options.defaultOutputType) {
      options.defaultOutputType = 'md'
    }

    if (!options.pkg && options.appDir) {
      try {
        options.pkg = require(path.join(options.appDir, 'package.json'))
      } catch (e) {}
    }

    if (!options.appRepo && options.pkg) {
      options.appRepo = options.pkg.repository.url
    }

    if (!options.version && options.pkg) {
      options.version = options.pkg.version
    }

    if (options.appDir) {
      options.exerciseDir = util.getDir(options.exerciseDir || 'exercises', options.appDir)
    }

    if (!options.menu) {
      options.menu = {
        width: 73,
        x: 2,
        y: 2
      }
    }

    if (options.requireSubmission === undefined) {
      options.requireSubmission = false
    }

    if (!options.menuFactory) {
      options.menuFactory = require('simple-terminal-menu/factory')(options.menu, {})
    }

    EventEmitter.call(this)

    this.options = options

    const globalStorage = storage(storage.userDir, '.config', 'workshopper')
    this.appStorage = storage(storage.userDir, '.config', options.name)

    this.exercises = []
    this._meta = {}

    try {
      this.i18n = require('./i18n').init(options, globalStorage, this.appStorage)
    } catch (e) {
      console.log(e.message)
      process.exit(1)
    }
    this.__ = this.i18n.__
    this.__n = this.i18n.__n

    this.cli = commandico(this, 'menu')
      .loadCommands(path.resolve(__dirname, './lib/commands'))
      .loadModifiers(path.resolve(__dirname, './lib/modifiers'))

    if (options.commands) {
      this.cli.addCommands(options.commands)
    }

    if (options.modifiers) {
      this.cli.addModifiers(options.modifiers)
    }
  }

  execute (args) {
    return this.cli.execute(args)
  }

  add (nameOrObject, fnOrObject, fn) {
    try {
      const meta = require('./lib/createExerciseMeta')(this.options.exerciseDir, nameOrObject, fnOrObject, fn)
      return this.addExercise(meta)
    } catch (e) {
      console.log(e)
      return new Error(this.__(`error.exercise.${e.id}`, e))
    }
  }

  addAll (list) {
    return list.map(entry => this.add(entry))
  }

  addExercise (meta) {
    this.exercises.push(meta.name)
    this._meta[meta.id] = meta
    meta.number = this.exercises.length
    return this
  }

  getVersionString () {
    return `${this.options.name}@${this.options.version}`
  }

  countRemaining () {
    const completed = this.appStorage.get('completed')
    return this.exercises.length - (completed ? completed.length : 0)
  }

  markCompleted (exerciseName, cb) {
    const completed = this.appStorage.get('completed') || []

    if (completed.indexOf(exerciseName) === -1) {
      completed.push(exerciseName)
    }

    this.appStorage.save('completed', completed)

    if (this.onComplete.length === 0) {
      throw new Error('The workshoppers `.onComplete` method must have at least one callback argument')
    }
    return this.onComplete(cb)
  }

  getNext () {
    const current = this.appStorage.get('current')
    const remainingAfterCurrent = this.exercises.slice(this.exercises.indexOf(current) + 1)
    const completed = this.appStorage.get('completed') || []

    const incompleteAfterCurrent = remainingAfterCurrent.filter(function (elem) {
      return completed.indexOf(elem) < 0
    })

    if (incompleteAfterCurrent.length === 0) {
      return new Error('error.no_uncomplete_left')
    }

    return incompleteAfterCurrent[0]
  }

  // abstract, to be overwritten by extending classes
  onComplete (cb) {
    setImmediate(cb)
  }

  exerciseFail (exercise, stream, cb) {
    (
      stream.append(exercise.fail, exercise.failType || this.options.defaultOutputType) ||
      stream.append(this.options.fail, this.options.failType || this.options.defaultOutputType)
    ) &&
    stream.append('\n')

    cb()
  }

  getExerciseFiles (exercise, callback) {
    if (!exercise.hideSolutions && typeof exercise.getSolutionFiles === 'function') {
      return exercise.getSolutionFiles(callback)
    }

    setImmediate(() => callback(null, exercise.solutionFiles || []))
  }

  // overall exercise pass
  exercisePass (exercise, stream, cb) {
    this.getExerciseFiles(exercise, (err, files) => {
      if (err) {
        return cb(this.__('solution.notes.load_error', { err: err.message || err }), false, stream)
      }

      this.markCompleted(exercise.meta.name, (err, completeMessage) => {
        if (err) {
          return cb(err, false)
        }

        let appended = stream.append(completeMessage, this.options.defaultOutputType) ||
        stream.append(exercise.pass, exercise.passType || this.options.defaultOutputType) ||
        stream.append(this.options.pass, this.options.passType || this.options.defaultPassType)

        let hideSolutions = exercise.hideSolutions
        if (hideSolutions === undefined) {
          hideSolutions = this.options.hideSolutions
        }
        if (hideSolutions !== true) {
          if ((files && files.length > 0) || exercise.solution) {
            stream.append('{solution.notes.compare}')
            if (exercise.solutionPath) {
              stream.append({ files: [exercise.solutionPath] })
            }
          }

          files && files.length > 0
            ? stream.append({ files: files })
            : stream.append(exercise.solution, exercise.solutionType || this.options.defaultSolutionType)

          appended = true
        }

        let hideRemaining = exercise.hideRemaining
        if (hideRemaining === undefined) {
          hideRemaining = this.options.hideRemaining
        }

        if (hideRemaining !== true) {
          const remaining = this.countRemaining()
          remaining > 0
            ? stream.append(
              `{progress.remaining#${remaining}}\n\n` +
              '{ui.return}\n')
            : stream.append('{progress.finished}\n')
          appended = true
        }

        if (appended) {
          stream.append('\n')
        }

        cb(null, true)
      })
    })
  }

  verify (args, specifier, contentOnly, cb) {
    return this.process('verify', args, specifier, contentOnly, cb)
  }

  run (args, specifier, cb) {
    return this.process('run', args, specifier, cb)
  }

  process (mode, args, specifier, contentOnly, cb) {
    const exercise = this.loadExercise(specifier)
    let stream = this.createMarkdownStream(exercise)

    if (!cb && typeof contentOnly === 'function') {
      cb = contentOnly
      contentOnly = false
    }

    const cbSafe = (err, pass) => {
      // The method that creates the stream is supposed to know
      // when it will surely never add anything more to the
      // the stream
      stream.stopWaiting()
      // Zalgo protection
      setImmediate(() => cb(err, pass))
    }
    // The stream we return needs to be "not finished yet". Which
    // is why we mark it as "waiting". It will already push out the
    // stream of data but before `.stopWaiting` it will not send
    // the end event.
    stream.startWaiting()

    if (!exercise) {
      cbSafe(this.__('error.exercise.missing', { name: specifier }), false)
      return stream
    }

    var requireSubmission = exercise.requireSubmission
    if (requireSubmission === undefined) {
      requireSubmission = this.options.requireSubmission
    }

    if (requireSubmission !== false && args.length === 0) {
      cbSafe(this.__('ui.usage', { appName: this.options.name, mode: mode }), false, stream)
      return stream
    }

    var method = exercise[mode]
    if (!method) {
      cbSafe(this.__('error.exercise.method_not_required', { method: mode }), false, stream)
      return stream
    }

    if (typeof method !== 'function') {
      // eslint-disable-next-line standard/no-callback-literal
      cbSafe(`The \`.${mode}\` object of the exercise \`${exercise.meta.id} is a \`${typeof method}\`. It should be a \`function\` instead.`, false, stream)
      return stream
    }

    stream = this.executeExercise(exercise, mode, method, args, stream, contentOnly, cbSafe)
    if (typeof exercise.on === 'function') {
      exercise.on('pass', message => {
        stream.append({
          text: require('chalk').green.bold('\u2713 '),
          type: (message && message.type) || 'md',
          skipNewline: true
        })
        stream.append(message, this.options.defaultOutputType)
      })
      exercise.on('fail', message => {
        stream.append({
          text: require('chalk').red.bold('\u2717 '),
          type: (message && message.type) || 'md',
          skipNewline: true
        })
        stream.append(message, this.options.defaultOutputType)
      })
      exercise.on('pass', (...args) => this.emit('pass', exercise, mode, ...args))
      exercise.on('fail', (...args) => this.emit('fail', exercise, mode, ...args))
    }
    return stream
  }

  executeExercise (exercise, mode, method, args, stream, contentOnly, cb) {
    if (!cb && typeof contentOnly === 'function') {
      cb = contentOnly
      contentOnly = false
    }
    if (!contentOnly && mode === 'verify') {
      (stream.append(exercise.header, this.options.defaultOutputType) ||
      stream.append(this.options.header, this.options.defaultOutputType))
    }
    let result
    let finished = false
    const cleanup = (err, pass, message, messageType) => {
      if (finished) {
        return // TODO: make this easier to debug ... bad case of zalgo
      }

      finished = true

      if (message) {
        if (typeof message === 'string') {
          message = {
            text: message,
            type: messageType || this.options.defaultOutputType
          }
        }
        if (pass) {
          exercise.pass = [
            exercise.pass || this.options.pass,
            message
          ]
        } else {
          exercise.fail = [
            exercise.fail || this.options.fail,
            message
          ]
        }
      }

      if (err) {
        return cb(this.__('error.exercise.unexpected_error', { mode: mode, err: (err.stack || err) }), false)
      }

      const writeFooter = () => {
        if (!contentOnly && mode === 'verify') {
          // TODO: Make this footer great again once we fixed workshopper-exercise
          if (stream.append(exercise.footer, this.options.defaultOutputType) ||
              stream.append(this.options.footer, this.options.defaultOutputType)) {
            stream.append('\n')
          }
          return true
        }
        return false
      }

      const end = err => {
        if (typeof exercise.end !== 'function') {
          writeFooter()
          return cb(null, pass)
        }

        exercise.end(mode, pass, cleanupErr => {
          if (cleanupErr) {
            return cb(this.__('error.cleanup', { err: cleanupErr.message || cleanupErr }), false)
          }

          writeFooter()
          cb(err, pass)
        })
      }

      if (mode === 'run') {
        return setImmediate(end)
      }

      if (pass) {
        this.exercisePass(exercise, stream, end)
      } else {
        this.exerciseFail(exercise, stream, end)
      }
    }

    try {
      result = method.length <= 1
        ? cleanup(null, true, method.call(exercise, args))
        : method.call(exercise, args, (err, pass, message) => {
          /*
            err ... Error that occured
            pass ... true = The run has worked
            message ... message to Append after the output

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

          pass = (mode === 'run' || (pass && !exercise.fail))
          err
            ? cleanup(err, null, message)
            : cleanup(null, pass, message)
        })
    } catch (e) {
      cleanup(e, false)
      return stream
    }
    return this.processResult(result, stream)
  }

  processResult (result, stream) {
    stream.append(result, this.options.defaultOutputType)
    return stream
  }

  loadExercise (specifier) {
    var id
    if (specifier) {
      id = this.specifierToId(specifier)
    } else {
      id = util.idFromName(this.appStorage.get('current'))
    }

    if (!id) {
      return null
    }
    var meta = this._meta[id]
    if (!meta) {
      return null
    }

    var exercise = meta.fn()
    exercise.meta = meta

    if (typeof exercise.init === 'function') {
      exercise.init(this, meta.id, meta.name, meta.dir, meta.number)
    }

    return exercise
  }

  specifierToId (specifier) {
    if (!isNaN(specifier)) {
      const number = parseInt(specifier, 10)
      if (number >= 0 && number < this.exercises.length) {
        specifier = this.exercises[number]
      } else {
        specifier = ''
      }
    }

    return util.idFromName(specifier)
  }

  selectExercise (specifier) {
    const id = this.specifierToId(specifier)
    if (!id) {
      throw new Error(this.__('error.exercise.missing', { name: specifier }))
    }

    const meta = this._meta[id]
    if (!meta) {
      throw new Error(this.__('error.exercise.missing', { name: specifier }))
    }

    this.appStorage.save('current', meta.name)
    return meta.id
  }

  createMarkdownStream (exercise) {
    const context = exercise ? this.createExerciseContext(exercise) : this.i18n
    return new PrintStream(context, this.i18n.lang())
  }

  createExerciseContext (exercise) {
    return this.i18n.extend({
      'currentExercise.name': this.__(`exercise.${exercise.meta.name}`),
      'progress.count': exercise.meta.number,
      'progress.total': this.exercises.length,
      'progress.state_resolved': this.__('progress.state', { count: exercise.meta.number, amount: this.exercises.length })
    })
  }

  getExerciseText (specifier, contentOnly, callback) {
    const exercise = this.loadExercise(specifier)

    if (arguments.length === 2) {
      callback = contentOnly
      contentOnly = false
    }

    if (!exercise) {
      return callback(this.__('error.exercise.none_active'))
    }

    const prepare = (typeof exercise.prepare === 'function') ? exercise.prepare.bind(exercise) : setImmediate
    prepare(err => {
      if (err) {
        return callback(this.__('error.exercise.preparing', { err: err.message || err }))
      }

      var getExerciseText = (typeof exercise.getExerciseText === 'function') ? exercise.getExerciseText.bind(exercise) : setImmediate
      getExerciseText((err, exerciseTextType, exerciseText) => {
        if (err) {
          return callback(this.__('error.exercise.loading', { err: err.message || err }))
        }
        const stream = this.createMarkdownStream(exercise)
        let found = false

        if (!contentOnly) {
          stream.append(exercise.header, this.options.defaultOutputType) ||
          stream.append(this.options.header, this.options.defaultOutputType)
        }
        if (stream.append(exercise.problem, exercise.problemType || this.options.defaultOutputType)) {
          found = true
        }
        if (stream.append(exerciseText, exerciseTextType || this.options.defaultOutputType)) {
          found = true
        }
        if (!found) {
          // eslint-disable-next-line standard/no-callback-literal
          return callback(`The exercise "${exercise.meta.name}" is missing a problem definition!`)
        }
        if (!contentOnly) {
          stream.append(exercise.footer, this.options.defaultOutputType) ||
            (stream.append(this.options.footer, this.options.defaultOutputType) &&
            stream.append('\n'))
        }
        callback(null, stream)
      })
    })
  }
}

module.exports = WorkshopperAdventure
