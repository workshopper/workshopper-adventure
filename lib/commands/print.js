exports.menu = false
exports.handler = function print (shop, args) {
  var specifier = args.join(' ')
  shop.getExerciseText(specifier, function (err, stream) {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    stream
      .pipe(require('../mseePipe')())
      .pipe(process.stdout)
      .on('end', function () {
        process.exit()
      })
  })
}
