const fs          = require('fs')
    , path        = require('path')
    , colorsTmpl  = require('colors-tmpl')
    , through     = require('through')
    , chalk       = require('chalk')
    , msee        = require('msee')
    , split       = require('split')
    , StringStream = require('string-to-stream')
    , mseeOptions = {
          paragraphStart: ''
        , paragraphEnd: '\n\n'
      }

function getText (i18n, contents, contentType) {

  if (typeof contents === 'object')
    contents = contents.toString()

  if (typeof contents === 'function')
    contents = contents()

  if (typeof contents !== 'string')
    contents = ''

  contents = colorsTmpl(contents)

  contents = contents.replace(/\{([^}]+)\}/gi, function (match, k) {
    return i18n.has(k) ? i18n.__(k) : ('{' + k + '}')
  })

  contents = contents.replace(/\$([A-Z_]+)/g, function (match, k) {
    return i18n.has(k) ? i18n.__(k) : ('$' + k)
  })

  if (i18n.has('appDir')) {
    // proper path resolution
    contents = contents.replace(/\{rootdir:([^}]+)\}/gi, function (match, subpath) {
      return 'file://' + path.join(i18n.__('appDir'), subpath)
    })
  }

  if (contentType === 'md') {
    // convert Markdown to ANSI
    contents = msee.parse(contents, mseeOptions)
  }

  return contents
}

function printText (i18n, contents, contentType) {
  console.log(getText(i18n, contents, contentType))
}

function textStream (i18n, contents, contentType) {
  return new StringStream(getText(i18n, contents, contentType) + '\n')
}

function printAny (i18n, contents, contentType) {
  if (typeof contents === 'function')
    contents = contents()
  if (typeof contents === 'object' && contents.pipe) {
    return contents
      .pipe(split())
      .pipe(through(function (data) {
        printText(i18n, data, contentType)
      }))
  } else {
    return textStream(i18n, contents, contentType)
  }
}

function createFileStream (i18n, file) {
  var contentType = path.extname(file).replace(/^\./, '').toLowerCase()
  return fs.createReadStream(file, {encoding: 'utf8'})
           .pipe(through(function (contents) {
              this.emit('data', getText(i18n, contents, contentType))
           }))
}


function getExistingFile (file, lang) {
  if (!file)
    return false

  file = file.replace(/\{lang\}/g, lang)
  if (fs.existsSync(file)) {
    var stat = fs.statSync(file)
    if (stat && stat.isFile())
      return file
  }
  return null
}

function localisedFileStream (i18n, file, lang) {
  file = getExistingFile(file, lang)
  return file ? createFileStream(i18n, file) : new StringStream('')
}

function localisedFirstFileStream (i18n, files, lang) {
  var file = null
  if (!Array.isArray(files))
    files = [files]
  
  files.forEach(function (rawFile) {
    // Since the files that will be printed are subject to user manipulation
    // a null can happen here, checking for it just in case.
    if (rawFile === undefined || rawFile === null)
      return

    if (!file)
      file = getExistingFile(rawFile, lang)
  })
  return file ? createFileStream(i18n, file) : new StringStream('')
}

function error () {
  var pr = chalk.bold.red
  console.log(pr.apply(pr, arguments))
  process.exit(-1)
}
function stringOrFile(i18n, string, stringType, file) {
  if (string === undefined)
    return null

  if (string)
    return printAny(i18n, string, stringType || 'txt')

  if (file === undefined)
    return null
  
  return localisedFirstFileStream(i18n, file)
}

exports.error = error
exports.text = printText
exports.textStream = textStream
exports.stringOrFile = stringOrFile
exports.any = printAny
exports.localisedFileStream = localisedFileStream
exports.localisedFirstFileStream = localisedFirstFileStream
