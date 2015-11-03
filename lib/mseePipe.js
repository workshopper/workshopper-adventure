const through     = require('through2')
    , msee        = require('@leichtgewicht/msee')
	, mseeOptions = {
          paragraphStart: ''
        , paragraphEnd: '\n\n'
        , hrChar: '\u2500'
        , listItemPad: '  » '
        , defaultCodePad: '    '
        , paragraphPad: ' '
      }
module.exports = function () {
	var buffer = []
	return through(function (contents, encoding, done) {
		buffer.push(contents.toString())
		done()
	}, function (done) {
		var contents = buffer.join('\n')

		this.push(msee.parse(contents, mseeOptions))
		done()
	})
}