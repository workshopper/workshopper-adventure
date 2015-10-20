exports.menu = false
exports.handler = exports.handler = function (shop, argv) {
	shop.verify(argv._.slice(1), null, function (err, pass, stream) {
		if (err) {
			console.log(err)
			process.exit(1)
		}
		stream
			.pipe(require('../mseePipe')())
			.pipe(process.stdout)
			.on('end', function () {
				process.exit(pass ? 0 : 1)
			})
	})
}