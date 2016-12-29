exports.filter = function (shop) {
  return shop.options.pkg && Array.isArray(shop.options.pkg.contributors) && shop.options.hideCredits !== true
}
exports.handler = function credits (shop) {
  var table = '# {{title}}\n' +
    '## {{credits.title}}\n' +
    '\n' +
    '| {{credits.name}} | {{credits.user}} |\n' +
    '|------------------|------------------|\n'

  table += shop.options.pkg.contributors.reduce(function createRow (result, line) {
    if (typeof line === 'string') {
      var data = /^([^(<]+)\s*(<([^>]*)>)?\s*(\((https?:\/\/[^)]+)\))?/.exec(line)
      line = {
        name: data[1],
        email: data[3],
        url: data[5]
      }
    }
    if (line) {
      result.push('| ')
      result.push(line.name)
      result.push(' | ')
      if (line.url) {
        var github = /^https?:\/\/(www\.)?github\.(com|io)\/([^)/]+)/.exec(line.url)
        if (github) {
          result.push('@' + github[3])
        }
      }
      result.push(' |\n')
    }
    return result
  }, []).join('')

  shop.createMarkdownStream()
    .appendChain(table, 'md')
    .appendChain('\n')
    .pipe(require('../mseePipe')())
    .pipe(process.stdout)
}
