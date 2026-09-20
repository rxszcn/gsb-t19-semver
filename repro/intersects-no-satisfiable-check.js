"use strict"
// probe1: cross-path invariants at base (run from repo root)
const semver = require("../index.js")
const { Range, Comparator, SemVer } = semver
const P = (label, v) => console.log(label + " => " + JSON.stringify(v))
semver.simplify = semver.simplifyRange

// A. empty-range vs intersects vs test (tuple prerelease rule)
P("A1 intersects('>1.2.3','<1.2.4-0')", semver.intersects(">1.2.3", "<1.2.4-0"))
P("A2 any test of '>=1.2.4 <1.2.4-0'? sample:", (() => {
  const r = new Range(">1.2.3 <1.2.4-0")
  const vs = ["1.2.3","1.2.4","1.2.4-0","1.2.4-1","1.3.0","1.2.3-0","1.2.3-9"]
  return vs.filter(v => r.test(v))
})())
P("A3 minVersion('>1.2.3 <1.2.4-0')", String(semver.minVersion(">1.2.3 <1.2.4-0")))
P("A4 subset('>1.2.3 <1.2.4-0','<1.0.0') (empty sub => expect true)", semver.subset(">1.2.3 <1.2.4-0", "<1.0.0"))
P("A5 intersects('>x','x',{includePrerelease:true})", semver.intersects(">x", "x", { includePrerelease: true }))
P("A6 intersects('>x','x')", semver.intersects(">x", "x"))
P("A7 test of '>x' null set on many:", (() => {
  const r = new Range(">x", { includePrerelease: true })
  return r.set[0][0].value + " tests: " + ["0.0.0","9.9.9","0.0.1-0"].map(v => r.test(v)).join(",")
})())

// B. gtr/ltr/satisfies partition
const parts = [["1.2.3-alpha", ">=1.0.0"], ["1.2.3-alpha", ">=1.0.0 <2.0.0"], ["2.0.0-beta", ">=1.0.0 <2.0.0"], ["3.0.0", ">=1.0.0 <2.0.0"], ["0.5.0", ">=1.0.0 <2.0.0"]]
for (const [v, r] of parts) {
  P("B " + v + " " + r + " sat/gtr/ltr", [semver.satisfies(v, r), semver.gtr(v, r), semver.ltr(v, r)])
}

// C. cache sharing / options aliasing
const o = { loose: false }
const r1 = new Range(">=1.0.0", o)
o.loose = true
const r2 = new Range(">=1.0.0")
P("C1 r1.set === r2.set (shared array)", r1.set === r2.set)
P("C2 comparator options identity", r1.set[0][0].options === o)
P("C3 r2 strict but cached comparator loose? comparator.test('1.2')", r2.set[0][0].test("1.2"))
const o2 = {}
const ra = new Range("1.2.x", o2)
P("C4 new Range('1.2.x') shares set with first", new Range("1.2.x").set === ra.set)
P("C5 subset self via identity: subset('1.2.3 1.2.4','1.2.3 1.2.4') (unsat both)", semver.subset("1.2.3 1.2.4", "1.2.3 1.2.4"))
P("C6 subset of same-normalized-different-string", semver.subset(">= 1.0.0   <2.0.0", ">=1.0.0 <2.0.0"))

// D. live options mutation changes an already-built Range
const live = { includePrerelease: false }
const rl = new Range(">=1.0.0", live)
P("D1 before mutate test('2.0.0-beta')", rl.test("2.0.0-beta"))
live.includePrerelease = true
P("D2 after mutate SAME Range object test('2.0.0-beta')", rl.test("2.0.0-beta"))
P("D3 flags snapshot on instance rl.loose/includePrerelease", [rl.loose, rl.includePrerelease])

// E. validRange / '*' serialization contract
P("E1 validRange('*')", semver.validRange("*"))
P("E2 validRange('')", semver.validRange(""))
P("E3 Boolean(validRange('*')) truthiness", !!semver.validRange("*"))
P("E4 validRange('x')", semver.validRange("x"))
P("E5 new Range('*').range === ''", new Range("*").range === "")

// F. simplify return-type contract
const simp1 = semver.simplify(["1.0.0", "2.0.0"], "*")
P("F1 simplify(['1.0.0','2.0.0'],'*') typeof", [typeof simp1, String(simp1)])
const r6 = new Range("1.0.0 || 2.0.0")
const simp2 = semver.simplify(["1.0.0", "2.0.0"], r6)
P("F2 simplify with Range input returns identical object?", simp2 === r6, typeof simp2)
const simp3 = semver.simplify(["1.0.0", "1.1.0", "2.0.0"], ">=1.0.0 <1.2.0 || 2.0.0")
P("F3", [typeof simp3, String(simp3)])

// G. subset vs intersects disagreement sweep with prerelease
const sweep = [
  [">=1.2.3-alpha <1.2.3", ">=1.2.2 <1.2.3-beta"],
  [">1.2.3", "<1.2.4-0"],
  [">=1.2.4 <1.2.4-0", "x"],
  ["<0.0.0-0", ">=0.0.0"],
  [">=1.0.0 <1.0.0-0", "x"],
]
for (const [a, b] of sweep) {
  const ip = semver.intersects(a, b)
  const s1 = (() => { try { return semver.subset(a, b) } catch (e) { return "throw" } })()
  const s2 = (() => { try { return semver.subset(b, a) } catch (e) { return "throw" } })()
  const emptyGuess = (() => {
    const ra2 = new Range(a), rb = new Range(b)
    const vs = ["0.0.0","0.0.0-0","1.0.0","1.0.0-0","1.2.2","1.2.2-0","1.2.3","1.2.3-0","1.2.3-alpha","1.2.3-beta","1.2.4","1.2.4-0","2.0.0","2.0.0-0"]
    return vs.some(v => ra2.test(v) && rb.test(v))
  })()
  P("G " + a + "  vs  " + b + " | intersects/supset(s1,s2)/brute-force-overlap", [ip, s1, s2, emptyGuess])
}
