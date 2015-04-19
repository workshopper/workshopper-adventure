exports.aliases = ['l']
exports.filter = require('../langFilter')
exports.handler = function (shop, lang) {
  shop.i18n.change(lang)
}