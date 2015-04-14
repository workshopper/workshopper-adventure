exports.handler = function next(shop) {
  var remainingAfterCurrent = shop.exercises.slice(shop.exercises.indexOf(shop.current))

  var completed = shop.getData('completed')

  if (!completed)
    return error(shop.__('error.exercise.none_active') + '\n')

  var incompleteAfterCurrent = remainingAfterCurrent.filter(function (elem) {
    return completed.indexOf(elem) < 0
  })

  if (incompleteAfterCurrent.length === 0)
    return console.log(shop.__('error.no_uncomplete_left') + '\n')

  return onselect.call(shop, incompleteAfterCurrent[0])
}