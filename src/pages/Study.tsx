import { useState } from 'react'
import { Download, Save, Trash2 } from 'lucide-react'
import { downloadFile, loadList, PERCEPTION_KEY, saveList, STUDY_KEY, type PerceptionEntry } from '../lib/store'
import { FEEDBACK_MODES, type FeedbackMode } from '../lib/analysis/feedback'
import { Callout, SectionTitle, Stat } from '../components/ui'

const SUS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
]

const TLX = [
  ['Mental demand', 'How mentally demanding was it to follow the feedback?'],
  ['Physical demand', 'How physically demanding was the task?'],
  ['Temporal demand', 'How hurried or rushed was the pace?'],
  ['Performance', 'How successful were you? (0 = perfect, 100 = failure)'],
  ['Effort', 'How hard did you have to work to reach your level of performance?'],
  ['Frustration', 'How insecure, discouraged, irritated or stressed were you?'],
] as const

interface StudyEntry {
  ts: string
  participant: string
  mode: FeedbackMode
  sus: number[]
  susScore: number
  tlx: number[]
  tlxScore: number
  comment: string
}

function susScore(r: number[]) {
  return r.reduce((s, v, i) => s + (i % 2 === 0 ? v - 1 : 5 - v), 0) * 2.5
}

const PROTOCOL = [
  ['Participants', '8–12 recreational lifters (≥6 months training), varied stature and sex. Informed consent; no load above their usual 10-rep working weight.'],
  [
    'Design',
    'Within-subjects, counterbalanced: one set with no feedback, one with audio cues, one with visual-only cues. Same load (about 70 % of 1RM, near failure at 10–12 reps).',
  ],
  ['Task', 'Goblet or back squat to self-selected depth, phone propped side-on at hip height, 2–3 m away. Two minutes of rest between sets.'],
  [
    'Measures',
    'Objective: drift onset rep, flagged reps, depth and trunk-lean deviation, velocity loss. Subjective: perceived drift rep (self-perception check), SUS, raw NASA-TLX, preferred modality.',
  ],
  [
    'Hypotheses',
    'H1: perceived onset occurs later than measured onset without feedback. H2: cued sets show fewer major-drift reps. H3: SUS ≥ 68 and TLX lower for audio than visual during effort.',
  ],
  ['Analysis', 'Wilcoxon signed-rank tests across conditions (small n); report effect sizes and medians. Perceived − measured onset as the awareness-gap measure.'],
]

