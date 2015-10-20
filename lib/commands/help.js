const print = require('../print')
    , path = require('path')

exports.order = 2
exports.name = 'help'
exports.handler = function printHelp(shop) {
  var stream = print(shop.i18n, shop.i18n.lang())
  stream.append('')
  stream.append({file: shop.helpFile})
  stream.append('\n')
  stream.append({file: [
    path.join(__dirname, '../../i18n/usage/{lang}.txt'),
    // en must be broken: defaultLang!
    path.join(__dirname, '../../i18n/usage/en.txt')
  ]})
  stream.append('')
  stream
      .pipe(require('../mseePipe')())
      .pipe(process.stdout)
}