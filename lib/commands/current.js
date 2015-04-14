exports.menu = false
exports.handler = function current(shop) {
  console.log(shop.__('exercise.' + shop.current))
}