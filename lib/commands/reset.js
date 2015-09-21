exports.menu = false
exports.handler = function (shop) {
  shop.localStorage.reset()
  return console.log(shop.__('progress.reset', {title: shop.__('title')}))
}