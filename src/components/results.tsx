import { AlertTriangle, CheckCircle2, CircleSlash, Download, Dumbbell, Info, Lightbulb, Microscope, Ruler } from 'lucide-react'
import type { SessionAnalysis } from '../lib/analysis/analyze'
import { FEEDBACK_MODES, CUE_COOLDOWN_S, MAX_REPEATS } from '../lib/analysis/feedback'
import { METRICS, formatDeviation, formatMetric, type MetricId } from '../lib/analysis/metrics'
import { NIOSH_ACTION_LIMIT_N } from '../lib/analysis/biomech'
import { evaluateAgainstTruth } from '../lib/analysis/evaluate'
import type { PoseTrack } from '../lib/pose/types'
import { downloadFile, useSettings } from '../lib/store'
import { LumbarChart, MetricChart, RepScoreChart, TempoChart, TimelineChart } from './charts'
import { Callout, LEVEL_COLOR, LevelChip, Stat, scoreColor } from './ui'

export function Overview({ a, onSeekRep }: { a: SessionAnalysis; onSeekRep: (rep: number) => void }) {
  const evalReps = a.reps.filter((r) => !r.isBaseline)
  const lastVel = evalReps.length ? evalReps[evalReps.length - 1].deviations.velocity?.dev : undefined
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Reps counted" value={a.reps.length} sub={`${a.baselineCount} used as baseline`} />
        <Stat
          label="Form score"
          value={Number.isFinite(a.summary.postBaselineScore) ? Math.round(a.summary.postBaselineScore) : '—'}
          sub="mean after baseline (0–100)"
          color={scoreColor(a.summary.postBaselineScore)}
        />
        <Stat
          label="Drift onset"
          value={a.driftOnsetRep ? `Rep ${a.driftOnsetRep}` : 'None'}
          sub={a.driftOnsetRep ? 'first of ≥2 consecutive flagged reps' : 'technique held steady'}
          color={a.driftOnsetRep ? LEVEL_COLOR.minor : LEVEL_COLOR.ok}
        />
        <Stat
          label="Velocity loss"
          value={lastVel !== undefined ? `${Math.max(0, lastVel).toFixed(0)} %` : '—'}
          sub={a.fatigueRep ? `passed 20 % at rep ${a.fatigueRep}` : 'last rep vs baseline'}
          color={lastVel !== undefined && lastVel >= 20 ? LEVEL_COLOR.major : undefined}
        />
        <Stat label="Tracking quality" value={`${(a.quality.meanVisibility * 100).toFixed(0)} %`} sub={`${a.quality.detectedPct.toFixed(0)} % of frames with a person`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="card card-pad">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-semibold text-white">Form score per rep</h3>
            <span className="text-xs text-ink-400">
              trend {a.trend.slope >= 0 ? '+' : ''}
              {a.trend.slope.toFixed(1)} pts/rep · R² {a.trend.r2.toFixed(2)}
            </span>
          </div>
          <p className="mb-2 text-xs text-ink-400">Tap a bar to jump to that rep. 100 = identical to your baseline. Purple bars are the baseline reps.</p>
          <RepScoreChart a={a} onSelect={onSeekRep} />
        </div>
        <div className="space-y-3">
          <MeasuredPanel a={a} />
          {a.quality.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-white">What changed, why it matters, what to do</h3>
        {a.issues.length === 0 ? (
          <div className="card card-pad flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
            <div className="text-sm text-ink-200">
              <div className="font-semibold text-white">Technique stayed within your baseline for the whole set.</div>
              No measured metric drifted past the minor threshold, so FormDrift raised no alarms. That matters as much as detecting drift: false alarms erode trust and add
              cognitive load.
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {a.issues.map((iss) => (
              <IssueCard key={iss.metric} a={a} metric={iss.metric} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IssueCard({ a, metric }: { a: SessionAnalysis; metric: MetricId }) {
  const iss = a.issues.find((i) => i.metric === metric)!
  const def = METRICS[metric]
  const color = LEVEL_COLOR[iss.worstLevel]
  return (
    <div className="card overflow-hidden">
      <div className="h-1" style={{ background: color }} />
      <div className="card-pad space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide uppercase" style={{ color }}>
              {def.kind === 'fatigue' ? 'Fatigue indicator' : def.kind === 'safety' ? 'Safety-related' : def.kind === 'consistency' ? 'Consistency' : 'Technique'}
            </div>
            <h4 className="text-lg font-semibold text-white">{def.label}</h4>
          </div>
          <LevelChip level={iss.worstLevel} />
        </div>
        <p className="text-sm text-ink-200">
          <span className="font-semibold text-white">What we saw: </span>
          from rep {iss.firstRep}, {def.label.toLowerCase()} drifted by up to <span className="num font-semibold text-white">{formatDeviation(metric, iss.maxDev)}</span> from your
          baseline of <span className="num">{formatMetric(metric, a.baseline[metric])}</span>. Flagged reps: {iss.reps.join(', ')}.
        </p>
        <p className="text-sm text-ink-300">
          <span className="font-semibold text-ink-100">Why it matters: </span>
          {def.why}
        </p>
        <div className="flex gap-2 rounded-xl bg-brand-400/[0.07] p-3 text-sm text-ink-200">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
          <span>
            <span className="font-semibold text-white">Try this: </span>
            {def.drill}
          </span>
        </div>
        <p className="text-xs text-ink-400">
          Measured: {def.what} {def.thresholdNote}
        </p>
      </div>
    </div>
  )
}

function MeasuredPanel({ a }: { a: SessionAnalysis }) {
  return (
    <div className="card card-pad">
      <div className="mb-1 flex items-center gap-2 font-semibold text-white">
        <Microscope className="h-4 w-4 text-brand-400" /> {a.view.label}
      </div>
      <p className="mb-3 text-xs text-ink-400">Detected automatically from shoulder and hip geometry (width-to-torso ratio {a.view.ratio.toFixed(2)}).</p>
      <ul className="space-y-1.5 text-sm">
        {a.available.map((id) => (
          <li key={id} className="flex items-center gap-2 text-ink-200">
            <CheckCircle2 className="h-4 w-4 text-ok" /> {METRICS[id].label}
          </li>
        ))}
        {a.unavailable.map((u) => (
          <li key={u.id} className="flex items-center gap-2 text-ink-400">
            <CircleSlash className="h-4 w-4" /> {METRICS[u.id].label} <span className="text-xs">· {u.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RepDetail({ a }: { a: SessionAnalysis }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {a.available.map((id) => (
          <div key={id} className="card card-pad">
            <div className="flex items-baseline justify-between">
              <h4 className="font-semibold text-white">{METRICS[id].label}</h4>
              <span className="text-xs text-ink-400">{METRICS[id].unit}</span>
            </div>
            <MetricChart a={a} metric={id} />
            <p className="text-xs text-ink-400">{METRICS[id].thresholdNote}</p>
          </div>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="table-hf">
          <thead>
            <tr>
              <th>Rep</th>
              <th>Score</th>
              {a.available.map((id) => (
                <th key={id}>{METRICS[id].label}</th>
              ))}
              <th>Knee min</th>
              <th>Tempo ↓ / ⏸ / ↑ (s)</th>
            </tr>
          </thead>
          <tbody>
            {a.reps.map((r) => (
              <tr key={r.index}>
                <td className="num font-semibold text-white">
                  {r.index} {r.isBaseline && <LevelChip level="base" small />}
                </td>
                <td className="num font-semibold" style={{ color: r.isBaseline ? LEVEL_COLOR.base : LEVEL_COLOR[r.worstLevel] }}>
                  {r.score}
                </td>
                {a.available.map((id) => {
                  const d = r.deviations[id]
                  return (
                    <td key={id} className="num">
                      <div className="text-ink-100">{formatMetric(id, r.metrics[id])}</div>
                      {d && !r.isBaseline && (
                        <div className="text-[11px]" style={{ color: LEVEL_COLOR[d.level] }}>
                          {formatDeviation(id, d.dev)}
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="num">{r.metrics.kneeMin !== undefined ? `${r.metrics.kneeMin.toFixed(0)}°` : '—'}</td>
                <td className="num text-ink-300">
                  {r.metrics.descentS.toFixed(2)} / {r.metrics.pauseS.toFixed(2)} / {r.metrics.ascentS.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Biomechanics({ a, time, onSeek }: { a: SessionAnalysis; time: number; onSeek: (t: number) => void }) {
  const lumbar = a.reps.filter((r) => r.lumbar)
  const base = lumbar.filter((r) => r.isBaseline)
  const baseMean = base.length ? base.reduce((s, r) => s + r.lumbar!.compressionN, 0) / base.length : NaN
  const peak = lumbar.length ? lumbar.reduce((m, r) => (r.lumbar!.compressionN > m.lumbar!.compressionN ? r : m)) : null
  const pauses = a.reps.map((r) => r.metrics.pauseS)
  const basePause = a.reps.filter((r) => r.isBaseline).map((r) => r.metrics.pauseS)
  const bp = basePause.length ? basePause.reduce((x, y) => x + y, 0) / basePause.length : NaN
  const maxPause = Math.max(...pauses)
  return (
    <div className="space-y-5">
      <div className="card card-pad">
        <h4 className="font-semibold text-white">Hip depth over time</h4>
        <p className="mb-2 text-xs text-ink-400">
          Hip-joint descent as a percentage of leg length, measured every frame. Shaded spans are detected reps; dashed lines are feedback cues. Click to seek.
        </p>
        <TimelineChart a={a} time={time} onSeek={onSeek} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card card-pad">
          <h4 className="font-semibold text-white">Tempo per rep</h4>
          <p className="mb-2 text-xs text-ink-400">Lowering, bottom pause and rising durations from sub-frame threshold crossings (15 % and 90 % of each rep's depth).</p>
          <TempoChart reps={a.reps} />
          {Number.isFinite(bp) && maxPause > bp * 1.3 && (
            <p className="mt-2 text-xs text-ink-300">
              <Info className="mr-1 inline h-3.5 w-3.5 text-brand-400" />
              Observation (not scored): the bottom pause grew from {bp.toFixed(2)} s at baseline to {maxPause.toFixed(2)} s. Lingering at the bottom often comes before velocity
              loss.
            </p>
          )}
        </div>
        <div className="card card-pad">
          <h4 className="font-semibold text-white">Concentric velocity</h4>
          <p className="mb-2 text-xs text-ink-400">
            Mean upward hip velocity in m/s, scaled using stature {a.settings.statureCm} cm. Velocity loss is the standard fatigue marker in velocity-based training.
          </p>
          <MetricChart a={a} metric="velocity" height={200} />
        </div>
      </div>
      {lumbar.length > 0 ? (
        <div className="card card-pad">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-semibold text-white">Estimated L5/S1 compression per rep</h4>
            <span className="text-xs text-ink-400">
              body mass {a.settings.massKg} kg · external load {a.settings.externalLoadKg} kg
            </span>
          </div>
          <p className="mb-2 text-xs text-ink-400">
            Static 2D sagittal model (after Chaffin et al., 1999) driven by the measured peak trunk lean of each rep. Use it to compare reps; it is not a clinical estimate.
          </p>
          <LumbarChart reps={a.reps} />
          {peak && Number.isFinite(baseMean) && (
            <p className="mt-2 text-sm text-ink-300">
              Peak estimate <span className="num text-white">{(peak.lumbar!.compressionN / 1000).toFixed(2)} kN</span> at rep {peak.index}, which is{' '}
              <span className="num text-white">{(((peak.lumbar!.compressionN - baseMean) / baseMean) * 100).toFixed(0)} %</span> above baseline. That comes only from extra trunk
              lean at the same load: the reason trunk angle is treated as safety-related.{' '}
              {peak.lumbar!.compressionN < NIOSH_ACTION_LIMIT_N ? 'It stays below the NIOSH action limit of 3.4 kN.' : 'It exceeds the NIOSH action limit of 3.4 kN.'}
            </p>
          )}
        </div>
      ) : (
        <Callout tone="info" title="Spinal load estimate needs a side view">
          The L5/S1 model needs the sagittal trunk angle, which can only be measured reliably from the side.
        </Callout>
      )}
    </div>
  )
}

export function BodyPanel({ a }: { a: SessionAnalysis }) {
  const an = a.anthropometry
  const rows = an.measured
    ? [
        ['Thigh : shank', an.measured.thighToShank, an.reference.thighToShank],
        ['Thigh : trunk', an.measured.thighToTrunk, an.reference.thighToTrunk],
      ]
    : []
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card card-pad space-y-4">
        <div className="flex items-center gap-2 font-semibold text-white">
          <Ruler className="h-4 w-4 text-brand-400" /> Segment proportions from this clip
        </div>
        {rows.length ? (
          <table className="table-hf">
            <thead>
              <tr>
                <th>Ratio</th>
                <th>Measured</th>
                <th>Population reference</th>
                <th>Difference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, m, r]) => (
                <tr key={k as string}>
                  <td>{k}</td>
                  <td className="num text-white">{(m as number).toFixed(2)}</td>
                  <td className="num">{(r as number).toFixed(2)}</td>
                  <td className="num">{((((m as number) - (r as number)) / (r as number)) * 100).toFixed(0)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-ink-400">Not enough standing frames to estimate proportions.</p>
        )}
        <p className="text-sm leading-relaxed text-ink-200">{an.interpretation}</p>
        <p className="text-xs text-ink-400">
          Ratios come from MediaPipe 3D world landmarks in standing frames. The reference is Drillis &amp; Contini (1966) segment lengths as fractions of stature (thigh 0.245 H,
          shank 0.246 H, hip-to-shoulder 0.288 H).
        </p>
      </div>
      <div className="card card-pad space-y-4">
        <div className="font-semibold text-white">Predicted segment lengths for {an.statureCm} cm</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Thigh', an.predicted.thighCm],
            ['Shank', an.predicted.shankCm],
            ['Hip → shoulder', an.predicted.trunkCm],
            ['Leg (for m/s scaling)', an.predicted.legCm],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-xs text-ink-400">{k}</div>
              <div className="num text-xl font-semibold text-white">{(v as number).toFixed(1)} cm</div>
            </div>
          ))}
        </div>
        <Callout tone="info" title="Why this matters for the design">
          Anthropometric variation is the reason FormDrift uses personal baselines. A long-femur lifter must lean further forward to keep the centre of mass over mid-foot, so a
          fixed trunk-angle limit would flag correct technique (a false alarm). A short-femur lifter could deteriorate a lot before crossing it (a miss). Indian anthropometric data
          (e.g. Chakrabarti, 1997) show wide spread in segment proportions within the user population.
        </Callout>
      </div>
    </div>
  )
}

export function FeedbackLog({ a }: { a: SessionAnalysis }) {
  const [settings, set] = useSettings()
  const mode = FEEDBACK_MODES.find((m) => m.id === a.settings.feedbackMode)!
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="card overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h4 className="font-semibold text-white">Cue timeline</h4>
          <p className="text-xs text-ink-400">Every candidate cue the engine considered, including the ones it held back to avoid overload.</p>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {a.cues.length === 0 && <li className="px-5 py-4 text-sm text-ink-400">No cues were needed in this set.</li>}
          {a.cues.map((c) => (
            <li key={`${c.rep}-${c.text}`} className="flex items-center gap-4 px-5 py-3">
              <span className="num w-14 text-xs text-ink-400">{c.t.toFixed(1)} s</span>
              <span className="num w-12 text-xs text-ink-300">rep {c.rep}</span>
              <span
                className="rounded-lg px-2.5 py-1 text-sm font-bold uppercase"
                style={{
                  background: c.delivered ? (c.level === 'info' ? '#818cf833' : `${LEVEL_COLOR[c.level === 'major' ? 'major' : 'minor']}26`) : 'rgba(255,255,255,0.04)',
                  color: c.delivered ? (c.level === 'info' ? '#a5b4fc' : LEVEL_COLOR[c.level === 'major' ? 'major' : 'minor']) : '#66748c',
                  textDecoration: c.delivered ? 'none' : 'line-through',
                }}
              >
                {c.text}
              </span>
              <span className="flex-1 text-xs text-ink-400">{c.delivered ? `Delivered via ${c.channels.join(' + ')}` : c.reason}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-4">
        <div className="card card-pad space-y-3">
          <h4 className="font-semibold text-white">Feedback mode</h4>
          <div className="grid grid-cols-2 gap-1.5">
            {FEEDBACK_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => set({ feedbackMode: m.id })}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold ${settings.feedbackMode === m.id ? 'border-brand-400/60 bg-brand-400/15 text-brand-200' : 'border-white/10 text-ink-300'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-400">{mode.note}</p>
        </div>
        <div className="card card-pad text-sm text-ink-300">
          <div className="mb-2 font-semibold text-white">Cue rules (information handling)</div>
          <ul className="list-disc space-y-1 pl-4 text-xs">
            <li>At most one cue per rep, delivered at the top (after the effort, never at the bottom).</li>
            <li>Priority: safety &gt; major technique &gt; minor technique &gt; fatigue &gt; consistency.</li>
            <li>{CUE_COOLDOWN_S} s minimum between cues.</li>
            <li>
              The same cue is not repeated more than {MAX_REPEATS}× in a row ({MAX_REPEATS + 1}× if major), to avoid habituation.
            </li>
            <li>Escalates once to “End the set” when two or more measures are severely off for two reps in a row.</li>
            <li>Cues use 2–3 words and external focus, which suits motor learning.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export function ValidationPanel({ a, track }: { a: SessionAnalysis; track: PoseTrack }) {
  if (!track.groundTruth) return null
  const ev = evaluateAgainstTruth(a, track.groundTruth)
  return (
    <div className="space-y-5">
      <Callout tone="honest" title="Simulated set with known ground truth">
        This set was generated by a kinematic model with fatigue faults that grow gradually from rep 4 and become large from rep 6. Below, FormDrift's measurements are compared
        with the true values of the noise-free model. This functional evaluation of the measurement pipeline is only possible with synthetic data.
      </Callout>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reps detected" value={`${ev.repsDetected} / ${ev.repsTrue}`} color={ev.repsDetected === ev.repsTrue ? LEVEL_COLOR.ok : LEVEL_COLOR.minor} />
        <Stat label="Flag precision" value={`${(ev.overall.precision * 100).toFixed(0)} %`} sub="flags that were real" />
        <Stat label="Flag recall" value={`${(ev.overall.recall * 100).toFixed(0)} %`} sub="real drifts caught" />
        <Stat label="Accuracy" value={`${(ev.overall.accuracy * 100).toFixed(0)} %`} sub="all rep × metric decisions" />
      </div>
      <div className="card overflow-x-auto">
        <table className="table-hf">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Mean abs. error</th>
              <th>TP</th>
              <th>FP</th>
              <th>FN</th>
              <th>TN</th>
              <th>Level agreement</th>
            </tr>
          </thead>
          <tbody>
            {ev.metrics.map((m) => (
              <tr key={m.metric}>
                <td className="text-white">{METRICS[m.metric].label}</td>
                <td className="num">
                  {m.mae.toFixed(METRICS[m.metric].decimals + 1)} {METRICS[m.metric].unit}
                </td>
                <td className="num text-ok">{m.tp}</td>
                <td className="num text-major">{m.fp}</td>
                <td className="num text-minor">{m.fn}</td>
                <td className="num">{m.tn}</td>
                <td className="num">{(m.levelAgreement * 100).toFixed(0)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-hf">
          <thead>
            <tr>
              <th>Rep</th>
              {ev.metrics.map((m) => (
                <th key={m.metric}>{METRICS[m.metric].label}: truth → detected</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ev.metrics[0]?.rows.map((row, i) => (
              <tr key={row.rep}>
                <td className="num text-white">{row.rep}</td>
                {ev.metrics.map((m) => {
                  const rr = m.rows[i]
                  return (
                    <td key={m.metric}>
                      <div className="flex items-center gap-1.5">
                        <LevelChip level={rr.gtLevel} small /> <span className="text-ink-500">→</span> <LevelChip level={rr.detectedLevel} small />
                      </div>
                      <div className="num mt-0.5 text-[11px] text-ink-400">
                        {rr.gtValue.toFixed(METRICS[m.metric].decimals + 1)} vs {rr.measured.toFixed(METRICS[m.metric].decimals + 1)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DataPanel({ a, track, name }: { a: SessionAnalysis; track: PoseTrack; name: string }) {
  const csv = () => {
    const ids = a.available
    const header = [
      'rep',
      'baseline',
      'start_s',
      'end_s',
      'score',
      ...ids.flatMap((id) => [id, `${id}_dev`, `${id}_level`]),
      'knee_min_deg',
      'descent_s',
      'pause_s',
      'ascent_s',
      'l5s1_N',
    ]
    const rows = a.reps.map((r) => [
      r.index,
      r.isBaseline ? 1 : 0,
      r.start.toFixed(2),
      r.end.toFixed(2),
      r.score,
      ...ids.flatMap((id) => [r.metrics[id]?.toFixed(3) ?? '', r.deviations[id]?.dev.toFixed(2) ?? '', r.deviations[id]?.level ?? '']),
      r.metrics.kneeMin?.toFixed(1) ?? '',
      r.metrics.descentS.toFixed(3),
      r.metrics.pauseS.toFixed(3),
      r.metrics.ascentS.toFixed(3),
      r.lumbar?.compressionN.toFixed(0) ?? '',
    ])
    downloadFile(`${name}-reps.csv`, [header, ...rows].map((r) => r.join(',')).join('\n'), 'text/csv')
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card card-pad space-y-3">
        <h4 className="font-semibold text-white">Export</h4>
        <p className="text-sm text-ink-300">Download per-rep results for your report or statistical analysis, or the raw landmark track to reproduce the analysis.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={csv}>
            <Download className="h-4 w-4" /> Per-rep CSV
          </button>
          <button className="btn-ghost" onClick={() => downloadFile(`${name}-analysis.json`, JSON.stringify({ ...a, timeline: undefined }, null, 2), 'application/json')}>
            <Download className="h-4 w-4" /> Analysis JSON
          </button>
          <button className="btn-ghost" onClick={() => downloadFile(`${name}-landmarks.json`, JSON.stringify(track), 'application/json')}>
            <Download className="h-4 w-4" /> Landmark track
          </button>
        </div>
      </div>
      <div className="card card-pad space-y-2 text-sm">
        <h4 className="font-semibold text-white">Provenance</h4>
        <div className="grid grid-cols-[140px_1fr] gap-y-1.5 text-ink-300">
          <span className="text-ink-400">Source</span>
          <span>{track.source === 'synthetic' ? 'Synthetic kinematic model' : 'Video, MediaPipe Pose Landmarker'}</span>
          <span className="text-ink-400">Model</span>
          <span>{track.model}</span>
          <span className="text-ink-400">Frames</span>
          <span className="num">
            {track.frames.length} at {track.sampleFps} fps ({track.duration.toFixed(1)} s)
          </span>
          <span className="text-ink-400">Resolution</span>
          <span className="num">
            {track.width}×{track.height}
          </span>
          <span className="text-ink-400">Baseline reps</span>
          <span className="num">{a.baselineCount}</span>
        </div>
        <div className="flex items-start gap-2 pt-2 text-xs text-ink-400">
          <Dumbbell className="mt-0.5 h-3.5 w-3.5" /> All processing ran in this browser; nothing was uploaded.
        </div>
      </div>
    </div>
  )
}

export function AwarenessGap({ perceived, a }: { perceived: number | 'none' | 'unsure'; a: SessionAnalysis }) {
  const detected = a.driftOnsetRep
  let title = ''
  let body = ''
  let tone: 'info' | 'warn' | 'honest' = 'info'
  if (perceived === 'unsure') {
    title = 'You were unsure. That is the perception gap.'
    body = detected
      ? `FormDrift measured drift from rep ${detected}. Without objective feedback, small changes are hard to judge by eye or by feel.`
      : 'FormDrift measured no drift in this set.'
  } else if (perceived === 'none') {
    if (detected) {
      tone = 'warn'
      title = `You saw no change, but drift began at rep ${detected}.`
      body = 'This is exactly the human issue FormDrift addresses: gradual deterioration is easy to miss.'
    } else {
      title = 'You saw no change, and FormDrift agrees.'
      body = 'Technique stayed within your baseline. No false alarm was raised.'
    }
  } else {
    if (!detected) {
      title = `You suspected a change at rep ${perceived}; measurements stayed within baseline.`
      body = 'Perception can also over-detect. Objective measurement helps in both directions.'
    } else {
      const gap = perceived - detected
      tone = gap > 0 ? 'warn' : 'info'
      title =
        gap === 0
          ? `Spot on: you and FormDrift both saw drift at rep ${detected}.`
          : gap > 0
            ? `You noticed ${gap} rep${gap > 1 ? 's' : ''} later than the measured onset (rep ${detected}).`
            : `You flagged rep ${perceived}, ${-gap} rep${-gap > 1 ? 's' : ''} before the measured onset (rep ${detected}).`
      body =
        gap > 0
          ? 'Reps done between the onset and when you noticed are reps trained with degraded technique.'
          : 'Good sensitivity. Objective data confirms when the change became measurable.'
    }
  }
  return (
    <Callout tone={tone} title={`Self-perception check: ${title}`}>
      <span className="flex items-start gap-2">
        {tone === 'warn' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 opacity-70" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />}
        {body}
      </span>
    </Callout>
  )
}
