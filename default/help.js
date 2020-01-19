const { join } = require('path')

module.exports = {
  file: [
    join(__dirname, '../i18n/usage/{lang}.md'),
    join(__dirname, '../i18n/usage/en.md')
  ]
}
