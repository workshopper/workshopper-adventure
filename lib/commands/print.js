exports.menu = false
exports.handler = (shop, args) => {
  const specifier = args.join(' ')
  shop.getExerciseText(specifier, (err, stream) => {
    if (err) {
      console.log(err)
      process.exit(1)
    }
    stream
      .pipe(require('../mseePipe')())
      .pipe(process.stdout)
      .on('end', () => process.exit())
  })
}
