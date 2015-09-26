const path = require('path')
exports.aliases = ['v']
exports.menu = false
exports.handler = function printVersion(shop) {
  console.log(
      shop.appName
    + '@'
    + require(path.join(shop.options.appDir, 'package.json')).version
  )
  process.exit()
}