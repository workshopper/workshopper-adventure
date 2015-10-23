exports.aliases = ['v']
exports.menu = false
exports.handler = function printVersion(shop) {
  const path = require('path')
  console.log(shop.getVersionString())
  process.exit()
}