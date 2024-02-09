exports.menu = false
exports.filter = require('../langFilter')
exports.aliases = ['lang-list', 'langlist']
exports.handler = shop =>
  shop.options.languages.forEach(language => console.log(language))
