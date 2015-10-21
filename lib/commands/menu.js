exports.handler = function (shop) {
  const chalk = require('chalk')
  
  var __ = shop.i18n.__
    , completed = shop.appStorage.get('completed') || []
    , isCommandInMenu = function (extra) {
        if (typeof extra.filter === 'function' && !extra.filter(shop)) {
          return false
        } 
        return extra.menu !== false
      }

  shop.options.menuFactory.create({
    title: __('title'),
    subtitle: shop.i18n.has('subtitle') && __('subtitle'),
    menu: shop.exercises.map(function (exercise) {
        return {
          label: chalk.bold('»') + ' ' + __('exercise.' + exercise),
          marker: (completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : '',
          handler: shop.execute.bind(shop, ['select', exercise])
        };
      }),
    extras: shop.cli.commands.concat()
      .reverse()
      .filter(isCommandInMenu)
      .map(function (command) {
        return {
          label: chalk.bold(__('menu.' + command.aliases[0])),
          handler: command.handler.bind(command, shop)
        };
      })
      .concat({
        label: chalk.bold(__('menu.exit')),
        handler: process.exit.bind(process, 0)
      })
  })
}
exports.menu = false