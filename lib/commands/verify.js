exports.menu = false
exports.handler = exports.handler = function (shop, args) {
	shop.verify(args, null, function (err, pass, stream) {
		if (err) {
			console.log(err)
			process.exit(1)
		}
		stream = stream.pipe(require('../mseePipe')())
		stream.on('end', function () {
			process.exit(pass ? 0 : 1)
		})
		stream.pipe(process.stdout)
	})
}