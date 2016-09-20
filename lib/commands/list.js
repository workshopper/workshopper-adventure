exports.menu = false
exports.handler = function (shop) {
  shop.exercises.forEach(function (name) {
    console.log(shop.__('exercise.' + name))
  })
}
