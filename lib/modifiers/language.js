exports.aliases = ['l', 'lang']
exports.filter = require('../langFilter')
exports.handler = function (shop, lang) {
  try {
    shop.i18n.change(lang)
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}
