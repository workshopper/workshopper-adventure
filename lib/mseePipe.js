var msee = require('./msee')
const through = require('through2')

module.exports = () => {
  const buffer = []
  return through((contents, _, done) => {
    buffer.push(contents.toString())
    done()
  }, function (done) {
    const contents = buffer.join('\n')

    let str = msee(contents).replace(/^/gm, ' ').replace(/$/gm, '  ')
    str = str.substr(0, str.length - 3)
    this.push(str)
    done()
  })
}
