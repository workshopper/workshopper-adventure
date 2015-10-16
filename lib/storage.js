const fs = require('fs')
    , path = require('path')
    , mkdirp = require('mkdirp')
    , rimraf = require('rimraf')

function createSimpleStorage() {
  var dataDir = path.join.apply(path, arguments)
    , files = {}

  function fileName(name) {
    return path.resolve(dataDir, name + '.json')
  }
  return {
      dir: dataDir
    , reset: function reset() {
        rimraf.sync(dataDir)
        files = {}
      }
    , save: function save(name, data) {
        mkdirp.sync(dataDir)
        fs.writeFileSync(fileName(name), JSON.stringify(data))
      }
    , get: function get(name) {
        var fileData = files[name]
        if (!fileData) {
          fileData = null

          var file = fileName(name)

          try {
            if (fs.accessSync ? (fs.accessSync(file, fs.R_OK) || true) : fs.existsSync(file))
              fileData = JSON.parse(fs.readFileSync(file, 'utf8'))
          } catch (e) {}

          files[name] = fileData
        }
        return fileData
      }
  }
}

createSimpleStorage.userDir = process.env.HOME || process.env.USERPROFILE

module.exports = createSimpleStorage