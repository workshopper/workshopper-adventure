const fs          = require('fs')
    , path        = require('path')
    , colorsTmpl  = require('colors-tmpl')
    , through     = require('through2')
    , split       = require('split')
    , inherits    = require('util').inherits
    , CombinedStream = require('combined-stream')

function getText (i18n, contents) {
  contents = colorsTmpl(contents)
    .replace(/\{+([^{}]+)\}+/gi, function (match, k) {
      var numPart = /^([^#]*)\#([^\#]+)$/.exec(k)
      if (numPart) {
        k = numPart[1]
        return i18n.has(k) ? getText(i18n, i18n.__n(k, parseFloat(numPart[2]))) : match
      } else {
        return i18n.has(k) ? getText(i18n, i18n.__(k)) : match
      }
    })
    .replace(/\$([A-Z_]+)/g, function (match, k) {
      return i18n.has(k) ? getText(i18n, i18n.__(k)) : ('$' + k)
    })

  if (i18n.has('appDir'))
    // proper path resolution
    contents = contents.replace(/\{rootdir:([^}]+)\}/gi, function (match, subpath) {
      return 'file://' + path.join(i18n.__('appDir'), subpath)
    })

  return contents
}

function localisedFileName (lang, file) {
  // Since the files that will be printed are subject to user manipulation
  // a null can happen here, checking for it just in case.
  if (file === undefined || file === null)
    return null

  file = file.replace(/\{lang\}/g, lang)
  try {
    if (fs.accessSync ? (fs.accessSync(file, fs.R_OK) || true) : fs.existsSync(file)) {
      var stat = fs.statSync(file)
      if (stat && stat.isFile())
        return file
    }
  } catch(e) {}
  return null
}

function localisedFirstFile (files, lang) {
  if (files === null)
    return null

  var file = null
  if (!Array.isArray(files)) {
    file = localisedFileName(lang, files)
  } else {
    for (var i = 0; i < files.length && !file; i++) {
      file = localisedFileName(lang, files[i])
    }
  }
  return file
}

var PrintStream = function (i18n, lang) {
  if (!(this instanceof PrintStream))
    return new PrintStream(i18n, lang)

  CombinedStream.call(this, {})
  this.i18n = i18n
  this.lang = lang
}

inherits(PrintStream, CombinedStream)

PrintStream.prototype._append = CombinedStream.prototype.append

PrintStream.prototype.append = function (content, contentType) {

  var stream = null

  if (typeof content === 'function')
    content = content(this.i18n, this.lang)

  if (content === null || content === undefined)
    return false

  if (Array.isArray(content)) {
    return content.reduce(function (found, child) {
      if (this.append(child)) {
        return true
      }
      return found
    }.bind(this), false)
  }

  if (content.hasOwnProperty("first")) {
    return content.first.reduce(function (found, child) {
      return found || this.append(child)
    }.bind(this), false) 
  } else if (content.hasOwnProperty("files")) {
    var files = content.files
      .map(localisedFileName.bind(null, this.lang))
      .filter(function (file) { return file !== null })
    if (files.length > 0) {  
      stream = new PrintStream(this.i18n, this.lang)
      files.forEach(function (file) {
        stream.append('---', 'md')
        if (files.length > 1)
          stream.append('_' + file + '_ :')
        stream.append({file: file})
      })
      stream.append('---', 'md')
      this._append(stream)
      return true
    } else {
      return false
    }
  }

  if (content.hasOwnProperty("file")) {
    var file = localisedFirstFile(content.file, this.lang)
    if (file) {
      stream = fs.createReadStream(file, {encoding: 'utf8'})
      contentType = content.type || contentType || path.extname(file).replace(/^\./, '').toLowerCase()
    }
  } else if (content.pipe) {
    stream = content
  } else if (content.hasOwnProperty("text")) {
    contentType = content.type
    stream = new require('string-to-stream')(content.text + '\n')
  } else {
    stream = new require('string-to-stream')(content + '\n')
  }

  if (!stream)
    return false

  if (!contentType)
    contentType = 'raw'

  var i18n = this.i18n
    , buffer = []

  this._append(
    stream
      .pipe(split())
      .pipe(through(function (contents, encoding, done) {
        buffer.push(getText(i18n, contents.toString()))
        done()
      }, function (done) {
        var contents = buffer.join('\n')
        if (contentType === 'md')
          // convert Markdown to ANSI
          this.push(contents)
        else
          // code fencing is necessary for msee to render the solution as code
          this.push('```' + contentType + '\n' + contents.replace(/^\n/m, '').replace(/\n$/m, '') + '\n```\n')
        done()
      }))
  )
  return true
}

PrintStream.prototype.appendChain = function (content, type) {
  this.append(content, type)
  return this
}

module.exports = PrintStream