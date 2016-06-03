exports.menu = false
exports.handler = exports.handler = function (shop, args) {
  shop.verify(args, null, function (err, pass, stream) {
    stream
      .appendChain(err)
      .pipe(require('../mseePipe')())
      .pipe(process.stdout)
      .on('end', function () {
        process.exit(pass && !err ? 0 : 1)
      })
  })
}