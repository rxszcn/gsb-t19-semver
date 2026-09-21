'use strict'

const { test } = require('tap')
const { isSatisfiable } = require('../../classes/satisfiable.js')
const Range = require('../../classes/range.js')

// [range, satisfiable, options]
const cases = [
  // anything satisfies the any range
  ['*', true],
  ['', true],
  ['>1.0.0', true],
  ['<2.0.0', true],
  ['>=1.0.0 <=1.0.0', true],
  ['>1.0.0 <2.0.0', true],
  ['1.2.3', true],

  // bounds that meet at a single point need both sides inclusive
  ['>1.0.0 <=1.0.0', false],
  ['>=1.0.0 <1.0.0', false],
  ['>1.0.0 <1.0.0', false],
  ['>2 <1', false],

  // no version exists strictly between 1.2.3 and 1.2.4-0
  ['>1.2.3 <1.2.4-0', false],
  ['>1.2.3 <1.2.4-0', false, { includePrerelease: true }],
  // ...but 1.2.4-0 itself is a version
  ['>1.2.3 <=1.2.4-0', true, { includePrerelease: true }],

  // only prereleases of 1.2.4 fall in this gap, and the
  // tuple prerelease rule decides whether they count
  ['>1.2.3 <1.2.4', false],
  ['>1.2.3 <1.2.4', true, { includePrerelease: true }],
  ['>1.2.3 <1.2.4-5', true],

  // nothing is lower than 0.0.0-0
  ['<0.0.0-0', false],
  ['<0.0.0-0', false, { includePrerelease: true }],
  ['>x', false],
  ['>x', false, { includePrerelease: true }],
  ['<0.0.0', false],
  ['<0.0.0', true, { includePrerelease: true }],

  // exact versions must agree and satisfy the rest of the set
  ['1.2.3 1.2.4', false],
  ['1.2.3 >1.2.3', false],
  ['1.2.3 >=1.2.3', true],
  ['>1.0.0 2.0.0 <3.0.0', true],
]

test('isSatisfiable', t => {
  t.plan(cases.length)
  for (const [range, expect, options] of cases) {
    const comparators = new Range(range, options).set[0]
    t.equal(isSatisfiable(comparators, options), expect,
      `${range} ${expect ? 'has' : 'has no'} solution`)
  }
})
