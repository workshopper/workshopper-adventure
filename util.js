const path = require('path')
const fs = require('fs')

function idFromName (id = '', spaceChar = '_') {
  const regex = new RegExp(`[^\\w${spaceChar}]`, 'gi')

  return id.toString().toLowerCase()
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s/g, spaceChar)
    .replace(regex, '')
}

exports.idFromName = idFromName
exports.dirFromName = (exerciseDir, name) => {
  if (typeof exerciseDir !== 'string') {
    return null
  }
  return path.join(exerciseDir, idFromName(name))
}

function getFsObject (type, file, base) {
  var stat

  if (typeof base !== 'string' || typeof file !== 'string') {
    return null
  }

  file = path.resolve(base, file)
  try {
    stat = fs.statSync(file)
  } catch (e) {}

  if (!stat || !(type === 'file' ? stat.isFile() : stat.isDirectory())) {
    return null
  }

  return file
}

exports.getDir = (file, base) => getFsObject('dir', file, base)
exports.getFile = (file, base) => getFsObject('file', file, base)
