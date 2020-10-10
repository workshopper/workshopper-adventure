exports.menu = false
exports.handler = shop => {
  const completed = shop.appStorage.get('completed')
  if (completed) {
    completed.forEach(completed =>
      console.log(shop.__(`exercise.${completed}`))
    )
  }
}
