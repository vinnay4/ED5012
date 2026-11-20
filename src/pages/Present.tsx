import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Ear, Eye, Maximize2, Play, Ruler, Smartphone, Sparkles, Vibrate, X } from 'lucide-react'
import { HeroCanvas } from '../components/HeroCanvas'
import { generateSyntheticTrack } from '../lib/synthetic/generator'
import { analyzeTrack, DEFAULT_SETTINGS } from '../lib/analysis/analyze'
import { evaluateAgainstTruth } from '../lib/analysis/evaluate'
import { Logo } from '../App'

function Slide({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col px-[6%] py-[5%]">
      {eyebrow && <div className="eyebrow mb-3 text-[1.1em]">{eyebrow}</div>}
      <h2 className="text-[2.6em] leading-tight font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-[3%] min-h-0 flex-1 text-[1.25em] text-ink-200">{children}</div>
    </div>
  )
}

function Box({ title, children, accent = '#3dd6ef' }: { title: ReactNode; children: ReactNode; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-[0.9em]" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
      <div className="mb-[0.3em] font-semibold text-white">{title}</div>
      <div className="text-[0.84em] leading-snug text-ink-300">{children}</div>
    </div>
  )
}

function useSimEval() {
  return useMemo(() => {
    return (['side', 'front'] as const).map((camera) => {
      const track = generateSyntheticTrack({ camera })
      const a = analyzeTrack(track, { ...DEFAULT_SETTINGS, statureCm: 175, externalLoadKg: 12 })
      return { camera, a, ev: evaluateAgainstTruth(a, track.groundTruth!) }
    })
  }, [])
}

