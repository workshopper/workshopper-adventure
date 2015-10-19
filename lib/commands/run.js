exports.menu = false
exports.handler = function (shop, argv) {
	shop.run(argv._.slice(1), null, function (err, pass, stream) {
		if (err) {
			console.log(err)
			process.exit(1)
		}
		stream.pipe(process.stdout).on('end', function () {
			process.exit(pass ? 0 : 1)
		})
	})
}