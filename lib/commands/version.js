exports.aliases = ['v']
exports.menu = false
exports.handler = function printVersion (shop) {
  console.log(shop.getVersionString())
  process.exit()
}
