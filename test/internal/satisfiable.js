'use strict'

const t = require('tap')
const Range = require('../../classes/range')
const Comparator = require('../../classes/comparator')
const {
  isSatisfiable,
  minimumSatisfiable,
} = require('../../internal/satisfiable')

const cases = [
  // range, options, expected minimum (null means unsatisfiable)
  ['*', undefined, '0.0.0'],
  ['>=1.0.0 <2.0.0', undefined, '1.0.0'],
  ['>1.2.3', undefined, '1.2.4'],
  ['<1.2.4-0', undefined, '0.0.0'],
  // endpoint gap: nothing exists strictly between 1.2.3 and 1.2.4-0
  ['>1.2.3 <1.2.4-0', undefined, null],
  ['>=1.2.4 <1.2.4-0', undefined, null],
  // >x desugars to the null-set comparator
  ['>x', undefined, null],
  ['>x', { includePrerelease: true }, null],
  // <0.0.0-0 is the canonical null set
  ['<0.0.0-0', undefined, null],
  ['<0.0.0-0', { includePrerelease: true }, null],
  // two distinct exact versions
  ['1.2.3 1.2.4', undefined, null],
  // exact version outside its bounds
  ['1.0.0 >1.2.3', undefined, null],
  // an upper bound admitting prereleases of its own tuple
  ['>1.2.3 <1.2.4-5', undefined, '1.2.4-0'],
  // prerelease tuple allowed by an explicit comparator in the set
  ['>=1.2.3-pre.0 <1.2.3', undefined, '1.2.3-pre.0'],
  // prerelease tuple not allowed in non-prerelease mode
  ['>=1.2.3-pre.0 <1.2.3', { includePrerelease: false }, '1.2.3-pre.0'],
  // prerelease mode admits prereleases of any tuple
  ['>=1.2.3 <1.2.4-5', { includePrerelease: true }, '1.2.3'],
  ['<0.0.0-beta >0.0.0-alpha', undefined, '0.0.0-alpha.0'],
  ['>1.0.0-0', undefined, '1.0.0-0.0'],
  // upper-only ranges still have versions
  ['<2.0.0', undefined, '0.0.0'],
  ['<=1.2.3-beta', undefined, '0.0.0'],
  ['<=1.2.3-beta', { includePrerelease: true }, '0.0.0-0'],
  ['<=1.2.3-beta >1.2.3-alpha.2', { includePrerelease: true }, '1.2.3-alpha.2.0'],
]

cases.forEach(([range, options, expected]) => {
  t.test(`${range}${options ? ' ' + JSON.stringify(options) : ''}`, t => {
    const r = new Range(range, options)
    t.equal(r.set.length, 1, 'one simple range')
    const comps = r.set[0]
    const min = minimumSatisfiable(comps, options)
    t.equal(min === null ? null : min.version, expected, 'minimum')
    t.equal(isSatisfiable(comps, options), expected !== null, 'satisfiable')
    if (expected !== null) {
      t.ok(r.test(min), 'minimum actually satisfies')
    }
    t.end()
  })
})

t.test('works with Comparator options object', t => {
  const comps = [
    new Comparator('>1.2.3'),
    new Comparator('<1.2.4-0'),
  ]
  t.notOk(isSatisfiable(comps))
  t.equal(minimumSatisfiable(comps), null)
  t.end()
})
