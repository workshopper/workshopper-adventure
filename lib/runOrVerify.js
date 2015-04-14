const error = require('./print').error

module.exports = function runOrVerify(mode, shop, argv) {
  if (!shop.current)
    return error(shop.__('error.exercise.none_active'))

  exercise = shop.loadExercise(shop.current)

  if (!exercise)
    return error(shop.__('error.exercise.missing', {name: name}))

  if (exercise.requireSubmission !== false && argv._.length == 1)
    return error(shop.__('ui.usage', {appName: shop.appName, mode: mode}))

  return shop.runExercise(exercise, mode, argv._.slice(1))
}