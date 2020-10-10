exports.aliases = ['v']
exports.handler = (shop, lang) => {
  shop.execute(['version'])
}
