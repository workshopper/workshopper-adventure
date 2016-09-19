var spawn = require('child_process').spawn

function getVersions (shop, callback) {
  var path = require('path')
  var pkgFile = path.resolve(shop.options.appDir, 'package.json')
  try {
    var pkg = require(pkgFile)
  } catch (e) {
    return callback(e)
  }
  require('latest-version')(pkg.name).then(function (latestVersion) {
    exports.info = {
      version: latestVersion
    }
    callback(null, pkg.name, pkg.version, latestVersion)
  }).catch(function (err) {
    console.log(err)
    callback(err)
  })
}
exports.filter = function (shop) {
  return shop.options.appDir
}
exports.menu = true
exports.handler = function (shop) {
  getVersions(shop, function (error, name, current, latest) {
    var stream = shop.createMarkdownStream()
    var __ = shop.i18n.__
    stream.append('# {{title}}\n')
    if (error) {
      stream.append('Error while trying to evaluate package: ' + error)
    } else if (current === latest) {
      stream.append(__('update.latest_version', {version: current, name: name}))
    } else {
      var cmd = 'npm install ' + name + '@latest -g'
      stream.append(__('update.now', {current: current, latest: latest, cmd: cmd, name: name}))
    }
    stream
      .pipe(require('../mseePipe')())
      .on('end', function () {
        if (current !== latest) {
          spawn('npm', ['install', name, '-g'], {
            stdio: [process.stdin, process.stdout, process.stderr]
          })
        } else if (error) {
          process.exit(1)
        }
      })
      .pipe(process.stdout, {end: false})
  })
}
