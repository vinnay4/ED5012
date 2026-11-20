import { generateSyntheticTrack } from '../src/lib/synthetic/generator'
import { analyzeTrack, DEFAULT_SETTINGS } from '../src/lib/analysis/analyze'
import { evaluateAgainstTruth } from '../src/lib/analysis/evaluate'

for (const camera of ['side', 'front'] as const) {
  const track = generateSyntheticTrack({ camera })
  const a = analyzeTrack(track, { ...DEFAULT_SETTINGS, statureCm: 175, externalLoadKg: 12 })
  console.log('\n==', camera, a.ok, a.error ?? '', a.view.type, a.view.ratio.toFixed(2), 'reps', a.reps.length, 'base', a.baselineCount)
  for (const r of a.reps) {
    const m = r.metrics,
      g = track.groundTruth![r.index - 1]?.values ?? {}
    console.log(
      `#${r.index} s=${r.score} depth=${m.depth?.toFixed(1)}/${g.depth?.toFixed(1)} lean=${m.trunkLean?.toFixed(1)}/${g.trunkLean?.toFixed(1)} valg=${m.kneeValgus?.toFixed(1)}/${g.kneeValgus?.toFixed(1)} shift=${m.hipShift?.toFixed(1)}/${g.hipShift?.toFixed(1)} v=${m.velocity?.toFixed(3)}/${g.velocity?.toFixed(3)} pat=${m.pattern?.toFixed(0)} | ` +
        Object.entries(r.deviations)
          .map(([k, d]) => `${k}:${d!.dev.toFixed(1)}${d!.level === 'ok' ? '' : '!' + d!.level}`)
          .join(' '),
    )
  }
  console.log('onset', a.driftOnsetRep, 'fatigue', a.fatigueRep, 'issues', a.issues.map((i) => `${i.metric}:${i.worstLevel}@${i.firstRep}`).join(', '))
  console.log('cues', a.cues.map((c) => `${c.rep}:${c.text}:${c.delivered ? 'Y' : 'N'}`).join(' | '))
  const ev = evaluateAgainstTruth(a, track.groundTruth!)
  console.log(
    'eval',
    ev.repsTrue,
    ev.repsDetected,
    ev.overall,
    ev.metrics.map((m) => `${m.metric} tp${m.tp} fp${m.fp} fn${m.fn} tn${m.tn} mae=${m.mae.toFixed(2)} agree=${m.levelAgreement.toFixed(2)}`),
  )
}
