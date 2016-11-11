var after = require('after')
exports.menu = false
exports.handler = exports.handler = function (shop, args) {
  var passed
  var error
  var exit = after(2, function () {
    if (error) {
      console.log(error.stack || error)
    }
    process.exit(passed && !error ? 0 : 1)
  })
  var stream = shop.verify(args, null, function (err, pass) {
    error = err
    passed = pass
    exit()
  })
  var msee = require('../msee')
  stream
    .on('data', function (data) {
      process.stdout.write(msee('\n' + data))
    })
    .on('end', function () {
      exit()
    })

  stream.resume()
}
