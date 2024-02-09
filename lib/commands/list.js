exports.menu = false
exports.handler = shop =>
  shop.exercises.forEach(name => shop.__(`exercise.${name}`))
