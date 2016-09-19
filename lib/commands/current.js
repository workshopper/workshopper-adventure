exports.menu = false
exports.handler = function current (shop) {
  var current = shop.appStorage.get('current')
  if (current) {
    console.log(shop.__('exercise.' + current))
  } else {
    console.log(shop.__('error.exercise.none_active'))
    process.exit(1)
  }
}
