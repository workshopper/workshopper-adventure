const path = require('path')
const fs = require('fs')

function idFromName (id, spaceChar = '_') {
  if (id === null || id === undefined) {
    id = ''
  }
  const regex = new RegExp(`[^\\w${spaceChar}]`, 'gi')

  return id.toString().toLowerCase()
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s/g, spaceChar)
    .replace(regex, '')
}

function dirFromName (exerciseDir, name) {
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

module.exports = {
  idFromName: idFromName,
  dirFromName: dirFromName,
  getDir: getFsObject.bind(null, 'dir'),
  getFile: getFsObject.bind(null, 'file')
}
