import { CheckCircle2 } from 'lucide-react'
import { METRICS, METRIC_ORDER } from '../lib/analysis/metrics'
import { DEMO_CLIPS } from '../lib/demo/library'
import { SectionTitle } from '../components/ui'

const W4H1 = [
  {
    q: 'Who is facing the issue?',
    a: 'Recreational and intermediate gym-goers (about 18–35) who train alone or follow online programmes, without continuous supervision. They differ widely in stature, segment proportions (femur:torso), ankle and hip mobility, and training experience.',
    hf: 'Anthropometry: static dimensions and individual differences mean a personal baseline is needed rather than population cut-offs.',
  },
  {
    q: 'When and where does it happen?',
    a: 'In the mid-to-late reps of a working set, when local muscular fatigue builds, at home or in a gym. The phone is propped on a floor or bench, the user is mid-effort, attention is on the lift, and the screen is often out of view.',
    hf: 'Biomechanics (fatigue-driven kinematic change), information handling (attention and workload during effort), plus functional and aesthetic evaluation in a real context of use.',
  },
  {
    q: 'What is the issue?',
    a: 'Technique drift: reduced depth, more forward trunk lean, knees collapsing inward, lateral hip shift and slowing concentric speed. The lifter does not perceive it because proprioception worsens with fatigue and the body cannot be seen from outside.',
    hf: 'Operations to simulate and measure: joint angles, segment geometry, timing and velocity per rep, compared with the user’s own reference.',
  },
  {
    q: 'How do we solve it?',
    a: 'FormDrift: a PWA that extracts pose from video on the device, segments reps, builds a personal baseline from the first reps, flags drift (minor ≥15 %, major ≥30 %) and gives one low-workload cue per rep, followed by an evidence-based post-set summary.',
    hf: 'Covers all five evaluation levels: anthropometry, biomechanics, information handling, functional and aesthetic.',
  },
]

const REFERENCES = [
  'Chaffin, D. B., Andersson, G. B. J., & Martin, B. J. (1999). Occupational Biomechanics (3rd ed.). Wiley.',
  'Panjabi, M. M., & White, A. A. (2000). Biomechanics in the Musculoskeletal System. Churchill Livingstone.',
  'Sanders, M. S., & McCormick, E. J. (1993). Human Factors in Engineering and Design (7th ed.). McGraw-Hill.',
  'Winter, D. A. (2009). Biomechanics and Motor Control of Human Movement (4th ed.). Wiley. (Drillis & Contini segment proportions; de Leva 1996 inertial parameters.)',
  'Chakrabarti, D. (1997). Indian Anthropometric Dimensions for Ergonomic Design Practice. National Institute of Design.',
  'Wickens, C. D. (2002). Multiple resources and performance prediction. Theoretical Issues in Ergonomics Science, 3(2), 159–177.',
  'Proske, U., & Gandevia, S. C. (2012). The proprioceptive senses: their roles in signaling body shape, body position and movement, and muscle force. Physiological Reviews, 92(4), 1651–1697.',
  'Sigrist, R., Rauter, G., Riener, R., & Wolf, P. (2013). Augmented visual, auditory, haptic, and multimodal feedback in motor learning: a review. Psychonomic Bulletin & Review, 20(1), 21–53.',
  'Wulf, G. (2013). Attentional focus and motor learning: a review of 15 years. International Review of Sport and Exercise Psychology, 6(1), 77–104.',
  'González-Badillo, J. J., & Sánchez-Medina, L. (2010). Movement velocity as a measure of loading intensity in resistance training. International Journal of Sports Medicine, 31(5), 347–352.',
  'Pareja-Blanco, F., et al. (2017). Effects of velocity loss during resistance training on athletic performance, strength gains and muscle adaptations. Scandinavian Journal of Medicine & Science in Sports, 27(7), 724–735.',
  'Noyes, F. R., Barber-Westin, S. D., Fleckenstein, C., Walsh, C., & West, J. (2005). The drop-jump screening test: difference in lower limb control by gender and effect of neuromuscular training in female athletes. American Journal of Sports Medicine, 33(2), 197–207.',
  'Myer, G. D., Kushner, A. M., et al. (2014). The back squat: a proposed assessment of functional deficits and technical factors that limit performance. Strength and Conditioning Journal, 36(6), 4–27.',
  'Parmar, P., & Morris, B. (2022). Domain knowledge-informed self-supervised representations for workout form assessment (Fitness-AQA). ECCV 2022.',
  'Bazarevsky, V., et al. (2020). BlazePose: On-device real-time body pose tracking. CVPR Workshop on Computer Vision for AR/VR. (MediaPipe Pose Landmarker.)',
  'Brooke, J. (1996). SUS: a “quick and dirty” usability scale. In Usability Evaluation in Industry. Taylor & Francis.',
  'Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX: results of empirical and theoretical research. Advances in Psychology, 52, 139–183.',
  'Waters, T. R., Putz-Anderson, V., Garg, A., & Fine, L. J. (1993). Revised NIOSH equation for the design and evaluation of manual lifting tasks. Ergonomics, 36(7), 749–776.',
]

