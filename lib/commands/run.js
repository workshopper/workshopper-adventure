var after = require('after')
exports.menu = false
exports.handler = function (shop, args) {
  var error
  var passed
  var exit = after(2, function () {
    if (error) {
      console.log(error.stack || error)
    }
    process.exit(passed && !error ? 0 : 1)
  })
  var stream = shop.run(args, null, function (err, pass) {
    error = err
    passed = pass
    exit()
  })
  stream = stream.pipe(require('../mseePipe')())

  stream.on('end', exit)
  stream.pipe(process.stdout, { end: false })
}
