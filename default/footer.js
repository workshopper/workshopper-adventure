const { join } = require('path')

module.exports = [
  '---',
  {
    file: join(__dirname, '../i18n/footer/{lang}.md')
  }
]
