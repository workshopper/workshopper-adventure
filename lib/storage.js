const fs = require('fs')
    , path = require('path')
    , mkdirp = require('mkdirp')

function createSimpleStorage() {
  var dataDir = path.join.apply(path, arguments)
    , files = {}

  function fileName(name) {
    return path.resolve(dataDir, name + '.json')
  }
  return {
      dir: dataDir
    , reset: function resetAllNamespaces() {
        Object.keys(namespaces).forEach(function (name) {
          fs.unlinkSync(fileName(name))
        })
        files = {}
      }
    , save: function save(name, data) {
        mkdirp.sync(dataDir)
        fs.writeFileSync(fileName(name), JSON.stringify(data))
      }
    , get: function get(name) {
        var fileData = files[name]
        if (!fileData) {
          fileData = {}

          var file = fileName(name)

          try {
            if (fs.existsSync(file))
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