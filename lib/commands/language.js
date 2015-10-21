exports.order = 1
exports.filter = require('../langFilter')
exports.aliases = ['lang']
exports.handler = function printLanguageMenu(shop) {
  const chalk = require('chalk')
  var __ = shop.i18n.__

  shop.options.menuFactory.create({
    title: __('title'),
    subtitle: shop.i18n.has('subtitle') && __('subtitle'),
    menu: shop.options.languages.map(function (language) {
      return {
        label: chalk.bold('»') + ' ' + __('language.' + language),
        marker: (shop.lang === language) ? '[' + __('language._current') + ']' : '',
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
  })
}