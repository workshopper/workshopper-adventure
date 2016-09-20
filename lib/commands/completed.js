exports.menu = false
exports.handler = function current (shop) {
  var completed = shop.appStorage.get('completed')
  if (completed) {
    completed.forEach(function (completed) {
      console.log(shop.__('exercise.' + completed))
    })
  }
}
