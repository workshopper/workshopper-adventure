exports.aliases = ['v']
exports.handler = function (shop, lang) {
  shop.execute(['version'])
}
