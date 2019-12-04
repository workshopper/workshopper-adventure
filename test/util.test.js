const util = require('../util')
const test = require('tape')

// idFromName
const name = 'TEST CHALLENGE'
test('remove white spaces with underscore', (t) => {
  t.plan(1)
  t.equal(util.idFromName(name), 'test_challenge')
})

test('allow customize character to replace white space', (t) => {
  t.plan(1)
  t.equal(util.idFromName(name, '-'), 'test-challenge')
})