export default function Study() {
  const [participant, setParticipant] = useState('P01')
  const [mode, setMode] = useState<FeedbackMode>('combined')
  const [sus, setSus] = useState<number[]>(Array(10).fill(0))
  const [tlx, setTlx] = useState<number[]>(Array(6).fill(50))
  const [comment, setComment] = useState('')
  const [entries, setEntries] = useState<StudyEntry[]>(() => loadList<StudyEntry>(STUDY_KEY))
  const [perception, setPerception] = useState<PerceptionEntry[]>(() => loadList<PerceptionEntry>(PERCEPTION_KEY))

  const complete = sus.every((v) => v > 0)
  const currentSus = complete ? susScore(sus) : NaN
  const currentTlx = tlx.reduce((a, b) => a + b, 0) / tlx.length

  const save = () => {
    const next = [...entries, { ts: new Date().toISOString(), participant, mode, sus, susScore: currentSus, tlx, tlxScore: currentTlx, comment }]
    setEntries(next)
    saveList(STUDY_KEY, next)
    setSus(Array(10).fill(0))
    setTlx(Array(6).fill(50))
    setComment('')
    const num = parseInt(participant.replace(/\D/g, ''), 10)
    if (Number.isFinite(num)) setParticipant(`P${String(num + 1).padStart(2, '0')}`)
  }

  const exportCsv = () => {
    const head = [
      'timestamp',
      'participant',
      'mode',
      ...SUS.map((_, i) => `sus${i + 1}`),
      'sus_score',
      ...TLX.map(([n]) => `tlx_${n.toLowerCase().replace(/ /g, '_')}`),
      'tlx_raw',
      'comment',
    ]
    const rows = entries.map((e) => [e.ts, e.participant, e.mode, ...e.sus, e.susScore, ...e.tlx, e.tlxScore.toFixed(1), JSON.stringify(e.comment)])
    const p = ['', 'timestamp,clip,perceived_onset,measured_onset,reps', ...perception.map((e) => [e.ts, e.clip, e.perceived, e.measured ?? 'none', e.reps].join(','))]
    downloadFile('formdrift-study.csv', [head.join(','), ...rows.map((r) => r.join(',')), ...p].join('\n'), 'text/csv')
  }

  const clear = () => {
    if (!confirm('Delete all stored study responses and perception checks on this device?')) return
    setEntries([])
    setPerception([])
    saveList(STUDY_KEY, [])
    saveList(PERCEPTION_KEY, [])
  }

  const meanSus = entries.length ? entries.reduce((s, e) => s + e.susScore, 0) / entries.length : NaN
  const meanTlx = entries.length ? entries.reduce((s, e) => s + e.tlxScore, 0) / entries.length : NaN
  const gaps = perception.filter((p) => typeof p.perceived === 'number' && p.measured !== null).map((p) => (p.perceived as number) - (p.measured as number))

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <SectionTitle eyebrow="Aesthetic and usability evaluation" title="User study toolkit">
        A ready-to-run evaluation protocol with standard instruments. Responses are stored only in this browser and can be exported as CSV.
      </SectionTitle>

      <Callout tone="honest" title="Status">
        This is a protocol and data-collection tool. No participant data is bundled or claimed; the course scope excluded a formal study. Scores below show only what is entered on
        this device.
      </Callout>

      <section>
        <h3 className="mb-3 text-xl font-semibold text-white">Protocol</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {PROTOCOL.map(([t, d]) => (
            <div key={t} className="card p-4">
              <div className="text-sm font-semibold text-white">{t}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Responses" value={entries.length} />
        <Stat label="Mean SUS" value={Number.isFinite(meanSus) ? meanSus.toFixed(1) : '—'} sub="68 = average usability" />
        <Stat label="Mean raw TLX" value={Number.isFinite(meanTlx) ? meanTlx.toFixed(0) : '—'} sub="0–100, lower is better" />
        <Stat
          label="Awareness gap"
          value={gaps.length ? `${(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1)} reps` : '—'}
          sub={`perceived − measured onset · ${perception.length} checks`}
        />
      </section>

      <section className="card card-pad space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="text-xs font-medium text-ink-300">Participant ID</span>
            <input className="input mt-1 w-28" value={participant} onChange={(e) => setParticipant(e.target.value)} />
          </label>
          <div>
            <span className="text-xs font-medium text-ink-300">Feedback condition</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {FEEDBACK_MODES.map((m) => (
                <button key={m.id} className={`chip cursor-pointer ${mode === m.id ? 'border-brand-400 text-brand-300' : ''}`} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="font-semibold text-white">System Usability Scale (Brooke, 1996)</h4>
            <span className="num text-sm text-ink-300">{complete ? `SUS = ${currentSus.toFixed(1)}` : `${sus.filter((v) => v > 0).length}/10 answered`}</span>
          </div>
          <div className="space-y-1.5">
            {SUS.map((q, i) => (
              <div key={q} className="grid items-center gap-2 rounded-lg px-2 py-1.5 odd:bg-white/[0.02] md:grid-cols-[1fr_auto]">
                <span className="text-sm text-ink-200">
                  <span className="num mr-2 text-ink-500">{i + 1}.</span>
                  {q}
                </span>
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-[10px] text-ink-500">Disagree</span>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      onClick={() => setSus((s) => s.map((x, j) => (j === i ? v : x)))}
                      className={`num h-8 w-8 rounded-lg border text-sm transition ${sus[i] === v ? 'border-brand-400 bg-brand-400/20 text-white' : 'border-white/10 text-ink-300 hover:border-white/30'}`}
                    >
                      {v}
                    </button>
                  ))}
                  <span className="ml-1 text-[10px] text-ink-500">Agree</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="font-semibold text-white">NASA-TLX, raw (Hart &amp; Staveland, 1988)</h4>
            <span className="num text-sm text-ink-300">raw TLX = {currentTlx.toFixed(0)}</span>
          </div>
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {TLX.map(([n, d], i) => (
              <label key={n} className="block">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-ink-100">{n}</span>
                  <span className="num text-ink-300">{tlx[i]}</span>
                </div>
                <div className="text-xs text-ink-400">{d}</div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={tlx[i]}
                  onChange={(e) => setTlx((t) => t.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                  className="mt-1 w-full accent-[#3dd6ef]"
                />
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-300">Comments (preferred modality, what was confusing, aesthetics)</span>
          <textarea className="input mt-1 h-20 w-full" value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!complete} onClick={save}>
            <Save className="h-4 w-4" /> Save response
          </button>
          <button className="btn-ghost" disabled={!entries.length && !perception.length} onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button className="btn-ghost ml-auto text-major" disabled={!entries.length && !perception.length} onClick={clear}>
            <Trash2 className="h-4 w-4" /> Clear device data
          </button>
        </div>
      </section>

      {(entries.length > 0 || perception.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card overflow-x-auto">
            <table className="table-hf">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Condition</th>
                  <th>SUS</th>
                  <th>Raw TLX</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.ts}>
                    <td>{e.participant}</td>
                    <td>{FEEDBACK_MODES.find((m) => m.id === e.mode)?.label}</td>
                    <td className="num">{e.susScore.toFixed(1)}</td>
                    <td className="num">{e.tlxScore.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card overflow-x-auto">
            <table className="table-hf">
              <thead>
                <tr>
                  <th>Clip</th>
                  <th>Perceived onset</th>
                  <th>Measured onset</th>
                </tr>
              </thead>
              <tbody>
                {perception.map((p) => (
                  <tr key={p.ts}>
                    <td className="text-xs">{p.clip}</td>
                    <td className="num">{typeof p.perceived === 'number' ? `rep ${p.perceived}` : p.perceived}</td>
                    <td className="num">{p.measured ? `rep ${p.measured}` : 'none'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
