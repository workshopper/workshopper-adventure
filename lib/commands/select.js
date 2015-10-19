exports.menu = false
exports.handler = function (shop, argv) {
	var specifier = argv._.slice(1).join(' ')
	shop.selectExercise(specifier)
	shop.execute(['print', specifier])
}