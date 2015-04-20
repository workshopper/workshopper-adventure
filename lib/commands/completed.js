exports.menu = false
exports.handler = function current(shop) {
  var completed = shop.local.get('completed')
  if (completed)
	completed.forEach(function (completed) {
		console.log(shop.__('exercise.' + completed))
	})
}