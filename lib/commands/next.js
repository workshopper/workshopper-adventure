exports.menu = false
exports.handler = function next(shop) {
  var remainingAfterCurrent = shop.exercises.slice(shop.exercises.indexOf(shop.appStorage.get('current')) + 1)
  var completed = shop.appStorage.get('completed') || []

  if (!completed)
    return error(shop.__('error.exercise.none_active') + '\n')

  var incompleteAfterCurrent = remainingAfterCurrent.filter(function (elem) {
    return completed.indexOf(elem) < 0
  })

  if (incompleteAfterCurrent.length === 0)
    return console.log(shop.__('error.no_uncomplete_left') + '\n')

  shop.execute(['print', incompleteAfterCurrent[0]])
}