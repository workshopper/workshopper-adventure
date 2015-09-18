const i18n       = require('i18n-core')
    , i18nFs     = require('i18n-core/lookup/fs')
    , i18nObject = require('i18n-core/lookup/object')
    , i18nChain  = require('i18n-core/lookup/chain')
    , path       = require('path')
    , error      = require('./lib/print').error
    , fs         = require('fs')

function createDefaultLookup(options) {
  var result = {}

  result[options.defaultLang] = {
      title: options.title
    , subtitle: options.subtitle
  }

  options.languages.forEach(function (language) {
    if (!result[language])
      result[language] = {}

    if (!result[language].title)
      result[language].title = options.name.toUpperCase()
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
  init: function(options, globalData, appData) {
    var lookup = i18nChain(
          options.appDir ? i18nFs(path.resolve(options.appDir, './i18n')) : null
        , i18nFs(path.resolve(__dirname, './i18n'))
        , i18nObject(createDefaultLookup(options))
      )
      , translator = i18n(lookup)
      , languages = options.languages || ['en']
      , choose = chooseLang.bind(null, globalData, appData, options.defaultLang, languages)
      , lang = choose(null)
      , result = translator.lang(lang, true)
      , _exercises = []
    translator.fallback = function (key) {
      var exercisePrefix = options.defaultLang + '.exercise.'
      if (key.indexOf(exercisePrefix) === 0)
        return exerciseName = key.substr(exercisePrefix.length)

      if (!key)
        return '(???)'

      return '?' + key + '?'
    }
    result.languages = languages
    result.change = function (lang) {
      lang = choose(lang)
      result.changeLang(lang)
    }
    result.updateExercises = function(exercises) {
      _exercises = exercises;
    }
    result.lang = function () {
      return lang
    }
    return result
  }
}
