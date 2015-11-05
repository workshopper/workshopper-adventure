const fs = require('fs')
exports.filter = function (shop) {
  return shop.options.pkg && Array.isArray(shop.options.pkg.contributors) && shop.options.hideCredits !== true
}
exports.handler = function credits(shop) {
  var stream = shop.createMarkdownStream()
  var table = '# {{title}}\n' +
              '## {{credits.title}}\n' +
              '\n' +
              '| {{credits.name}} | {{credits.user}} |\n' +
              '|------------------|------------------|\n'

  table += shop.options.pkg.contributors.reduce(function createRow (result, line) {
    var data = /^([^\(\<]+)\s*(\<([^\>]*)\>)?\s*(\(https?:\/\/(www\.)?github\.(io|com)\/([^\s\/\)]+))?/.exec(line)
    if (data) {
      result.push('| ')
      result.push(data[1])
      result.push(' | ')
      if (data[7]) {
        result.push('@' + data[7])
      }
      result.push(' |\n')
    }
    return result
  }, []).join('')

  stream.append(table, 'md')
  stream.append('\n')
  stream
      .pipe(require('../mseePipe')())
      .pipe(process.stdout)
}