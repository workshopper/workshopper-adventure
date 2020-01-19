exports.menu = false
exports.handler = shop => {
  const next = shop.getNext()
  if (next instanceof Error) {
    return console.log(shop.__(next.message) + '\n')
  }
  shop.execute(['print', next])
}
