const LegacyAdventure = require('../adventure')
const test = require('tape')

test('options a string', (t) => {
  const workshopper = LegacyAdventure('test workshopper')

  t.plan(2)
  t.ok(workshopper)
  t.equal(workshopper.title, 'TEST WORKSHOPPER')
})

test('options an object', (t) => {
  const options = {
    name: 'TEST SAMPLE',
    languages: ['en', 'es']
  }
  const workshopper = LegacyAdventure(options)

  t.plan(6)
  t.ok(workshopper)
  t.equal(workshopper.title, options.name)
  t.equal(workshopper.name, options.name)
  t.equal(workshopper.appName, options.name)
  t.equal(workshopper.appname, options.name)
  t.deepEqual(workshopper.languages, options.languages)
})
