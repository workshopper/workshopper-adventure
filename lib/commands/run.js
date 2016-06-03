exports.menu = false
exports.handler = function (shop, args) {
	shop.run(args, null, function (err, pass, stream) {
		stream
			.appendChain(err)
			.pipe(require('../mseePipe')())
			.pipe(process.stdout)
			.on('end', function () {
				process.exit(pass && !err ? 0 : 1)
			})
	})
}