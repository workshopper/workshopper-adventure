const WA = require('../index')
const test = require('tape')
const sinon = require('sinon')
const commandico = require('commandico')

const prepareOptions = (options = {}) => {
  return {
    name: 'sample workshopper',
    ...options
  }
}

test('without options', (t) => {
  t.plan(1)
  t.throws(WA, Error, 'The workshopper needs a name to store the progress.')
})

test('with options name', (t) => {
  const options = prepareOptions()
  const workshopper = WA(options)

  t.plan(1)
  t.ok(workshopper)
})

test('cli', (t) => {
  const options = prepareOptions()
  const workshopper = WA(options)

  t.plan(1)
  t.ok(workshopper.cli instanceof commandico)
})

test('#execute', (t) => {
  const options = prepareOptions()
  const workshopper = WA(options)
  sinon.stub(workshopper.cli, 'execute')
  const cli = workshopper.cli

  t.plan(1)
  workshopper.execute()
  t.ok(cli.execute.called)
  cli.execute.restore()
})

test('#addExercise', (t) => {
  const exercise = { name: 'new exercise', id: 122 }
  const workshopper = WA(prepareOptions())
  workshopper.addExercise(exercise)
  t.plan(1)
  t.equal(workshopper.exercises.length, 1)
})

test('#getVersionString', (t) => {
  const options = prepareOptions({ version: '0.1.0' })
  const workshopper = WA(options)

  t.plan(1)
  t.equal(workshopper.getVersionString(), `${options.name}@${options.version}`)
})
