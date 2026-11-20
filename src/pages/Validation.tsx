import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Play } from 'lucide-react'
import { generateSyntheticTrack } from '../lib/synthetic/generator'
import { analyzeTrack, DEFAULT_SETTINGS, type SessionAnalysis } from '../lib/analysis/analyze'
import { evaluateAgainstTruth, metricLabel, type Evaluation } from '../lib/analysis/evaluate'
import { formatMetric, METRICS } from '../lib/analysis/metrics'
import { DEMO_CLIPS, loadClipTrack } from '../lib/demo/library'
import { Callout, SectionTitle, SourceBadge, Stat } from '../components/ui'
import { LineChart } from '../components/charts'

const SIM_SETTINGS = { ...DEFAULT_SETTINGS, statureCm: 175, externalLoadKg: 12 }
const NOISE = [0, 2, 4, 6, 8, 10]
const SEEDS = [1, 2, 3]

const pct = (v: number) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : '—')

function EvalCard({ camera, ev }: { camera: string; ev: Evaluation }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-5 py-3">
        <div className="font-semibold text-white capitalize">{camera} camera</div>
        <div className="num text-sm text-ink-300">
          reps {ev.repsDetected}/{ev.repsTrue} · precision {pct(ev.overall.precision)} · recall {pct(ev.overall.recall)} · F1 {ev.overall.f1.toFixed(2)}
        </div>
      </div>
      <div className="overflow-x-auto">
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
                <td className="font-medium text-white">{metricLabel(m.metric)}</td>
                <td className="num">{formatMetric(m.metric, m.mae, 1)}</td>
                <td className="num text-ok">{m.tp}</td>
                <td className="num text-major">{m.fp}</td>
                <td className="num text-minor">{m.fn}</td>
                <td className="num">{m.tn}</td>
                <td className="num">{pct(m.levelAgreement)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface SweepPoint {
  noise: number
  side: { f1: number; reps: number }
  front: { f1: number; reps: number }
}

export default function Validation() {
  const sim = useMemo(
    () =>
      (['side', 'front'] as const).map((camera) => {
        const track = generateSyntheticTrack({ camera })
        const a = analyzeTrack(track, SIM_SETTINGS)
        return { camera, a, ev: evaluateAgainstTruth(a, track.groundTruth!) }
      }),
    [],
  )
  const [real, setReal] = useState<{ id: string; title: string; expected: number; a: SessionAnalysis }[]>([])
  const [sweep, setSweep] = useState<SweepPoint[]>([])
  const [sweeping, setSweeping] = useState(false)

  useEffect(() => {
    let live = true
    Promise.all(
      DEMO_CLIPS.filter((c) => c.kind === 'real').map(async (c) => {
        const tr = await loadClipTrack(c)
        return { id: c.id, title: c.title, expected: c.expectedReps, a: analyzeTrack(tr, { ...DEFAULT_SETTINGS, externalLoadKg: c.loadKg }) }
      }),
    )
      .then((r) => live && setReal(r))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  const runSweep = async () => {
    setSweeping(true)
    setSweep([])
    const out: SweepPoint[] = []
    for (const noise of NOISE) {
      const point: SweepPoint = { noise, side: { f1: 0, reps: 0 }, front: { f1: 0, reps: 0 } }
      for (const camera of ['side', 'front'] as const) {
        for (const seed of SEEDS) {
          await new Promise((r) => setTimeout(r, 0))
          const track = generateSyntheticTrack({ camera, noisePx: noise, seed })
          const ev = evaluateAgainstTruth(analyzeTrack(track, SIM_SETTINGS), track.groundTruth!)
          point[camera].f1 += ev.overall.f1 / SEEDS.length
          point[camera].reps += (ev.repsDetected === ev.repsTrue && ev.repsMatched === ev.repsTrue ? 1 : 0) / SEEDS.length
        }
      }
      out.push(point)
      setSweep([...out])
    }
    setSweeping(false)
  }

  const allSim = sim.reduce((acc, s) => acc + s.ev.overall.f1, 0) / sim.length
  const maeOf = (camera: string, metric: string) => sim.find((s) => s.camera === camera)?.ev.metrics.find((m) => m.metric === metric)?.mae ?? NaN

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
      <SectionTitle eyebrow="Functional evaluation" title="Does it measure what it claims?">
        Three complementary checks, all computed live in this browser when the page loads. The numbers are not typed in by hand.
      </SectionTitle>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Drift-flag F1 (simulated)" value={allSim.toFixed(2)} sub="mean of side + front sets" color="#34d399" />
        <Stat label="Depth error" value={formatMetric('depth', maeOf('side', 'depth'), 1)} sub="mean absolute, side camera" />
        <Stat label="Trunk-lean error" value={formatMetric('trunkLean', maeOf('side', 'trunkLean'), 1)} sub="mean absolute, side camera" />
        <Stat
          label="Real-video rep count"
          value={real.length ? `${real.reduce((s, r) => s + Math.min(r.a.reps.length, r.expected), 0)}/${real.reduce((s, r) => s + r.expected, 0)}` : '…'}
          sub="against manual count"
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-white">1. Known-truth test with simulated sets</h3>
          <SourceBadge kind="synthetic" />
        </div>
        <p className="max-w-3xl text-sm text-ink-300">
          A kinematic mannequin performs 10 squats with fatigue faults that grow gradually from rep 4 and become large from rep 6. True values come from the noise-free 3D model;
          the analyser only sees noisy 2D landmarks, exactly like MediaPipe output. A flag is correct when the analyser’s level (ok vs. drift) matches the level the true values
          deserve, using the same baseline rule.
        </p>
        <div className="grid gap-4">
          {sim.map((s) => (
            <EvalCard key={s.camera} camera={s.camera} ev={s.ev} />
          ))}
        </div>
        <div className="flex gap-2">
          <Link to="/session/sim-side" className="btn-ghost">
            Open side set
          </Link>
          <Link to="/session/sim-front" className="btn-ghost">
            Open front set
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-white">2. Real video: rep counting and false alarms</h3>
          <SourceBadge kind="real" />
        </div>
        <p className="max-w-3xl text-sm text-ink-300">
          Both licensed clips show an experienced lifter with consistent technique, so a trustworthy analyser should count every rep and raise no technique alarms. This is a
          specificity check; drift detection on real fatigue sets still needs a user study (see Study).
        </p>
        <div className="card overflow-x-auto">
          <table className="table-hf">
            <thead>
              <tr>
                <th>Clip</th>
                <th>View detected</th>
                <th>Manual count</th>
                <th>Detected</th>
                <th>Technique alarms</th>
                <th>Mean score</th>
                <th>Pose detected</th>
              </tr>
            </thead>
            <tbody>
              {real.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-ink-400">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading cached landmarks…
                  </td>
                </tr>
              )}
              {real.map((r) => {
                const alarms = r.a.issues.filter((i) => METRICS[i.metric].kind === 'technique' || METRICS[i.metric].kind === 'safety').length
                return (
                  <tr key={r.id}>
                    <td className="font-medium text-white">
                      <Link className="hover:text-brand-300" to={`/session/${r.id}`}>
                        {r.title}
                      </Link>
                    </td>
                    <td className="capitalize">{r.a.view.type}</td>
                    <td className="num">{r.expected}</td>
                    <td className={`num ${r.a.reps.length === r.expected ? 'text-ok' : 'text-major'}`}>{r.a.reps.length}</td>
                    <td className={`num ${alarms === 0 ? 'text-ok' : 'text-minor'}`}>{alarms}</td>
                    <td className="num">{Math.round(r.a.summary.meanScore)}</td>
                    <td className="num">{Math.round(r.a.quality.detectedPct)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-white">3. Robustness to landmark noise</h3>
        <p className="max-w-3xl text-sm text-ink-300">
          Pose estimators jitter. This sweep adds increasing Gaussian noise (in pixels, on a 640×480 frame) to the simulated landmarks and reruns detection over {SEEDS.length}{' '}
          random seeds per level. Typical MediaPipe jitter on good video is about 2–4 px.
        </p>
        <div className="card card-pad">
          {sweep.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <button className="btn-primary" onClick={() => void runSweep()} disabled={sweeping}>
                {sweeping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run noise sweep ({NOISE.length * SEEDS.length * 2} analyses)
              </button>
              <span className="text-xs text-ink-400">Takes a few seconds; runs entirely in your browser.</span>
            </div>
          ) : (
            <>
              <LineChart
                xLabels={sweep.map((p) => `${p.noise} px`)}
                yMin={0.5}
                yMax={1}
                fmt={(v) => v.toFixed(2)}
                series={[
                  { name: 'F1 · side', color: '#3dd6ef', values: sweep.map((p) => p.side.f1) },
                  { name: 'F1 · front', color: '#a78bfa', values: sweep.map((p) => p.front.f1) },
                  { name: 'Exact rep count', color: '#34d399', values: sweep.map((p) => (p.side.reps + p.front.reps) / 2) },
                ]}
              />
              {sweeping && (
                <div className="mt-2 flex items-center gap-2 text-xs text-ink-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> computing {sweep.length}/{NOISE.length} noise levels…
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Callout tone="honest" title="What this does and does not show">
        The simulated test verifies that the measurement and decision pipeline is correct and robust. It does not prove that real fatigue looks like the simulated pattern, or that
        the thresholds match expert judgement. Those claims need the user study protocol on the Study page.
      </Callout>
    </div>
  )
}
