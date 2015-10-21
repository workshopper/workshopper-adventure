const print = require('../print')
    , path = require('path')

exports.order = 2
exports.handler = function printHelp(shop) {
  var stream = print(shop.i18n, shop.i18n.lang())
  stream.append({file: shop.helpFile})
  stream.append({file: [
    path.join(__dirname, '../../i18n/usage/{lang}.md'),
    path.join(__dirname, '../../i18n/usage/en.md')
  ]})
  stream.append('')
  stream
      .pipe(require('../mseePipe')())
      .pipe(process.stdout)
}