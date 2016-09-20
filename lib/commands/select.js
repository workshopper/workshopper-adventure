exports.menu = false
exports.handler = function (shop, args) {
  var specifier = args.join(' ')
  try {
    shop.selectExercise(specifier)
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
  shop.execute(['print'])
}
