function renderNonTty (shop) {
  const { __ } = shop.i18n
  const stream = shop.createMarkdownStream()

  stream.append(`
# {error.notty}
---
# {title}
---`, 'md')

  shop.options.languages.forEach(language =>
    stream.append(` \`{appName} lang ${language}\`: ${__(`language.${language}`)}${((shop.i18n.lang() === language) ? ` ... [${__('language._current')}]` : '')}`, 'md')
  )
  stream
    .appendChain('---\n', 'md')
    .pipe(require('../mseePipe')())
    .pipe(process.stdout)
}

exports.order = 1
exports.filter = require('../langFilter')
exports.aliases = ['lang']
exports.handler = (shop, args) => {
  const chalk = require('chalk')
  const { __ } = shop.i18n
  const current = shop.i18n.lang()
  const menuOptions = {
    title: __('title'),
    subtitle: shop.i18n.has('subtitle') && __('subtitle'),
    menu: shop.options.languages.map(function (language) {
      return {
        label: chalk.bold(`» ${__(`language.${language}`)}`),
        marker: (current === language) ? ` [${__('language._current')}]` : '',
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
    } catch (e) {}
    console.log(`${shop.i18n.__('language._current')}: ${__(`language.${shop.i18n.lang()}`)}`)
    process.exit()
  }

  shop.options.menuFactory.options.selected = shop.options.languages.reduce(
    (selected, language, count) => language === current ? count : selected
    , undefined
  )
  const menu = shop.options.menuFactory.create(menuOptions)
  if (!menu) {
    renderNonTty(shop)
  }
}
