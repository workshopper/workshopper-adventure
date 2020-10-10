exports.menu = false
exports.handler = shop => {
  shop.appStorage.reset()
  return console.log(shop.__('progress.reset', { title: shop.__('title') }))
}
