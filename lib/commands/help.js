const print = require('../print')
    , path = require('path')

exports.order = 2
exports.handler = function printHelp(shop) {
  var stream = shop.createMarkdownStream()
  stream.append(shop.options.hasOwnProperty("help") ? shop.options.help : require('../../default/help'))
    || stream.append('No help available.')

  stream.append('\n')
  stream
      .pipe(require('../mseePipe')())
      .pipe(process.stdout)
}