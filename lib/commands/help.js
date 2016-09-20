exports.order = 2
exports.handler = function printHelp (shop) {
  var stream = shop.createMarkdownStream()
  stream.append(shop.options.hasOwnProperty('help') ? shop.options.help : require('../../default/help')) ||
  stream.append('No help available.')

  stream
    .appendChain('\n')
    .pipe(require('../mseePipe')())
    .pipe(process.stdout)
}
