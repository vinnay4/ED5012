// Regression check for the analysis engine. Exits non-zero if detection quality drops.
// Usage: npm run verify
import { readFileSync } from 'node:fs'
import { generateSyntheticTrack } from '../src/lib/synthetic/generator'
import { analyzeTrack, DEFAULT_SETTINGS } from '../src/lib/analysis/analyze'
import { evaluateAgainstTruth } from '../src/lib/analysis/evaluate'
import { METRICS } from '../src/lib/analysis/metrics'
import type { PoseTrack } from '../src/lib/pose/types'

let failed = 0
const check = (ok: boolean, label: string, detail: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(44)} ${detail}`)
  if (!ok) failed++
}

for (const camera of ['side', 'front'] as const) {
  const track = generateSyntheticTrack({ camera })
  const a = analyzeTrack(track, { ...DEFAULT_SETTINGS, statureCm: 175, externalLoadKg: 12 })
  const ev = evaluateAgainstTruth(a, track.groundTruth!)
  check(a.view.type === camera, `simulated ${camera}: view classification`, a.view.type)
  check(ev.repsDetected === ev.repsTrue && ev.repsMatched === ev.repsTrue, `simulated ${camera}: rep count`, `${ev.repsDetected}/${ev.repsTrue}`)
  check(ev.overall.f1 >= 0.95, `simulated ${camera}: drift-flag F1 >= 0.95`, ev.overall.f1.toFixed(3))
  check(a.driftOnsetRep !== null && a.driftOnsetRep >= 5 && a.driftOnsetRep <= 7, `simulated ${camera}: drift onset in reps 5-7`, String(a.driftOnsetRep))
}

for (const [id, expected, view] of [
  ['side-kettlebell-squat', 6, 'side'],
  ['oblique-barbell-back-squat', 4, 'oblique'],
] as const) {
  const track = JSON.parse(readFileSync(`public/samples/${id}.pose.json`, 'utf8')) as PoseTrack
  const a = analyzeTrack(track, DEFAULT_SETTINGS)
  const alarms = a.issues.filter((i) => METRICS[i.metric].kind === 'technique' || METRICS[i.metric].kind === 'safety')
  check(a.reps.length === expected, `${id}: rep count`, `${a.reps.length}/${expected}`)
  check(a.view.type === view, `${id}: view classification`, a.view.type)
  check(alarms.length === 0, `${id}: no technique false alarms`, alarms.map((i) => i.metric).join(', ') || 'none')
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
