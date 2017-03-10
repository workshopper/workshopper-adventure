exports.menu = false
exports.handler = function next (shop) {
  var next = shop.getNext()
  if (next instanceof Error) {
    if (next.message === 'error.no_uncomplete_left') {
      return console.log('You have completed all the challenges.\nCongratulations!\n')
    }

    return console.log(shop.__('error.' + next.message) + '\n')
  }
  shop.execute(['print', next])
}
