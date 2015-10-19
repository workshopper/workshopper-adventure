exports.menu = false
exports.handler = function print(shop, argv) {
  var specifier = argv._.slice(1).join(' ')
  shop.getExerciseText(specifier, function (err, stream) {
  	if (err) {
  		console.log(err)
  		process.exit(1)
  	}
  	stream.pipe(process.stdout)
  })
}