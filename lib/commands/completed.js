exports.menu = false
exports.handler = function current(shop) {
  var completed = shop.getData('completed')
  if (completed)
	completed.forEach(function (completed) {
		console.log(shop.__('exercise.' + completed))
	})
}