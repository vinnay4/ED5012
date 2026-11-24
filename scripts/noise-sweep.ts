import { generateSyntheticTrack } from '../src/lib/synthetic/generator'
import { analyzeTrack, DEFAULT_SETTINGS } from '../src/lib/analysis/analyze'
import { evaluateAgainstTruth } from '../src/lib/analysis/evaluate'

const t0 = performance.now()
for (const camera of ['side', 'front'] as const) {
  for (const noisePx of [0, 2, 4, 6, 8, 10]) {
    let f1 = 0,
      reps = 0,
      prec = 0,
      rec = 0
    const seeds = [1, 2, 3]
    for (const seed of seeds) {
      const track = generateSyntheticTrack({ camera, noisePx, seed })
      const a = analyzeTrack(track, { ...DEFAULT_SETTINGS, statureCm: 175, externalLoadKg: 12 })
      const ev = evaluateAgainstTruth(a, track.groundTruth!)
      f1 += ev.overall.f1
      prec += ev.overall.precision
      rec += ev.overall.recall
      reps += ev.repsMatched === ev.repsTrue && ev.repsDetected === ev.repsTrue ? 1 : 0
    }
    const n = seeds.length
    console.log(camera, noisePx, 'f1', (f1 / n).toFixed(2), 'P', (prec / n).toFixed(2), 'R', (rec / n).toFixed(2), 'repsExact', reps, '/', n)
  }
}
console.log('ms', (performance.now() - t0).toFixed(0))
