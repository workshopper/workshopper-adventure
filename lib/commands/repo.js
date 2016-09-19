exports.menu = false
exports.handler = function printVersion (shop) {
  console.log(shop.options.appRepo)
  process.exit()
}
