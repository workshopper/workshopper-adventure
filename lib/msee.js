const msee = require('msee')
const mseeOptions = {
  paragraphStart: '',
  paragraphEnd: '\n\n',
  hrChar: '\u2500',
  listItemPad: {
    right: '   ',
    first: '  » ',
    regular: '    '
  },
  defaultCodePad: '    ',
  paragraphPad: {
    left: ' ',
    right: '   '
  },
  maxWidth: 78
}

module.exports = function (content) {
  return msee.parse(content, mseeOptions)
}
