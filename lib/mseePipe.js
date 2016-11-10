var msee = require('./msee')
const through = require('through2')

module.exports = function () {
  var buffer = []
  return through(function (contents, encoding, done) {
    buffer.push(contents.toString())
    done()
  }, function (done) {
    var contents = buffer.join('\n')

    var str = msee(contents).replace(/^/gm, ' ').replace(/$/gm, '  ')
    str = str.substr(0, str.length - 3)
    this.push(str)
    done()
  })
}