export default function Present() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const sim = useSimEval()
  const [scale, setScale] = useState(1)

  const side = sim[0]
  const front = sim[1]

  const slides: ReactNode[] = [
    <div key="title" className="grid h-full grid-cols-[1.1fr_1fr] items-center gap-[4%] px-[6%]">
      <div>
        <div className="eyebrow mb-4 text-[1.1em]">ED5012 · Intelligent Sports</div>
        <h1 className="text-[4.2em] leading-[1.02] font-semibold tracking-tight text-white">
          Form<span className="text-brand-400">Drift</span>
        </h1>
        <p className="mt-4 text-[1.6em] leading-snug text-ink-200">Detecting exercise-technique drift that lifters cannot perceive, as an offline PWA.</p>
        <p className="mt-8 text-[1.1em] text-ink-400">Vinnay Gupta (ED22B073) · ED5012 Advanced Applications of Human Factors in Design · IIT Madras</p>
        <p className="mt-2 text-[1em] text-brand-300">formdrift.apps.grok.bot</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <HeroCanvas />
      </div>
    </div>,

    <Slide key="issue" eyebrow="The human issue" title="Late reps feel like early reps, but they are not">
      <div className="grid grid-cols-3 gap-[3%]">
        <Box title="Can’t see yourself">Without a coach or mirror, you have no external view of your own sagittal-plane form.</Box>
        <Box title="Fatigue blunts perception" accent="#fbbf24">
          Joint-position sense degrades as muscles fatigue (Proske &amp; Gandevia, 2012), which is when technique slips.
        </Box>
        <Box title="Drift is gradual" accent="#fb7185">
          Depth shrinks a few percent, the chest drops a few degrees per rep. No single rep feels wrong.
        </Box>
      </div>
      <p className="mt-[4%] text-[1.1em] text-ink-300">
        Result: unsupervised lifters train the last reps of every set with degraded technique, which wastes training stimulus and raises spinal and knee loading.
      </p>
    </Slide>,

    <Slide key="checks" eyebrow="Two mandatory checks" title="Human issue? PWA-feasible?">
      <div className="grid grid-cols-2 gap-[4%]">
        <Box title="✓ It is a human issue" accent="#34d399">
          Perception limits, fatigue-induced change in physical capability, individual anthropometric differences, and limited attention during exertion. Better sensors alone
          cannot fix it; the feedback must be designed for the human.
        </Box>
        <Box title="✓ It works as a PWA" accent="#34d399">
          MediaPipe pose estimation in WebAssembly, analysis in TypeScript, Web Speech for audio cues, Vibration API for haptics, service worker for offline use, and installable.
          No server and no hardware: video never leaves the device.
        </Box>
      </div>
    </Slide>,

    <Slide key="4w1h" eyebrow="Framework" title="4W1H">
      <div className="grid grid-cols-2 gap-[2.5%]">
        <Box title="Who · anthropometry">Recreational lifters (18–35) training alone. Wide spread in stature and femur:torso ratio, so the reference is a personal baseline.</Box>
        <Box title="When / where · biomechanics and information handling" accent="#a78bfa">
          Mid-to-late reps of a set, at home or in the gym. Phone on the floor, user mid-effort and not looking at the screen.
        </Box>
        <Box title="What · operations simulated" accent="#fbbf24">
          Depth, trunk lean, knee valgus, hip shift and concentric velocity per rep, compared with the user’s first reps.
        </Box>
        <Box title="How · solution" accent="#34d399">
          On-device pose estimation, rep segmentation, personal baseline, drift bands (15 %/30 %), one short cue per rep, and an evidence-based summary.
        </Box>
      </div>
    </Slide>,

    <Slide key="anthro" eyebrow="Level 1 · Anthropometry" title="No universal “correct” squat">
      <div className="grid grid-cols-[1.2fr_1fr] gap-[4%]">
        <ul className="list-disc space-y-[0.5em] pl-[1.2em] text-[0.95em]">
          <li>A long femur relative to the torso forces more forward lean at the same depth. Fixed angle thresholds would misjudge such users.</li>
          <li>
            FormDrift compares each rep with <b className="text-white">your own first reps</b> (median baseline), so thresholds scale with the body.
          </li>
          <li>Depth is normalised by measured leg length; velocity is scaled by stature (leg ≈ 0.491 H).</li>
          <li>The Body tab measures thigh:shank and thigh:trunk ratios from world landmarks and compares them with Drillis &amp; Contini norms.</li>
        </ul>
        <div className="grid content-start gap-[0.6em]">
          <Box
            title={
              <span className="flex items-center gap-2">
                <Ruler className="h-[1em] w-[1em]" /> Drillis &amp; Contini
              </span>
            }
          >
            thigh 0.245 H · shank 0.246 H · trunk 0.288 H
          </Box>
          <Box title="Filming guidance from body size" accent="#a78bfa">
            The camera at hip height, 2–3 m away keeps a 1.5–1.9 m person fully in a phone frame.
          </Box>
        </div>
      </div>
    </Slide>,

    <Slide key="biomech" eyebrow="Level 2 · Biomechanics" title="What is measured, and from which view">
      <div className="grid grid-cols-3 gap-[2%] text-[0.92em]">
        <Box title="Side view">Depth (% leg length) · trunk lean (°) · tempo · concentric velocity · L5/S1 compression</Box>
        <Box title="Front view" accent="#a78bfa">
          Knee tracking (knee/ankle separation) · lateral hip shift · depth · velocity
        </Box>
        <Box title="Oblique view" accent="#fbbf24">
          Depth · tempo · velocity · consistency only. Others are shown as <i>not measurable</i>.
        </Box>
      </div>
      <div className="mt-[3%] grid grid-cols-2 gap-[3%] text-[0.92em]">
        <Box title="Drift bands" accent="#fb7185">
          Minor ≥ 15 %, major ≥ 30 % from baseline (angles: 8°/15°). Velocity loss ≥ 20 % indicates fatigue (González-Badillo &amp; Sánchez-Medina, 2010).
        </Box>
        <Box title="Static L5/S1 model (Chaffin)" accent="#34d399">
          Trunk lean, body mass and load give the lumbar moment and compression, compared with the NIOSH 3.4 kN action limit, so extra lean is shown as extra load.
        </Box>
      </div>
    </Slide>,

    <Slide key="info" eyebrow="Level 3 · Information handling" title="Feedback for a body under load">
      <div className="grid grid-cols-4 gap-[2%] text-[0.92em]">
        <Box
          title={
            <span className="flex items-center gap-2">
              <Ear className="h-[1em] w-[1em]" /> Audio
            </span>
          }
        >
          Eyes stay free (multiple resources, Wickens). 1–2 word cues.
        </Box>
        <Box
          title={
            <span className="flex items-center gap-2">
              <Eye className="h-[1em] w-[1em]" /> Visual
            </span>
          }
          accent="#a78bfa"
        >
          Large colour ring readable from 3 m. No numbers mid-set.
        </Box>
        <Box
          title={
            <span className="flex items-center gap-2">
              <Vibrate className="h-[1em] w-[1em]" /> Haptic
            </span>
          }
          accent="#fbbf24"
        >
          For loud gyms; patterns encode severity.
        </Box>
        <Box
          title={
            <span className="flex items-center gap-2">
              <Smartphone className="h-[1em] w-[1em]" /> Silent
            </span>
          }
          accent="#34d399"
        >
          Everything is deferred to the post-set summary.
        </Box>
      </div>
      <ul className="mt-[3%] list-disc space-y-[0.4em] pl-[1.2em] text-[0.95em]">
        <li>At most one cue per rep, given at the top of the rep, never at the bottom where attention is fully on the lift.</li>
        <li>Priority: safety, then major, then minor, then fatigue. A 3 s cooldown and repeat limit avoid nagging (Sigrist et al., 2013).</li>
        <li>External-focus wording: “Sit deeper”, “Chest up”, “Knees out” (Wulf, 2013). Escalates once to “End the set”.</li>
      </ul>
    </Slide>,

    <Slide key="demo" eyebrow="Live demonstration" title="Demo">
      <div className="grid grid-cols-3 gap-[3%]">
        {[
          ['sim-side', 'Fatigue set · side', 'Simulated, known truth. Watch cues fire as form drifts.'],
          ['side-kettlebell-squat', 'Kettlebell squat · real', 'Real video, MediaPipe. All reps counted, no false alarms.'],
          ['oblique-barbell-back-squat', 'Barbell squat · oblique', 'Oblique view: only what this angle supports.'],
        ].map(([id, t, d]) => (
          <Link
            key={id}
            to={`/session/${id}`}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-[1em] transition hover:border-brand-400/60 hover:bg-brand-400/[0.06]"
          >
            <Play className="mb-[0.5em] h-[1.4em] w-[1.4em] text-brand-400" />
            <div className="font-semibold text-white">{t}</div>
            <div className="mt-[0.3em] text-[0.8em] text-ink-300">{d}</div>
          </Link>
        ))}
      </div>
      <p className="mt-[4%] text-[0.95em] text-ink-400">Click a card to open the analysis. The browser Back button returns to this slide.</p>
    </Slide>,

    <Slide key="eval" eyebrow="Level 4 · Functional evaluation" title="Does it measure what it claims?">
      <div className="grid grid-cols-3 gap-[3%]">
        <Box title="Known-truth simulation" accent="#34d399">
          <div className="num text-[2.2em] font-semibold text-white">{((side.ev.overall.f1 + front.ev.overall.f1) / 2).toFixed(2)}</div>
          drift-flag F1 (side and front). Reps {side.ev.repsDetected}/{side.ev.repsTrue} and {front.ev.repsDetected}/{front.ev.repsTrue}.
        </Box>
        <Box title="Measurement error">
          <div className="num text-[2.2em] font-semibold text-white">{(side.ev.metrics.find((m) => m.metric === 'trunkLean')?.mae ?? 0).toFixed(1)}°</div>
          trunk-lean MAE; depth MAE {(side.ev.metrics.find((m) => m.metric === 'depth')?.mae ?? 0).toFixed(1)} pts of leg length.
        </Box>
        <Box title="Real video" accent="#a78bfa">
          <div className="num text-[2.2em] font-semibold text-white">10/10</div>
          reps counted across two licensed real clips, with zero technique false alarms on consistent lifting.
        </Box>
      </div>
      <p className="mt-[3%] text-[0.95em] text-ink-300">
        Noise sweep: F1 stays ≥ 0.9 up to 10 px of landmark jitter. All figures are computed live in the browser on the Validation page.
      </p>
    </Slide>,

    <Slide key="aes" eyebrow="Level 5 · Aesthetic and usability" title="Legible and clearly labelled">
      <div className="grid grid-cols-3 gap-[2.5%] text-[0.95em]">
        <Box title="Glanceable">Dark, high-contrast UI; one status colour (green, amber, rose) with a matching text label, so colour is never the only signal.</Box>
        <Box title="Clear labelling" accent="#a78bfa">
          Every result is labelled real, simulated or uploaded. Unmeasurable metrics say so. Low-confidence reps are marked.
        </Box>
        <Box title="Self-perception check" accent="#fbbf24">
          Before showing results, the app asks “when did your form slip?” and reveals the awareness gap.
        </Box>
      </div>
      <div className="mt-[3%] grid grid-cols-2 gap-[2.5%] text-[0.95em]">
        <Box title="Built-in study toolkit" accent="#34d399">
          SUS and raw NASA-TLX forms, a within-subjects protocol (no cue vs. audio vs. visual) and CSV export.
        </Box>
        <Box
          title={
            <span className="flex items-center gap-2">
              <Sparkles className="h-[1em] w-[1em]" /> PWA
            </span>
          }
        >
          Installable, works offline, private by default (video never uploaded), and runs on any laptop or phone.
        </Box>
      </div>
    </Slide>,

    <Slide key="limits" eyebrow="Reflection" title="Limitations and next steps">
      <div className="grid grid-cols-2 gap-[4%] text-[0.95em]">
        <div>
          <div className="mb-[0.4em] font-semibold text-white">Limitations</div>
          <ul className="list-disc space-y-[0.4em] pl-[1.2em] text-ink-300">
            <li>Single 2D camera, so metrics are restricted by view.</li>
            <li>Thresholds come from literature, not yet expert-calibrated.</li>
            <li>The simulation validates the pipeline, not fatigue realism.</li>
            <li>Squat only; post-set analysis, not live.</li>
          </ul>
        </div>
        <div>
          <div className="mb-[0.4em] font-semibold text-white">Next steps</div>
          <ul className="list-disc space-y-[0.4em] pl-[1.2em] text-ink-300">
            <li>Run the built-in user study (8–12 lifters).</li>
            <li>Live camera mode with the same cue engine.</li>
            <li>More lifts: deadlift (hinge) and lunge.</li>
            <li>Calibrate thresholds against coach ratings (Fitness-AQA).</li>
          </ul>
        </div>
      </div>
    </Slide>,

    <div key="end" className="flex h-full flex-col items-center justify-center text-center">
      <Logo />
      <h2 className="mt-6 text-[3.4em] font-semibold text-white">Thank you</h2>
      <p className="mt-2 text-[1.3em] text-ink-300">Questions?</p>
      <p className="mt-8 text-[1.1em] text-brand-300">formdrift.apps.grok.bot</p>
    </div>,
  ]

  const n = slides.length
  const idx = Math.min(n - 1, Math.max(0, Number(params.get('s') ?? 1) - 1))
  const go = useCallback((i: number) => setParams({ s: String(Math.min(n, Math.max(1, i + 1))) }, { replace: true }), [n, setParams])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        go(idx + 1)
      } else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        go(idx - 1)
      } else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(n - 1)
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen().catch(() => undefined)
      } else if (e.key === 'Escape' && !document.fullscreenElement) navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx, n, navigate])

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1280, (window.innerHeight - 56) / 720))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col bg-ink-950">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[radial-gradient(ellipse_at_top_right,rgba(61,214,239,0.08),transparent_55%)]"
          style={{ width: 1280 * scale, height: 720 * scale, fontSize: 19 * scale }}
        >
          <div key={idx} className="animate-pop h-full">
            {slides[idx]}
          </div>
          <div className="num absolute right-[2%] bottom-[3%] text-[0.85em] text-ink-500">
            {idx + 1} / {n}
          </div>
        </div>
      </div>
      <div className="no-print flex h-14 items-center justify-between px-4 text-sm text-ink-400">
        <Link to="/" className="btn-ghost !px-3 !py-1.5">
          <X className="h-4 w-4" /> Exit
        </Link>
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-brand-400' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 hidden text-xs md:inline">← → to navigate · F fullscreen</span>
          <button className="btn-ghost !px-2 !py-1.5" onClick={() => go(idx - 1)} aria-label="Previous">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button className="btn-ghost !px-2 !py-1.5" onClick={() => go(idx + 1)} aria-label="Next">
            <ArrowRight className="h-4 w-4" />
          </button>
          <button className="btn-ghost !px-2 !py-1.5" onClick={() => void document.documentElement.requestFullscreen().catch(() => undefined)} aria-label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
