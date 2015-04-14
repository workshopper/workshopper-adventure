const print = require('../print')
    , path = require('path')

exports.order = 2
exports.handler = function printHelp(shop) {
  var part
    , stream = require('combined-stream').create()

  if (shop.helpFile)
    part = print.localisedFileStream(shop.appName, shop.appDir, shop.helpFile, shop.lang)

  if (part)
    stream.append(part)

  part = print.localisedFirstFileStream(shop.appName, shop.appDir, [
          path.join(__dirname, '../../i18n/usage/{lang}.txt'),
          path.join(__dirname, '../../i18n/usage/en.txt')
        ], shop.lang)
  if (part)
    stream.append(part)

  stream.pipe(process.stdout)
}