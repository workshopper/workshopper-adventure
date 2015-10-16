exports.menu = false
exports.handler = function (shop, argv) {
	var __ = shop.__
	  , entry = argv._.slice(1).join(' ')

	if (isNaN(entry)) {
  		shop.printExercise(entry)
	} else {
		var number = parseInt(entry, 10)
		if (number < 0 || number >= shop.exercises.length) {
			console.log(__('error.exercise.missing', number))
			process.exit(1)
		}
		shop.printExercise(shop.exercises[number])
	}
}