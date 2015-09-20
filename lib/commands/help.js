const print = require('../print')
    , path = require('path')

exports.order = 2
exports.name = 'help'
exports.handler = function printHelp(shop) {
  var stream = require('combined-stream').create()

  if (shop.helpFile)
    stream.append(print.localisedFileStream(shop.i18n, shop.appDir, shop.helpFile, shop.i18n.lang()))


  stream.append(
    print.localisedFirstFileStream(shop.i18n, [
          path.join(__dirname, '../../i18n/usage/{lang}.txt'),
          path.join(__dirname, '../../i18n/usage/en.txt')
        ], shop.i18n.lang())
  )

  stream.pipe(process.stdout)
}