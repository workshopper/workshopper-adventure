exports.menu = false
exports.handler = function (shop) {
  shop.appStorage.reset()
  return console.log(shop.__('progress.reset', { title: shop.__('title') }))
}
