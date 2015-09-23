exports.menu = false
exports.handler = exports.handler = function (shop, argv) {
	shop.verify(argv._.slice(1))
}