const { spawn } = require('child_process')

function getVersions (shop, callback) {
  const path = require('path')
  const pkgFile = path.resolve(shop.options.appDir, 'package.json')
  try {
    const pkg = require(pkgFile)
    require('latest-version')(pkg.name)
      .then(latestVersion => {
        exports.info = {
          version: latestVersion
        }
        callback(null, pkg.name, pkg.version, latestVersion)
      })
      .catch(err => {
        console.log(err)
        callback(err)
      })
  } catch (e) {
    return callback(e)
  }
}
exports.filter = shop => shop.options.appDir
exports.menu = true
exports.handler = shop => {
  getVersions(shop, (error, name, current, latest) => {
    const stream = shop.createMarkdownStream()
    const { __ } = shop.i18n
    stream.append('# {{title}}\n')
    if (error) {
      stream.append(`Error while trying to evaluate package: ${error}`)
    } else if (current === latest) {
      stream.append(__('update.latest_version', { version: current, name: name }))
    } else {
      var cmd = `npm install ${name}@latest -g`
      stream.append(__('update.now', { current: current, latest: latest, cmd: cmd, name: name }))
    }
    stream
      .pipe(require('../mseePipe')())
      .on('end', () => {
        if (current !== latest) {
          spawn('npm', ['install', name, '-g'], {
            stdio: [process.stdin, process.stdout, process.stderr]
          })
        } else if (error) {
          process.exit(1)
        }
      })
      .pipe(process.stdout, { end: false })
  })
}
