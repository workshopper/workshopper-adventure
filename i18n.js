const i18n       = require('i18n-core')
    , i18nFs     = require('i18n-core/lookup/fs')
    , i18nObject = require('i18n-core/lookup/object')
    , path       = require('path')
    , error      = require('./lib/print').error
    , fs         = require('fs')

function i18nChain() {
  var linked = {
        handler: arguments[0]
      , next: null
    }
    , current = linked
  for (var i = 1; i<arguments.length; i++) {
    var next = {
      handler: arguments[i]
    }
    current.next = next
    current = next
  }
  return {
    get: function (key) {
      var current = linked
        , result
      while (!result && current) {
        result = current.handler.get(key)
        current = current.next
      }

      return result
    }
  }
}

function createDefaultLookup(options, exercises) {
  var result = {}

  result[options.defaultLang] = {
      title: options.title
    , subtitle: options.subtitle
    , exercise: {}
  }

  options.languages.forEach(function (language) {
    if (!result[language])
      result[language] = {}

    if (!result[language].title)
      result[language].title = options.name.toUpperCase()
  })

  exercises.forEach(function (exercise) {
    result[options.defaultLang].exercise[exercise] = exercise
  })

  return result
}

function chooseLang (globalData, appData, defaultLang, availableLangs, lang) {
  if (!!lang && typeof lang != 'string')
    return error('Please supply a language. Available languages are: ' + availableLangs.join(', '))

  if (lang)
    lang = lang.replace(/_/g, '-').toLowerCase()

  if (availableLangs.indexOf(defaultLang) === -1)
    return error('The default language "' + defaultLang + ' is not one of the available languages?! Available languages are: ' + availableLangs.join(', '))

  if (lang && availableLangs.indexOf(lang) === -1)
    return error('The language "' + lang + '" is not available.\nAvailable languages are ' + availableLangs.join(', ') + '.\n\nNote: the language is not case-sensitive ("en", "EN", "eN", "En" will become "en") and you can use "_" instead of "-" for seperators.')

  var data = (appData.get('lang') || globalData.get('lang') || {})

  if (availableLangs.indexOf(data.selected) === -1)
    // The stored data is not available so lets use one of the other languages
    data.selected = lang || defaultLang
  else
    data.selected = lang || data.selected || defaultLang

  globalData.save('lang', data)
  appData.save('lang', data)

  return data.selected
}

module.exports = {
  init: function(options, exercises, globalData, appData, defaultLang) {
    var generalTranslator = i18nChain(
          i18nFs(path.resolve(__dirname, './i18n'))
        , i18nObject(createDefaultLookup(options, exercises))
      )
      , translator = i18n(
          options.appDir
            ? i18nChain( i18nFs(path.resolve(options.appDir, './i18n')), generalTranslator)
            : generalTranslator
        )
      , languages = options.languages || ['en']
      , choose = chooseLang.bind(null, globalData, appData, defaultLang, languages)
      , lang = choose(null)
      , result = translator.lang(lang, true)
    translator.fallback = function (key) {
      if (!key)
        return '(???)'

      return '?' + key + '?'
    }
    result.languages = languages
    result.change = function (lang) {
      lang = choose(lang)
      result.changeLang(lang)
    }
    result.lang = function () {
      return lang
    }
    return result
  }
}
