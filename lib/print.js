const fs = require('fs')
const path = require('path')
const colorsTmpl = require('colors-tmpl')
const through2 = require('through2')
const split = require('split')
const inherits = require('util').inherits
const CombinedStream = require('combined-stream-wait-for-it')
const StrToStream = require('string-to-stream')

function getText (i18n, contents) {
  contents = colorsTmpl(contents)
    .replace(/\{+([^{}]+)\}+/gi, function (match, k) {
      var numPart = /^([^#]*)#([^#]+)$/.exec(k)
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

  if (i18n.has('appDir')) {
    // proper path resolution
    contents = contents.replace(/\{rootdir:([^}]+)\}/gi, function (match, subpath) {
      return 'file://' + path.join(i18n.__('appDir'), subpath)
    })
  }

  return contents
}

function localisedFileName (lang, file) {
  // Since the files that will be printed are subject to user manipulation
  // a null can happen here, checking for it just in case.
  if (file === undefined || file === null) {
    return null
  }

  file = file.replace(/\{?\{lang\}?\}/g, lang)
  try {
    if (fs.accessSync ? (fs.accessSync(file, fs.R_OK) || true) : fs.existsSync(file)) {
      var stat = fs.statSync(file)
      if (stat && stat.isFile()) {
        return file
      }
    }
  } catch (e) {}
  return null
}

function localisedFirstFile (files, lang) {
  if (files === null) {
    return null
  }

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
  if (!(this instanceof PrintStream)) {
    return new PrintStream(i18n, lang)
  }

  CombinedStream.call(this, {})
  this.i18n = i18n
  this.lang = lang
  this.typeOpen = 'md'
}

inherits(PrintStream, CombinedStream)

PrintStream.prototype._append = CombinedStream.prototype.append
PrintStream.prototype._end = CombinedStream.prototype.end
PrintStream.prototype.sub = function () {
  var sub = new PrintStream(this.i18n, this.lang)
  this._append(sub)
  return sub
}
PrintStream.prototype.append = function (content, contentType) {
  var stream = null

  if (typeof content === 'function') {
    content = content(this.i18n, this.lang)
  }

  if (content === null || content === undefined) {
    return false
  }

  if (Array.isArray(content)) {
    return content.reduce(function (found, child) {
      if (this.append(child)) {
        return true
      }
      return found
    }.bind(this), false)
  }

  if (content.hasOwnProperty('first')) {
    return content.first.reduce(function (found, child) {
      return found || this.append(child)
    }.bind(this), false)
  } else if (content.hasOwnProperty('files')) {
    var files = content.files
      .map(localisedFileName.bind(null, this.lang))
      .filter(function (file) { return file !== null })
    if (files.length > 0) {
      stream = this.sub()
      files.forEach(function (file) {
        stream.append('---', 'md')
        if (files.length > 1) {
          stream.append('`_' + file + '_` :')
        }
        stream.append({file: file})
      })
      stream.append('---', 'md')
      return true
    } else {
      return false
    }
  }

  if (content.hasOwnProperty('file')) {
    var file = localisedFirstFile(content.file, this.lang)
    if (file) {
      // In order to properly support stream we need to rewrite workshopper-exercise
      // to return an stream to the output instead of simply piping to stdout
      // stream = fs.createReadStream(file, {encoding: 'utf8'})
      var str = fs.readFileSync(file, 'utf8')
      contentType = content.type || contentType || path.extname(file).replace(/^\./, '').toLowerCase()
      if (contentType !== 'md') {
        str = '```' + contentType + '\n' + str + '\n```\n'
        contentType = 'md'
      }
      stream = new StrToStream(str)
    }
  } else if (content.pipe) {
    stream = content
  } else if (content.hasOwnProperty('text')) {
    contentType = content.type
    stream = new StrToStream(content.text + (content.skipNewline ? '' : '\n'))
  } else {
    stream = new StrToStream(content + '\n')
  }

  if (!stream) {
    return false
  }

  if (!contentType) {
    contentType = 'md'
  }

  var i18n = this.i18n
  var buffer = []

  this._append(
    stream
      .pipe(split())
      .pipe(through2({objectMode: true}, function (contents, encoding, done) {
        buffer.push(getText(i18n, contents.toString()))
        done()
      }, function (done) {
        this.push({
          text: buffer.join('\n'),
          type: contentType
        })
        done()
      }))
  )
  return true
}
PrintStream.prototype.write = function (data) {
  if (typeof data === 'string') {
    this.emit('data', data)
    return
  }
  if (this.typeOpen !== data.type) {
    if (data.type !== 'md') {
      data.text = '```' + data.type + '\n' + data.text
    }
    if (this.typeOpen !== 'md') {
      data.text = '\n```\n' + data.text
    }
    this.typeOpen = data.type
  }
  this.emit('data', data.text)
}
PrintStream.prototype.end = function () {
  if (this.typeOpen !== 'md') {
    this.emit('data', '```')
  }
  this._end()
}

PrintStream.prototype.appendChain = function (content, type) {
  this.append(content, type)
  return this
}

module.exports = PrintStream
