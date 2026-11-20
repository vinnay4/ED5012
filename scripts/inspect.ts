import { readFileSync } from 'node:fs'
import { analyzeTrack, DEFAULT_SETTINGS } from '../src/lib/analysis/analyze'
import type { PoseTrack } from '../src/lib/pose/types'

for (const id of process.argv.slice(2)) {
  const track: PoseTrack = JSON.parse(readFileSync(id, 'utf8'))
  const a = analyzeTrack(track, { ...DEFAULT_SETTINGS, externalLoadKg: id.includes('kettlebell') ? 16 : 0 })
  console.log('\n==', id, a.ok, a.error ?? '', a.view, a.quality)
  console.log('baseline', a.baselineCount, a.baseline)
  for (const r of a.reps) {
    const m = r.metrics
    console.log(
      `#${r.index} ${r.start.toFixed(1)}-${r.bottom.toFixed(1)}-${r.end.toFixed(1)} score=${r.score} ${r.isBaseline ? 'B' : ' '} conf=${r.confidence.toFixed(2)} depth=${m.depth?.toFixed(0)} knee=${m.kneeMin?.toFixed(0)} lean=${m.trunkLean?.toFixed(1)} valg=${m.kneeValgus?.toFixed(1)} shift=${m.hipShift?.toFixed(1)} v=${m.velocity?.toFixed(2)} pat=${m.pattern?.toFixed(0)} asc=${m.ascentS.toFixed(2)} pause=${m.pauseS.toFixed(2)} L5=${r.lumbar?.compressionN.toFixed(0) ?? ''} | ` +
        Object.entries(r.deviations)
          .map(([k, d]) => `${k}:${d!.dev.toFixed(1)}${d!.level === 'ok' ? '' : '!' + d!.level}`)
          .join(' '),
    )
  }
  console.log('onset', a.driftOnsetRep, 'fatigue', a.fatigueRep, 'trend', a.trend)
  console.log('issues', a.issues)
  console.log('cues', a.cues.map((c) => `${c.rep}:${c.text}:${c.delivered ? 'Y' : 'N(' + c.reason + ')'}`).join(' | '))
  console.log('anthro', a.anthropometry.measured, a.anthropometry.interpretation.slice(0, 60))
}
