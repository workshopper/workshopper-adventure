function getExtras (shop) {
  return shop.cli.commands.concat()
    .reverse()
    .filter(extra => {
      if (typeof extra.filter === 'function' && !extra.filter(shop)) {
        return false
      }
      return extra.menu !== false
    })
}

function renderNonTty (shop) {
  const completed = shop.appStorage.get('completed') || []
  const { __ } = shop.i18n
  const stream = shop.createMarkdownStream()

  stream.append(`
# {error.notty}
---
# {title}
---`, 'md')

  shop.exercises.forEach((exercise, no) =>
    stream.append(` \`{appName} select ${no}\`: ${shop.i18n.__(`exercise.${exercise}`)}${completed.indexOf(exercise) >= 0 ? ` [${shop.i18n.__('menu.completed')}]` : ''}`, 'md')
  )
  stream.append('---\n', 'md')

  getExtras(shop)
    .forEach(command =>
      stream.append(` \`{appName ${command.aliases[0]}\`: ${__(`menu.${command.aliases[0]}`)}\n`, 'md')
    )
  stream
    .appendChain('\n---\n', 'md')
    .pipe(require('../mseePipe')())
    .pipe(process.stdout)
}

exports.handler = function (shop) {
  const chalk = require('chalk')

  const { __, __n } = shop.i18n
  const completed = shop.appStorage.get('completed') || []
  let current = shop.appStorage.get('current')
  if (completed.indexOf(current) >= 0) {
    current = shop.getNext()
  }
  const menuOptions = {
    title: __('title'),
    subtitle: shop.i18n.has('subtitle') && __('subtitle'),
    menu: shop.exercises.map(function (exercise) {
      return {
        label: chalk.bold(`» ${__(`exercise.${exercise}`)}`),
        marker: (completed.indexOf(exercise) >= 0) ? '[' + __('menu.completed') + ']' : '',
        handler: shop.execute.bind(shop, ['select', exercise])
      }
    }),
    extras: getExtras(shop)
      .map(command => ({
        label: chalk.bold(__n(`menu.${command.aliases[0]}`, command.info)),
        handler: command.handler.bind(command, shop, [])
      }))
      .concat({
        label: chalk.bold(__('menu.exit')),
        handler: process.exit.bind(process, 0)
      })
  }

  shop.options.menuFactory.options.selected = shop.exercises.reduce(
    (selected, exercise, count) => exercise === current ? count : selected,
    undefined
  )
  shop.options.menuFactory.create(menuOptions) || renderNonTty(shop, menuOptions)
}
exports.menu = false
