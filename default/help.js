var path = require('path')

module.exports = {
  file: [
    path.join(__dirname, '../i18n/usage/{lang}.md'),
    path.join(__dirname, '../i18n/usage/en.md')
  ]
}
