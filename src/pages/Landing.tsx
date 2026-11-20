import { Link } from 'react-router-dom'
import { ArrowRight, Brain, Eye, HeartHandshake, Layers, Lock, Ruler, ScanLine, Smartphone, Sparkles, Upload, UserRound, Zap } from 'lucide-react'
import { HeroCanvas } from '../components/HeroCanvas'
import { SectionTitle } from '../components/ui'

const LADDER = [
  {
    level: 'Anthropometry',
    user: 'Static physical requirement',
    work: 'Static physical dimensions',
    icon: Ruler,
    how: 'Your limb proportions decide how upright you can squat. Instead of a generic “ideal angle”, FormDrift compares you to your own first reps, and it scales speed to metres using your stature.',
  },
  {
    level: 'Biomechanics',
    user: 'Dynamic physical requirement',
    work: 'Dynamic',
    icon: Zap,
    how: 'Joint kinematics per rep: hip depth, trunk inclination, knee tracking, lateral hip shift and concentric velocity, plus a static L5/S1 load estimate from trunk lean.',
  },
  {
    level: 'Information handling',
    user: 'Cognitive utility',
    work: 'Operability',
    icon: Brain,
    how: 'One cue of 2–3 words, only at the top of a rep, with a 3 s cooldown and a repeat limit. Safety comes before depth, and depth before fatigue. Choose audio, visual, haptic or silent.',
  },
  {
    level: 'Functional evaluation',
    user: 'Effective needs',
    work: 'Utility',
    icon: ScanLine,
    how: 'Rep counting and drift flags are checked against ground truth on simulated sets and against manual counts on real video. Precision, recall and measurement error are reported.',
  },
  {
    level: 'Aesthetic evaluation',
    user: 'Affective needs',
    work: 'Art',
    icon: Sparkles,
    how: 'A calm, glanceable interface with one colour ring and one word during the set, and the detail saved for afterwards. Built-in SUS and NASA-TLX questionnaires measure how it feels.',
  },
]

export default function Landing() {
  return (
    <div>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <div className="eyebrow mb-4">ED5012 · Intelligent Sports · Human Factors</div>
          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your form drifts
            <br />
            before you notice.
            <br />
            <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">FormDrift notices.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
            People who train without a coach rarely see their technique slip as fatigue builds. FormDrift analyses an exercise video on your device, learns <em>your</em> baseline
            from your first reps, and shows exactly when depth, trunk angle, knee tracking or speed start to drift, with one calm cue at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/session/sim-side" className="btn-primary !px-5 !py-3 text-base">
              Open the one-click demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/analyze" className="btn-ghost !px-5 !py-3 text-base">
              <Upload className="h-4 w-4" /> Analyse a video
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-300">
            <span className="inline-flex items-center gap-2">
              <Eye className="h-4 w-4 text-brand-400" /> No camera or wearable needed
            </span>
            <span className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-400" /> On-device, private
            </span>
            <span className="inline-flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-brand-400" /> Installable PWA, works offline
            </span>
          </div>
        </div>
        <HeroCanvas />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionTitle eyebrow="The human issue" title="Unsupervised training hides a perception problem">
          This is a human-capability issue, not a hardware gap: the lifter cannot sense their own deterioration, and generic rules do not fit their body.
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Eye,
              title: 'You cannot see yourself',
              text: 'Mirrors only show the frontal plane and pull your head out of neutral. Depth and trunk angle are judged by feel, and joint-position sense becomes less accurate as muscles fatigue.',
            },
            {
              icon: Layers,
              title: 'Form decays within a set',
              text: 'Late in a set, lifters typically cut depth, lean further forward, let the knees cave and slow down. The change is gradual, so it goes unnoticed rep by rep.',
            },
            {
              icon: UserRound,
              title: 'One size does not fit all',
              text: 'Femur, shin and torso proportions and ankle mobility change what a “good” squat looks like. Fixed angle thresholds misjudge individuals, so personal baselines are needed.',
            },
          ].map((c) => (
            <div key={c.title} className="card card-pad">
              <c.icon className="h-6 w-6 text-brand-400" />
              <h3 className="mt-4 text-lg font-semibold text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionTitle eyebrow="How it works" title="From video to an actionable answer in four steps" />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['01', 'Load a set', 'Upload a squat video from any device, or pick a ready-made demo clip. No live camera is required.'],
            ['02', 'Track the body', 'MediaPipe Pose finds 33 body landmarks in every frame, entirely in your browser.'],
            ['03', 'Learn your baseline', 'Reps are segmented automatically, and your first reps become your personal reference.'],
            ['04', 'Detect drift and coach', 'Each later rep is compared with that reference: minor drift at 15 %, major at 30 %, one cue per rep.'],
          ].map(([n, title, text]) => (
            <div key={n} className="card card-pad relative overflow-hidden">
              <div className="num absolute -top-3 -right-1 text-7xl font-bold text-white/[0.04]">{n}</div>
              <div className="num text-sm font-semibold text-brand-400">{n}</div>
              <h3 className="mt-2 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SectionTitle eyebrow="Human factors evaluation ladder" title="Every level of the user–work characteristics graph, addressed">
          Following the ED5012 framework, each user characteristic is paired with a work characteristic and an evaluation type.
        </SectionTitle>
        <div className="grid gap-3">
          {LADDER.map((l, i) => (
            <div key={l.level} className="card flex flex-col gap-4 p-5 md:flex-row md:items-center">
              <div className="flex items-center gap-4 md:w-72">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-400/10 text-brand-300">
                  <l.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="num text-xs text-ink-400">Level {i + 1}</div>
                  <div className="font-semibold text-white">{l.level}</div>
                </div>
              </div>
              <div className="text-xs text-ink-400 md:w-64">
                <div>
                  <span className="text-ink-300">User:</span> {l.user}
                </div>
                <div>
                  <span className="text-ink-300">Work:</span> {l.work}
                </div>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-ink-200">{l.how}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="card card-pad grid gap-8 md:grid-cols-2">
          <div>
            <div className="eyebrow mb-2">Technical honesty</div>
            <h3 className="text-2xl font-semibold text-white">What is measured, and what is not</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Real clips are analysed from MediaPipe landmarks. Simulated clips come from a kinematic model with known injected faults and are always labelled. A metric is only
              reported when the camera view supports it; otherwise FormDrift says “not measurable” instead of guessing.
            </p>
          </div>
          <ul className="grid gap-2 text-sm">
            {[
              ['Side view', 'Depth, trunk lean, tempo, velocity, consistency, L5/S1 load estimate'],
              ['Front view', 'Depth, knee tracking (valgus), lateral hip shift, tempo, velocity'],
              ['Oblique view', 'Depth, tempo, velocity, consistency only'],
              ['Never claimed', 'Injury prediction, muscle activation, absolute “correct” form'],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <span className="w-28 shrink-0 font-semibold text-white">{k}</span>
                <span className="text-ink-300">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-brand-400/20 bg-gradient-to-br from-brand-500/15 via-ink-900 to-violet-500/10 p-8 sm:p-12">
          <HeartHandshake className="h-8 w-8 text-brand-300" />
          <h3 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white">See a full fatigue set analysed in one click.</h3>
          <p className="mt-3 max-w-2xl text-ink-300">Four demo sets are preloaded: two real videos and two simulated sets with ground truth. No setup, no hardware.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/analyze" className="btn-primary !px-5 !py-3">
              Browse demo sets <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/method" className="btn-ghost !px-5 !py-3">
              Read the human-factors rationale
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
