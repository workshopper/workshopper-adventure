exports.aliases = ['v']
exports.menu = false
exports.handler = function printVersion(shop) {
  const path = require('path')
  console.log(
      shop.options.name
    + '@'
    + require(path.join(shop.options.appDir, 'package.json')).version
  )
  process.exit()
}