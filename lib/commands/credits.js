exports.filter = shop =>
  shop.options.pkg && Array.isArray(shop.options.pkg.contributors) && shop.options.hideCredits !== true

exports.handler = shop => {
  const table = `# {{title}}
## {{credits.title}}

| {{credits.name}} | {{credits.user}} |
|------------------|------------------|
${shop.options.pkg.contributors.reduce((result, line) => {
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
}, []).join('')}
`

  shop.createMarkdownStream()
    .appendChain(table, 'md')
    .appendChain('\n')
    .pipe(require('../mseePipe')())
    .pipe(process.stdout)
}
