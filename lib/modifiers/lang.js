exports.short = 'l'
exports.filter = require('../langFilter')
exports.handler = function (shop, lang) {
  shop.selectLanguage(lang)
}