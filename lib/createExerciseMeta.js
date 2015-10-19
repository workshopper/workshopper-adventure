var fs   = require('fs')
  , util = require('../util')
  , path = require('path')

function fileError(id, file) {
	var error = new Error(id);
	error.id = id;
	error.exerciseFile = file;
	return error;
}

module.exports = function createExerciseMeta(exerciseDir, name_or_object, fn_or_object, fn) {
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
    meta.dir = util.dirFromName(exerciseDir, meta.name)

  if (meta.dir && !meta.exerciseFile)
    meta.exerciseFile = path.join(meta.dir, './exercise.js')

  if (typeof fn_or_object === 'function')
    meta.fn = fn_or_object

  if (typeof fn === 'function')
    meta.fn = fn

  if (!meta.fn && meta.exerciseFile) {
    meta.fn = (function () {
      try {
        stat = fs.statSync(meta.exerciseFile)
      } catch (err) {
        throw fileError('missing_file', meta.exerciseFile)
      }

      if (!stat || !stat.isFile())
        throw fileError('missing_file', meta.exerciseFile)
      
      return require(meta.exerciseFile)
    }).bind(meta) 
  }

  if (!meta.fn) {
  	throw fileError('not_a_workshopper', meta.exerciseFile)
  }

  return meta
}
