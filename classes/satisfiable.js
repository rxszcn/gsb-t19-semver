'use strict'

// This module is the single source of truth for whether a set of
// comparators can be satisfied by any version at all.  This "does a
// solution exist" determination is shared by Range#intersects,
// Comparator#intersects, subset, and minVersion, so that they can
// never disagree about whether a combination of constraints has a
// version that satisfies it.

// >=1.2.3 is lower than >1.2.3
const higherGT = (a, b, options) => {
  if (!a) {
    return b
  }
  const comp = compare(a.semver, b.semver, options)
  return comp > 0 ? a
    : comp < 0 ? b
    : b.operator === '>' && a.operator === '>=' ? b
    : a
}

// <=1.2.3 is higher than <1.2.3
const lowerLT = (a, b, options) => {
  if (!a) {
    return b
  }
  const comp = compare(a.semver, b.semver, options)
  return comp < 0 ? a
    : comp > 0 ? b
    : b.operator === '<' && a.operator === '<=' ? b
    : a
}

// the lowest version that is greater than the given version
const successor = (version) => {
  const { major, minor, patch, prerelease } = version
  if (prerelease.length) {
    return new SemVer(`${major}.${minor}.${patch}-${[...prerelease, 0].join('.')}`)
  }
  return new SemVer(`${major}.${minor}.${patch + 1}-0`)
}

// the lowest version with no prerelease that is
// greater than the given version
const nextRelease = (version) => {
  const { major, minor, patch, prerelease } = version
  if (prerelease.length) {
    return new SemVer(`${major}.${minor}.${patch}`)
  }
  return new SemVer(`${major}.${minor}.${patch + 1}`)
}

const testSet = (set, version, options) => {
  for (let i = 0; i < set.length; i++) {
    if (!set[i].test(version)) {
      return false
    }
  }

  if (version.prerelease.length && !options.includePrerelease) {
    // Find the set of versions that are allowed to have prereleases
    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
    // That should allow `1.2.3-pr.2` to pass.
    // However, `1.2.4-alpha.notready` should NOT be allowed,
    // even though it's within the range set by the comparators.
    for (let i = 0; i < set.length; i++) {
      debug(set[i].semver)
      if (set[i].semver === Comparator.ANY) {
        continue
      }

      if (set[i].semver.prerelease.length > 0) {
        const allowed = set[i].semver
        if (allowed.major === version.major &&
            allowed.minor === version.minor &&
            allowed.patch === version.patch) {
          return true
        }
      }
    }

    // Version has a -pre, but it's not one of the ones we like.
    return false
  }

  return true
}

// take a set of comparators and determine whether there
// exists a version which can satisfy it
const isSatisfiable = (comparators, options) => {
  options = parseOptions(options)

  let eq = null
  let gt = null
  let lt = null
  for (const comparator of comparators) {
    if (comparator.semver === Comparator.ANY) {
      continue
    }
    switch (comparator.operator) {
      case '>':
      case '>=':
        gt = higherGT(gt, comparator, options)
        break
      case '<':
      case '<=':
        lt = lowerLT(lt, comparator, options)
        break
      default:
        // two different exact versions can never both be satisfied
        if (eq && eq.version !== comparator.semver.version) {
          return false
        }
        eq = comparator.semver
    }
  }

  // an exact version just has to satisfy the rest of the set
  if (eq) {
    return testSet(comparators, eq, options)
  }

  // If any version can satisfy this set, then one of these candidates
  // can: the bounds themselves, the versions right after a strict
  // lower bound, or the lowest possible versions when there is no
  // lower bound at all.
  const candidates = []
  if (gt) {
    candidates.push(gt.semver)
    if (gt.operator === '>') {
      candidates.push(successor(gt.semver), nextRelease(gt.semver))
    }
  }
  if (lt) {
    candidates.push(lt.semver)
  }
  if (!gt) {
    candidates.push(new SemVer('0.0.0', options), new SemVer('0.0.0-0', options))
  }

  return candidates.some((candidate) => testSet(comparators, candidate, options))
}

module.exports = { isSatisfiable, testSet, higherGT, lowerLT }

const SemVer = require('./semver')
const Comparator = require('./comparator')
const compare = require('../functions/compare')
const parseOptions = require('../internal/parse-options')
const debug = require('../internal/debug')
