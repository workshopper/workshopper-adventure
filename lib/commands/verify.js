const after = require('after')
exports.menu = false
exports.handler = exports.handler = (shop, args) => {
  let passed
  let error
  const exit = after(2, () => {
    if (error) {
      console.log(error.stack || error)
    }
    process.exit(passed && !error ? 0 : 1)
  })
  const stream = shop.verify(args, null, (err, pass) => {
    error = err
    passed = pass
    exit()
  })
  const msee = require('../msee')
  stream
    .on('data', data => process.stdout.write(msee('\n' + data)))
    .on('end', () => exit())
  stream.resume()
}
