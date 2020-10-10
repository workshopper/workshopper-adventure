exports.aliases = ['v']
exports.menu = false
exports.handler = shop => {
  console.log(shop.getVersionString())
  process.exit()
}
