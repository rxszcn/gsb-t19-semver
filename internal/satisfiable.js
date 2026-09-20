'use strict'

// A single source of truth for "does this conjunction of comparators
// describe at least one version?"  Every place that needs to tell an
// empty (null) set apart from a non-empty one must go through this
// module, so pairwise comparator reasoning can never disagree with
// what a real version would satisfy.

const Comparator = require('../classes/comparator')
const SemVer = require('../classes/semver')
const parseOptions = require('./parse-options')
const compare = require('../functions/compare')

// prerelease versions are allowed in non-prerelease mode only when a
// comparator in the set references the same [major, minor, patch] tuple
const tupleAllowed = (comparators, version) =>
  comparators.some((c) => c.semver !== Comparator.ANY &&
    c.semver.prerelease.length &&
    c.semver.major === version.major &&
    c.semver.minor === version.minor &&
    c.semver.patch === version.patch)

const candidatePasses = (comparators, version, includePrerelease) => {
  for (const c of comparators) {
    if (!c.test(version)) {
      return false
    }
  }
  if (version.prerelease.length && !includePrerelease &&
      !tupleAllowed(comparators, version)) {
    return false
  }
  return true
}

// Return the lowest version satisfying every comparator, or null when no
// such version exists.  Any satisfying set has a minimum, and that
// minimum is among the finite candidates derived from the comparator
// endpoints: the global floor, the floor implied by each >=/eq
// comparator, the > successor, and the first prerelease of every tuple
// named by an upper bound (the only place a prerelease can be admitted
// in non-prerelease mode without a lower bound on that tuple).  An
// exact <= prerelease endpoint needs no candidate of its own: if it is
// the minimum witness, a lower-bound comparator already supplies it.
const minimumSatisfiable = (comparators, options) => {
  options = parseOptions(options)
  const includePrerelease = !!options.includePrerelease

  const candidates = [
    includePrerelease ? new SemVer('0.0.0-0') : new SemVer('0.0.0'),
  ]

  const addCandidate = (version) => {
    if (candidates.every((c) => c.version !== version.version)) {
      candidates.push(version)
    }
  }

  for (const c of comparators) {
    if (c.semver === Comparator.ANY) {
      continue
    }
    const v = c.semver
    if (c.operator === '<') {
      addCandidate(new SemVer(`${v.major}.${v.minor}.${v.patch}-0`))
    } else if (c.operator === '<=') {
      addCandidate(new SemVer(`${v.major}.${v.minor}.${v.patch}-0`))
    } else if (c.operator === '>=') {
      addCandidate(new SemVer(v.version))
    } else if (c.operator === '>') {
      const successor = new SemVer(v.version)
      if (v.prerelease.length) {
        successor.prerelease = successor.prerelease.concat(0)
      } else {
        successor.patch++
      }
      successor.raw = successor.format()
      addCandidate(successor)
    } else {
      addCandidate(new SemVer(v.version))
    }
  }

  let min = null
  for (const candidate of candidates) {
    if (candidatePasses(comparators, candidate, includePrerelease) &&
        (min === null || compare(candidate, min, options) < 0)) {
      min = candidate
    }
  }
  return min
}

const isSatisfiable = (comparators, options) =>
  minimumSatisfiable(comparators, options) !== null

module.exports = { isSatisfiable, minimumSatisfiable }
