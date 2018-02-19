const i18n = require('i18n-core')
const i18nFs = require('i18n-core/lookup/fs')
const i18nChain = require('i18n-core/lookup/chain')
const i18nExtend = require('i18n-core/lookup/extend')
const path = require('path')
const UNDERLINE = 'Underline'
const util = require('./util')
const stripColor = require('strip-ansi')

function commandify (s) {
  return String(s).toLowerCase().replace(/\s+/g, '-')
}

function chooseLang (globalStorage, appStorage, defaultLang, availableLangs, lang) {
  if (!!lang && typeof lang !== 'string') {
    throw new Error('Please supply a language. Available languages are: ' + availableLangs.join(', '))
  }

  if (lang) {
    lang = lang.replace(/_/g, '-').toLowerCase()
  }

  if (availableLangs.indexOf(defaultLang) === -1) {
    throw new Error('The default language "' + defaultLang + ' is not one of the available languages?! Available languages are: ' + availableLangs.join(', '))
  }

  if (lang && availableLangs.indexOf(lang) === -1) {
    throw new Error('The language "' + lang + '" is not available.\nAvailable languages are ' + availableLangs.join(', ') + '.\n\nNote: the language is not case-sensitive ("en", "EN", "eN", "En" will become "en") and you can use "_" instead of "-" for seperators.')
  }

  var data = ((appStorage && appStorage.get('lang')) || globalStorage.get('lang') || {})

  if (availableLangs.indexOf(data.selected) === -1) {
    // The stored data is not available so lets use one of the other languages
    data.selected = lang || defaultLang
  } else {
    data.selected = lang || data.selected || defaultLang
  }
  globalStorage.save('lang', data)
  if (appStorage) {
    appStorage.save('lang', data)
  }

  return data.selected
}

module.exports = {
  init: function (options, globalStorage, appStorage) {
    var lookup = i18nChain(
      options.appDir ? i18nFs(path.resolve(options.appDir, './i18n')) : null
      , i18nFs(path.resolve(__dirname, './i18n'))
    )
    var root = i18n(lookup)
    var choose = chooseLang.bind(null, globalStorage, appStorage, options.defaultLang, options.languages)
    var lang = choose(null)
    var translator = root.section(lang, true)
    // TODO: _excercises is unused... is this ok?
    // eslint-disable-next-line
    var result = i18n(i18nExtend(translator, function (key) {
      if (options[key]) {
        return options[key]
      }

      // legacy -- start
      if (key === 'title') {
        return options.name.toUpperCase()
      }

      if (key === 'appName' || key === 'appname' || key === 'ADVENTURE_NAME') {
        return options.name
      }

      if (key === 'rootdir') {
        return options.appDir
      }

      if (key === 'COMMAND' || key === 'ADVENTURE_COMMAND') {
        return commandify(options.name)
      // legacy -- end
      }

      var exercisePrefix = 'exercise.'
      if (key.indexOf(exercisePrefix) === 0) {
        return key.substr(exercisePrefix.length)
      }
      if (key.length > UNDERLINE.length) {
        var end = key.length - UNDERLINE.length
        if (key.indexOf(UNDERLINE) === end) {
          return util.repeat('\u2500', stripColor(result.__(key.substr(0, end))).length + 2)
        }
      }
    }))

    root.fallback = function (key) {
      return '?' + key + '?'
    }
    result.change = function (lng) {
      lang = choose(lng)
      translator.changeSection(lang)
    }
    result.extend = function (obj) {
      return i18n(i18nExtend(result, function (key) {
        return obj[key]
      }))
    }
    result.lang = function () {
      return lang
    }
    return result
  }
}
