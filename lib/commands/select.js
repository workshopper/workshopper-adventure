exports.menu = false
exports.handler = function (shop, args) {
	var specifier = args.join(' ')
	shop.selectExercise(specifier)
	shop.execute(['print', specifier])
}