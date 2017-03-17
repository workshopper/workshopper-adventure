exports.menu = false
exports.handler = function next (shop) {
  var next = shop.getNext()
  if (next instanceof Error) {
    return console.log(shop.__(next.message) + '\n')
  }
  shop.execute(['print', next])
}