const REPOS = [
  [
    'TechnIQ (younis-y/techniq-form-coach)',
    'MIT',
    'Ideas adapted: per-rep scoring from a phase state machine, an R²-gated least-squares trend on rep scores, and fault + corrective-drill presentation. Rewritten in TypeScript for offline video analysis.',
  ],
  ['RehabFlow (Tashbhilare/RehabFlow)', 'No licence', 'Concept only (no code used): personal baseline from the first reps; minor/major drift bands at 15 %/30 %.'],
  ['wwm (pan1624/wwm)', 'No licence', 'Concept only (no code used): compare each rep with the user’s own template using dynamic time warping.'],
  ['FormGuard (AmjadShakhshir/gaurdform)', 'No licence', 'Concept only (no code used): Vite + React + MediaPipe Tasks + vite-plugin-pwa architecture and throttled cues.'],
  ['Fitness-AQA (ParitoshParmar/Fitness-AQA)', 'Research, non-commercial', 'Literature support for the squat fault taxonomy (no data or code used).'],
  ['MediaPipe Tasks Vision (Google)', 'Apache-2.0', 'Pose Landmarker model and WASM runtime, used as a dependency and self-hosted for offline use.'],
]

export default function Method() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-10 sm:px-6">
      <section>
        <SectionTitle eyebrow="Problem framing" title="A human issue that a PWA can address">
          The two mandatory ED5012 checks, answered.
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card card-pad">
            <div className="flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="h-5 w-5 text-ok" /> Check 1: Is it a human issue? Yes.
            </div>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-300">
              <li>
                <b className="text-ink-100">Perception limits:</b> people cannot see their own sagittal-plane form, and joint-position sense worsens with fatigue (Proske &amp;
                Gandevia, 2012).
              </li>
              <li>
                <b className="text-ink-100">Physical capability:</b> local muscular fatigue changes movement kinematics within a set.
              </li>
              <li>
                <b className="text-ink-100">Individual differences:</b> anthropometry and mobility make a single “correct” form invalid across people.
              </li>
              <li>
                <b className="text-ink-100">Cognitive workload:</b> feedback given during exertion competes for attention, so its design is a human-factors problem.
              </li>
            </ul>
          </div>
          <div className="card card-pad">
            <div className="flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="h-5 w-5 text-ok" /> Check 2: Can it be a PWA? Yes, demonstrated.
            </div>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-300">
              <li>Pose estimation (MediaPipe, WebAssembly + WebGL) runs fully in the browser, with no server.</li>
              <li>Installable from the browser and cached by a service worker, so it works offline after the first visit.</li>
              <li>Web Speech API for audio cues and Vibration API for haptics, with no extra hardware.</li>
              <li>Works with uploaded or pre-recorded video; a live camera is optional, not required.</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="4W1H" title="Who, when and where, what, and how" />
        <div className="grid gap-3">
          {W4H1.map((r) => (
            <div key={r.q} className="card grid gap-3 p-5 md:grid-cols-[220px_1fr_1fr]">
              <div className="font-semibold text-white">{r.q}</div>
              <p className="text-sm leading-relaxed text-ink-200">{r.a}</p>
              <p className="text-sm leading-relaxed text-brand-200/90">{r.hf}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Biomechanics" title="Metrics, thresholds and their rationale">
          All thresholds are relative to the user’s own baseline. Each metric is only computed in the camera views where 2D video measures it validly.
        </SectionTitle>
        <div className="card overflow-x-auto">
          <table className="table-hf">
            <thead>
              <tr>
                <th>Metric</th>
                <th>How it is measured</th>
                <th>Views</th>
                <th>Minor / major</th>
                <th>Cue</th>
              </tr>
            </thead>
            <tbody>
              {METRIC_ORDER.map((id) => {
                const m = METRICS[id]
                return (
                  <tr key={id}>
                    <td className="font-semibold text-white">{m.label}</td>
                    <td className="max-w-md text-xs">{m.what}</td>
                    <td className="text-xs capitalize">{m.views.join(', ')}</td>
                    <td className="num text-xs">
                      {m.minor}
                      {m.mode === 'relative' ? ' %' : m.unit === '°' ? '°' : ' pts'} / {m.major}
                      {m.mode === 'relative' ? ' %' : m.unit === '°' ? '°' : ' pts'}
                    </td>
                    <td className="text-xs font-semibold text-brand-300 uppercase">{m.cue}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="card card-pad text-sm text-ink-300">
            <div className="mb-1 font-semibold text-white">Rep score</div>
            100 minus weighted penalties: each metric subtracts up to its weight (depth 30, trunk 25, knees 30, hip shift 20, velocity 15, consistency 10) in proportion to its
            deviation relative to the major threshold.
          </div>
          <div className="card card-pad text-sm text-ink-300">
            <div className="mb-1 font-semibold text-white">Drift onset</div>
            The first post-baseline rep that, together with the next rep, is flagged on a technique metric. Requiring two consecutive reps suppresses one-off noise.
          </div>
          <div className="card card-pad text-sm text-ink-300">
            <div className="mb-1 font-semibold text-white">Spinal load</div>
            Static sagittal L5/S1 model: upper body 55 % of body mass with its centre of mass at 40 % of trunk length, load held at the chest, 5 cm erector moment arm. Compared
            with the NIOSH 3.4 kN action limit (Waters et al., 1993).
          </div>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Information handling" title="Feedback designed for a body under load">
          The user is mid-effort, often cannot see the screen, and has limited spare attention. Every design decision follows from that.
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            ['One cue, at the right moment', 'Maximum one cue per rep, given at the top after the effort, never at the bottom where attention is fully on the lift.'],
            [
              'Few words, external focus',
              '“Sit deeper”, “Chest up”, “Knees out”. Short external-focus instructions support motor learning (Wulf, 2013) and fit within working memory.',
            ],
            [
              'Choose the channel',
              'Audio frees the eyes (multiple resource theory, Wickens 2002). Haptic suits noisy gyms. Visual uses a large colour ring readable at a glance from 3 m. Silent defers everything to the summary.',
            ],
            [
              'Prioritise and throttle',
              'Safety first, then major, then minor, then fatigue. A 3 s cooldown and a repeat limit prevent nagging and habituation (Sigrist et al., 2013).',
            ],
            ['Escalate to “stop”', 'When several measures are severely off, repeating a correction stops helping, so the system recommends ending the set.'],
            ['Details after the set', 'Numbers, charts and explanations appear only in the post-set summary. During the set, the athlete view shows no numbers.'],
          ].map(([t, d]) => (
            <div key={t} className="card card-pad">
              <div className="font-semibold text-white">{t}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Implementation" title="Processing pipeline" />
        <div className="grid gap-2 md:grid-cols-6">
          {[
            ['Video', 'Upload or demo clip; frames are sampled at 15 fps by seeking, so results are deterministic.'],
            ['Pose', 'MediaPipe Pose Landmarker (full), 33 image and 33 world landmarks per frame, run in the browser.'],
            ['Signals', 'Gap filling and zero-phase Gaussian smoothing; hip depth normalised by leg length.'],
            ['Reps', 'Hysteresis on the depth signal, sub-frame threshold crossings for tempo, and hinge/incomplete-rep rejection.'],
            ['Baseline', 'Median of the first N reps; DTW template of the rep shape.'],
            ['Drift', 'Per-metric deviation and level, rep score, onset, trend and the cue scheduler.'],
          ].map(([t, d], i) => (
            <div key={t} className="card p-4">
              <div className="num text-xs text-brand-400">0{i + 1}</div>
              <div className="font-semibold text-white">{t}</div>
              <p className="mt-1 text-xs leading-relaxed text-ink-300">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Limitations" title="What this prototype cannot do (yet)" />
        <div className="card card-pad">
          <ul className="grid list-disc gap-x-8 gap-y-2 pl-5 text-sm text-ink-300 md:grid-cols-2">
            <li>A single 2D camera: out-of-plane motion is foreshortened, which is why metrics are restricted by view.</li>
            <li>Thresholds come from literature and pilot data; they have not been validated against expert ratings on a large sample.</li>
            <li>Synthetic validation tests the measurement pipeline, not the realism of fatigue patterns.</li>
            <li>The real demo clips show consistent technique, so drift detection on real fatigue still needs a user study.</li>
            <li>Squat only. Other lifts need their own segmentation signals and metrics.</li>
            <li>Offline (post-set) analysis. Live camera mode is future work, as are an IMU and velocity-based-training sensor fusion.</li>
            <li>The L5/S1 estimate is a static, simplified model for comparing reps, not an absolute risk measure.</li>
            <li>MediaPipe accuracy drops with loose clothing, occlusion by equipment, backlighting and low resolution.</li>
          </ul>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Credits and licences" title="Built on prior work, with attribution" />
        <div className="card overflow-x-auto">
          <table className="table-hf">
            <thead>
              <tr>
                <th>Repository / asset</th>
                <th>Licence</th>
                <th>How it was used</th>
              </tr>
            </thead>
            <tbody>
              {REPOS.map(([r, l, u]) => (
                <tr key={r}>
                  <td className="font-semibold text-white">{r}</td>
                  <td className="text-xs">{l}</td>
                  <td className="text-xs">{u}</td>
                </tr>
              ))}
              {DEMO_CLIPS.filter((c) => c.credit).map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold text-white">
                    Video: “{c.credit!.title}” by {c.credit!.author}
                  </td>
                  <td className="text-xs">{c.credit!.license}</td>
                  <td className="text-xs">
                    Demo clip via{' '}
                    <a href={c.credit!.sourceUrl} className="text-brand-300 hover:underline" target="_blank" rel="noreferrer">
                      Wikimedia Commons
                    </a>
                    . {c.credit!.changes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="References" title="Sources" />
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-300">
          {REFERENCES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}
