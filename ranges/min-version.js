'use strict'

const Range = require('../classes/range')
const { minimumSatisfiable } = require('../internal/satisfiable')
const gt = require('../functions/gt')

const minVersion = (range, loose) => {
  range = new Range(range, loose)

  let minver = null
  for (const comparators of range.set) {
    // emptiness of a simple range and its minimum version are the same
    // question, so both come from the shared satisfiability decision
    const setMin = minimumSatisfiable(comparators, range.options)
    if (setMin && (!minver || gt(minver, setMin))) {
      minver = setMin
    }
  }

  return minver
}
module.exports = minVersion
