exports.menu = false
exports.filter = require('../langFilter')
exports.name = 'language-list'
exports.aliases = ['lang-list', 'langlist', 'language-list']
exports.handler = function printLanguageMenu(shop) {
  shop.options.languages.forEach(function (language) {
    console.log(language)
  })
}