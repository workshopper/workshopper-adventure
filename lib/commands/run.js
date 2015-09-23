exports.menu = false
exports.handler = function (shop, argv) {
	shop.run(argv._.slice(1))
}