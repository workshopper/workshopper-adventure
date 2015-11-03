function renderNonTty (shop, menuOptions) {
  var completed = shop.appStorage.get('completed') || [],
    __ = shop.i18n.__,
    stream = shop.createMarkdownStream()

  stream.append('\n' +
    '# {error.notty}\n' +
    '---\n' +
    '# {title}\n' +
    '---\n', 'md')

  shop.options.languages.forEach(function (language, no) {
    stream.append(' `{appName} lang ' + language + '`: ' + __('language.' + language) + ((shop.i18n.lang() === language) ? ' ... [' + __('language._current') + ']' : ''), 'md')
  })
  stream.append('---\n', 'md')
  stream
    .pipe(require('../mseePipe')())
    .pipe(process.stdout)
}

exports.order = 1
exports.filter = require('../langFilter')
exports.aliases = ['lang']
exports.handler = function printLanguageMenu (shop, args) {
  const chalk = require('chalk'),
    __ = shop.i18n.__,
    menuOptions = {
      title: __('title'),
      subtitle: shop.i18n.has('subtitle') && __('subtitle'),
      menu: shop.options.languages.map(function (language) {
        return {
          label: chalk.bold('»') + ' ' + __('language.' + language),
          marker: (shop.i18n.lang() === language) ? ' [' + __('language._current') + ']' : '',
          handler: function () {
            shop.i18n.change(language)
            shop.execute(['menu'])
          }
        }
      }),
      extras: [{
        label: chalk.bold(__('menu.cancel')),
        handler: shop.execute.bind(shop, ['menu'])
      }, {
        label: chalk.bold(__('menu.exit')),
        handler: process.exit.bind(process, 0)
      }]
    }

  if (args.length > 0) {
    try {
      shop.i18n.change(args[0])
    } catch(e) {}
    console.log(shop.i18n.__('language._current') + ': ' + __('language.' + shop.i18n.lang()))
    process.exit()
  }

  var menu = shop.options.menuFactory.create(menuOptions)
  if (!menu)
    renderNonTty(shop, menuOptions)
}
