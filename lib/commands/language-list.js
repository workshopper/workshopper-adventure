exports.menu = false
exports.filter = require('../langFilter')
exports.aliases = ['lang-list', 'langlist']
exports.handler = function printLanguageMenu (shop) {
  shop.options.languages.forEach(function (language) {
    console.log(language)
  })
}
