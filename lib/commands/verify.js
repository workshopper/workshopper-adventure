exports.menu = false
exports.handler = exports.handler = function (shop, args) {
	shop.verify(args, null, function (err, pass, stream) {
		if (err) {
			stream.append(err)
		}
		stream = stream.pipe(require('../mseePipe')())
		stream.on('end', function () {
			process.exit(pass && !err ? 0 : 1)
		})
		stream.pipe(process.stdout)
	})
}