const path = require('path')

module.exports = function printVersion(shop) {
  console.log(
      shop.appName
    + '@'
    + require(path.join(shop.appDir, 'package.json')).version
  )
  process.exit()
}