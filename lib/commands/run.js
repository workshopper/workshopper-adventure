const after = require('after')
exports.menu = false
exports.handler = (shop, args) => {
  let error
  let passed
  const exit = after(2, () => {
    if (error) {
      console.log(error.stack || error)
    }
    process.exit(passed && !error ? 0 : 1)
  })
  const stream = shop
    .run(args, null, (err, pass) => {
      error = err
      passed = pass
      exit()
    })
    .pipe(require('../mseePipe')())

  stream.on('end', exit)
  stream.pipe(process.stdout, { end: false })
}
