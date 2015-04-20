exports.menu = false
exports.handler = function (shop) {
  shop.local.reset()
  return console.log(shop.__('progress.reset', {title: shop.__('title')}))
}