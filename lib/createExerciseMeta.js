var fs = require('fs')
var util = require('../util')
var path = require('path')

function fileError (id, file) {
  var error = new Error(id)
  error.id = id
  error.exerciseFile = file
  error.toString = function () {
    return '[WorkshopperFileError: ' + id + ' @ ' + error.exerciseFile + ']'
  }
  return error
}

module.exports = function createExerciseMeta (exerciseDir, nameOrObject, fnOrObject, fn) {
  var meta
  var stat

  meta = (typeof nameOrObject === 'object')
    ? nameOrObject
    : (typeof fnOrObject === 'object')
      ? fnOrObject
      : {}

  if (typeof nameOrObject === 'string') {
    meta.name = nameOrObject
  }

  if (/^\/\//.test(meta.name)) {
    return
  }

  if (!meta.id) {
    meta.id = util.idFromName(meta.name)
  }

  if (!meta.dir) {
    meta.dir = util.dirFromName(exerciseDir, meta.name)
  }

  if (meta.dir && !meta.exerciseFile) {
    meta.exerciseFile = path.join(meta.dir, './exercise.js')
  }

  if (typeof fnOrObject === 'function') {
    meta.fn = fnOrObject
  }

  if (typeof fn === 'function') {
    meta.fn = fn
  }

  if (!meta.fn && meta.exerciseFile) {
    meta.fn = function () {
      try {
        stat = fs.statSync(meta.exerciseFile)
      } catch (err) {
        throw fileError('missing_file', meta.exerciseFile)
      }

      if (!stat || !stat.isFile()) {
        throw fileError('missing_file', meta.exerciseFile)
      }

      var exercise = require(meta.exerciseFile)
      if (typeof exercise === 'function') {
        exercise = exercise()
      }
      return exercise
    }
  }

  if (!meta.fn) {
    throw fileError('not_a_workshopper', meta.exerciseFile)
  }

  return meta
}
