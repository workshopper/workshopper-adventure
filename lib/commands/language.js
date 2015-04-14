const createMenu = require('simple-terminal-menu')
    , chalk      = require('chalk')

exports.order = 1
exports.filter = require('../langFilter')
exports.handler = function printLanguageMenu(shop) {
  var __ = shop.i18n.__
    , menu = createMenu(shop.menuOptions)
    , completed = shop.getData('completed') || []

  menu.writeLine(chalk.bold(__('title')))

  if (shop.i18n.has('subtitle'))
    menu.writeLine(chalk.italic(__('subtitle')))

  menu.writeSeparator()

  shop.i18n.languages.forEach(function (language) {
    var label = chalk.bold('»') + ' ' + __('language.' + language)
      , marker = (shop.lang === language) ? '[' + __('language._current') + ']' : ''
    menu.add(label, marker, function () {
      shop.selectLanguage(language)
      shop.printMenu()
    })
  })

  menu.writeSeparator()

  menu.add(chalk.bold(__('menu.cancel')), shop.printMenu.bind(shop))
  menu.add(chalk.bold(__('menu.exit')), shop._exit.bind(shop))
}