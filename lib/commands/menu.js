function getExtras (shop) {
  return shop.cli.commands.concat()
    .reverse()
    .filter(function isCommandInMenu (extra) {
      if (typeof extra.filter === 'function' && !extra.filter(shop)) {
        return false
      }
      return extra.menu !== false
    })
}

function renderNonTty (shop, menuOptions) {
  var completed = shop.appStorage.get('completed') || []
  var __ = shop.i18n.__
  var stream = shop.createMarkdownStream()

  stream.append('\n' +
    '# {error.notty}\n' +
    '---\n' +
    '# {title}\n' +
    '---\n', 'md')

  shop.exercises.forEach(function (exercise, no) {
    stream.append(' `{appName} select ' + no + '`: ' + shop.i18n.__('exercise.' + exercise) + (completed.indexOf(exercise) >= 0 ? ' [' + shop.i18n.__('menu.completed') + ']' : ''), 'md')
  })
  stream.append('---\n', 'md')

  getExtras(shop)
    .forEach(function (command) {
      stream.append('  `{appName} ' + command.aliases[0] + '`: ' + __('menu.' + command.aliases[0]) + '\n', 'md')
    })
  stream
    .appendChain('\n---\n', 'md')
    .pipe(require('../mseePipe')())
    .pipe(process.stdout)
}

exports.handler = function (shop) {
  const chalk = require('chalk')

  var __ = shop.i18n.__
  var __n = shop.i18n.__n
  var completed = shop.appStorage.get('completed') || []
  var current = shop.appStorage.get('current')
  var menuOptions = {
    title: __('title'),
    subtitle: shop.i18n.has('subtitle') && __('subtitle'),
    menu: shop.exercises.map(function (exercise) {
      return {
        label: chalk.bold('» ' + __('exercise.' + exercise)),
        marker: (completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : '',
        handler: shop.execute.bind(shop, ['select', exercise])
      }
    }),
    extras: getExtras(shop)
      .map(function (command) {
        return {
          label: chalk.bold(__n('menu.' + command.aliases[0], command.info)),
          handler: command.handler.bind(command, shop, [])
        }
      })
      .concat({
        label: chalk.bold(__('menu.exit')),
        handler: process.exit.bind(process, 0)
      })
  }

  if (completed.indexOf(current) >= 0) {
    current = shop.getNext()
  }
  shop.options.menuFactory.options.selected = shop.exercises.reduce(function (selected, exercise, count) {
    return exercise === current ? count : selected
  }, undefined)
  shop.options.menuFactory.create(menuOptions) || renderNonTty(shop, menuOptions)
}
exports.menu = false
