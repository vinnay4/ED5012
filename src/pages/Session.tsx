import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Cpu, ExternalLink, Loader2, Play, RefreshCw, Settings2, X } from 'lucide-react'
import { getClip, loadClipTrack } from '../lib/demo/library'
import { getUpload } from '../lib/upload'
import { analyzeTrack } from '../lib/analysis/analyze'
import type { ExtractProgress } from '../lib/pose/landmarker'
import type { PoseTrack } from '../lib/pose/types'
import { loadList, PERCEPTION_KEY, saveList, useSettings, type PerceptionEntry } from '../lib/store'
import { SessionPlayer, type PlayerHandle } from '../components/SessionPlayer'
import { SettingsPanel } from '../components/SettingsPanel'
import { AwarenessGap, BodyPanel, Biomechanics, DataPanel, FeedbackLog, Overview, RepDetail, ValidationPanel } from '../components/results'
import { Callout, SourceBadge, Tabs } from '../components/ui'

const STEPS = [
  { id: 'pose', label: 'Pose landmarks', detail: '33 body landmarks per frame' },
  { id: 'view', label: 'Camera view', detail: 'side / front / oblique' },
  { id: 'reps', label: 'Rep segmentation', detail: 'hip-height cycles' },
  { id: 'base', label: 'Personal baseline', detail: 'from your first reps' },
  { id: 'drift', label: 'Drift and cues', detail: 'per-rep comparison' },
]

type Stage = 'idle' | 'running' | 'perception' | 'done' | 'error'
type TabId = 'overview' | 'reps' | 'biomech' | 'body' | 'feedback' | 'validation' | 'data'

export default function SessionRoute() {
  const { id = '' } = useParams()
  return <Session key={id} id={id} />
}

function Session({ id }: { id: string }) {
  const clip = id === 'upload' ? undefined : getClip(id)
  const upload = id === 'upload' ? getUpload() : null
  const [settings] = useSettings()
  const [track, setTrack] = useState<PoseTrack | null>(null)
  const [origin, setOrigin] = useState<'cached' | 'live' | 'synthetic' | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [step, setStep] = useState(-1)
  const [progress, setProgress] = useState<ExtractProgress | null>(null)
  const [error, setError] = useState('')
  const [perceived, setPerceived] = useState<number | 'none' | 'unsure' | null>(null)
  const [tab, setTab] = useState<TabId>('overview')
  const [time, setTime] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const player = useRef<PlayerHandle>(null)
  const abortRef = useRef<AbortController | null>(null)
  const runId = useRef(0)
  const navigate = useNavigate()

  const effective = useMemo(() => (clip ? { ...settings, externalLoadKg: clip.loadKg, statureCm: clip.statureCm ?? settings.statureCm } : settings), [clip, settings])
  const analysis = useMemo(() => (track ? analyzeTrack(track, effective) : null), [track, effective])
  const videoSrc = clip?.video ?? upload?.url
  const kind = clip ? clip.kind : 'upload'
  const title = clip?.title ?? upload?.name ?? 'Your video'
  const aspect = clip?.aspect ?? (track ? track.width / track.height : 16 / 9)

  useEffect(() => () => abortRef.current?.abort(), [])

  const animateSteps = async (from: number) => {
    for (let s = from; s < STEPS.length; s++) {
      setStep(s)
      await new Promise((r) => setTimeout(r, 380))
    }
    setStep(STEPS.length)
  }

  const run = useCallback(
    async (mode: 'auto' | 'live') => {
      const myRun = ++runId.current
      const current = () => myRun === runId.current
      setError('')
      setStage('running')
      setStep(0)
      setPerceived(null)
      try {
        let tr: PoseTrack
        if (mode === 'live' && videoSrc) {
          abortRef.current?.abort()
          const ac = new AbortController()
          abortRef.current = ac
          const { extractPoseTrack } = await import('../lib/pose/landmarker')
          tr = await extractPoseTrack(videoSrc, { sampleFps: 15, variant: 'full', onProgress: (p) => current() && setProgress(p), signal: ac.signal })
          if (!current()) return
          setOrigin('live')
        } else if (clip) {
          await new Promise((r) => setTimeout(r, 450))
          tr = await loadClipTrack(clip)
          if (!current()) return
          setOrigin(clip.kind === 'synthetic' ? 'synthetic' : 'cached')
        } else {
          throw new Error('No video selected.')
        }
        setTrack(tr)
        setProgress(null)
        await animateSteps(1)
        if (!current()) return
        const a = analyzeTrack(tr, effective)
        if (!a.ok) throw new Error(a.error)
        setStage(a.reps.some((r) => !r.isBaseline) ? 'perception' : 'done')
      } catch (e) {
        if (!current()) return
        setProgress(null)
        if ((e as Error).name === 'AbortError') {
          setStage('done')
          return
        }
        setError((e as Error).message)
        setStage('error')
      }
    },
    [clip, effective, videoSrc],
  )

  useEffect(() => {
    if (upload && stage === 'idle') void run('live')
  }, [upload, stage, run])

  if (!clip && !upload) return <Navigate to="/analyze" replace />

  const seekRep = (rep: number) => {
    const r = analysis?.reps.find((x) => x.index === rep)
    if (r) {
      player.current?.seek(Math.max(0, r.start - 0.3))
      player.current?.play()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const answer = (p: number | 'none' | 'unsure') => {
    setPerceived(p)
    setStage('done')
    if (analysis) {
      const list = loadList<PerceptionEntry>(PERCEPTION_KEY)
      list.push({ ts: new Date().toISOString(), clip: id, perceived: p, measured: analysis.driftOnsetRep, reps: analysis.reps.length })
      saveList(PERCEPTION_KEY, list)
    }
  }

  const showResults = stage === 'done' || stage === 'perception'

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link to="/analyze" className="btn-ghost !px-3 !py-1.5">
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>
        <div className="order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:truncate font-semibold text-white sm:text-2xl">{title}</h1>
            <SourceBadge kind={kind} />
          </div>
          <div className="text-sm text-ink-400">{clip?.subtitle ?? (upload ? `${(upload.size / 1e6).toFixed(1)} MB · analysed on this device` : '')}</div>
        </div>
        <button className="btn-ghost ml-auto !px-3 !py-1.5" onClick={() => setShowSettings((s) => !s)}>
          <Settings2 className="h-4 w-4" /> Settings
        </button>
      </div>

      {showSettings && (
        <div className="card card-pad mb-5">
          <SettingsPanel compact />
          {clip && (
            <p className="mt-3 text-xs text-ink-400">
              Demo assumption: external load {clip.loadKg} kg{clip.statureCm ? `, stature ${clip.statureCm} cm (model size)` : ''}. Changes re-run the analysis instantly.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {track && showResults ? (
            <SessionPlayer ref={player} track={track} analysis={analysis} videoSrc={videoSrc} aspect={aspect} onTime={setTime} />
          ) : (
            <div className="card relative overflow-hidden">
              <div className="relative flex w-full items-center justify-center bg-black" style={{ aspectRatio: `${Math.max(aspect, 4 / 3)}`, maxHeight: '64vh' }}>
                {videoSrc ? (
                  <video src={videoSrc} poster={clip?.poster} className="absolute inset-0 h-full w-full object-contain opacity-60" muted playsInline preload="metadata" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(61,214,239,0.12),transparent_60%)]" />
                )}
                <div className="relative z-10 w-full max-w-md px-6">
                  {stage === 'idle' && (
                    <div className="text-center">
                      <button className="btn-primary !rounded-2xl !px-7 !py-4 text-lg" onClick={() => void run('auto')}>
                        <Play className="h-5 w-5" /> Analyse this set
                      </button>
                      <p className="mt-3 text-sm text-ink-300">
                        {clip?.kind === 'synthetic'
                          ? 'Generates the simulated set and runs the full analysis pipeline.'
                          : 'Uses landmarks pre-extracted with MediaPipe; you can re-extract live afterwards.'}
                      </p>
                    </div>
                  )}
                  {stage === 'running' && (
                    <div className="rounded-2xl border border-white/10 bg-ink-900/90 p-5 backdrop-blur">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Analysing…
                      </div>
                      <ol className="space-y-2">
                        {STEPS.map((s, i) => (
                          <li key={s.id} className={`flex items-center gap-3 text-sm ${i > step ? 'text-ink-500' : 'text-ink-100'}`}>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                i < step ? 'border-ok bg-ok/20 text-ok' : i === step ? 'border-brand-400 text-brand-400' : 'border-ink-600'
                              }`}
                            >
                              {i < step ? <Check className="h-3 w-3" /> : i === step ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            </span>
                            <span className="font-medium">{s.label}</span>
                            <span className="text-xs text-ink-400">{s.detail}</span>
                          </li>
                        ))}
                      </ol>
                      {progress && (
                        <div className="mt-4">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full bg-brand-400 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                          </div>
                          <div className="num mt-1.5 flex justify-between text-xs text-ink-400">
                            <span>
                              frame {progress.done}/{progress.total} · person in {progress.detected}
                            </span>
                            <span>MediaPipe · {progress.delegate}</span>
                          </div>
                          <button
                            className="mt-3 w-full text-center text-xs text-ink-400 hover:text-ink-200"
                            onClick={() => {
                              abortRef.current?.abort()
                              if (!track) navigate('/analyze')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {stage === 'error' && (
                    <div className="rounded-2xl border border-major/30 bg-ink-900/95 p-5 text-center">
                      <div className="font-semibold text-white">Analysis could not finish</div>
                      <p className="mt-1 text-sm text-ink-300">{error}</p>
                      <button className="btn-ghost mt-3" onClick={() => void run(upload ? 'live' : 'auto')}>
                        <RefreshCw className="h-4 w-4" /> Try again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {clip && (
            <div className="card card-pad space-y-3">
              <p className="text-sm leading-relaxed text-ink-300">{clip.description}</p>
              <div>
                <div className="mb-1.5 text-xs font-semibold tracking-wide text-ink-400 uppercase">Look for</div>
                <ul className="space-y-1 text-sm text-ink-200">
                  {clip.lookFor.map((l) => (
                    <li key={l} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {showResults && analysis && (
            <div className="card card-pad space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Cpu className="h-4 w-4 text-brand-400" /> Data source
              </div>
              {origin === 'synthetic' && <p className="text-ink-300">Generated by the synthetic kinematic model with injected faults. Not a real person.</p>}
              {origin === 'cached' && (
                <p className="text-ink-300">
                  Landmarks were pre-extracted from this video with the app's own MediaPipe pipeline and cached for an instant demo. Everything after that is computed live now.
                </p>
              )}
              {origin === 'live' && <p className="text-ink-300">Landmarks were extracted live in this browser just now ({track?.model}).</p>}
              {videoSrc && origin !== 'live' && (
                <button className="btn-ghost w-full" onClick={() => void run('live')}>
                  <RefreshCw className="h-4 w-4" /> Re-extract live with MediaPipe
                </button>
              )}
            </div>
          )}
          {clip?.credit && (
            <div className="card card-pad text-xs text-ink-400">
              <div className="mb-1 font-semibold text-ink-200">Video credit</div>“{clip.credit.title}” by {clip.credit.author},{' '}
              <a className="text-brand-300 hover:underline" href={clip.credit.licenseUrl} target="_blank" rel="noreferrer">
                {clip.credit.license}
              </a>
              , via{' '}
              <a className="inline-flex items-center gap-0.5 text-brand-300 hover:underline" href={clip.credit.sourceUrl} target="_blank" rel="noreferrer">
                Wikimedia Commons <ExternalLink className="h-3 w-3" />
              </a>
              . {clip.credit.changes}
            </div>
          )}
        </aside>
      </div>

      {analysis && showResults && (
        <div className="mt-6 space-y-5">
          {perceived !== null && <AwarenessGap perceived={perceived} a={analysis} />}
          {clip?.kind === 'synthetic' && (
            <Callout tone="honest" title="Simulated data">
              These results come from a synthetic set with faults injected deliberately to demonstrate and validate detection. Real-video demos are in the library.
            </Callout>
          )}
          <Tabs<TabId>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'reps', label: 'Rep by rep' },
              { id: 'biomech', label: 'Biomechanics' },
              { id: 'body', label: 'Body proportions' },
              { id: 'feedback', label: 'Feedback log' },
              { id: 'validation', label: 'Ground truth', hidden: !track?.groundTruth },
              { id: 'data', label: 'Data & export' },
            ]}
          />
          {tab === 'overview' && <Overview a={analysis} onSeekRep={seekRep} />}
          {tab === 'reps' && <RepDetail a={analysis} />}
          {tab === 'biomech' && <Biomechanics a={analysis} time={time} onSeek={(t) => player.current?.seek(t)} />}
          {tab === 'body' && <BodyPanel a={analysis} />}
          {tab === 'feedback' && <FeedbackLog a={analysis} />}
          {tab === 'validation' && track && <ValidationPanel a={analysis} track={track} />}
          {tab === 'data' && track && <DataPanel a={analysis} track={track} name={id} />}
        </div>
      )}

      {stage === 'perception' && analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="card animate-pop w-full max-w-lg p-6">
            <div className="flex items-start justify-between">
              <div className="eyebrow">Self-perception check</div>
              <button
                className="text-ink-400 hover:text-white"
                onClick={() => {
                  setStage('done')
                }}
                aria-label="Skip"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-white">Before you look: did the technique change during this set?</h3>
            <p className="mt-1 text-sm text-ink-300">
              Pick the rep where you think form started to slip. This measures the gap between perceived and measured drift, the core human issue behind FormDrift.
            </p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {analysis.reps
                .filter((r) => !r.isBaseline)
                .map((r) => (
                  <button key={r.index} className="btn-ghost !px-0" onClick={() => answer(r.index)}>
                    Rep {r.index}
                  </button>
                ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => answer('none')}>
                No change
              </button>
              <button className="btn-ghost" onClick={() => answer('unsure')}>
                Not sure
              </button>
            </div>
            <button className="mt-4 w-full text-center text-xs text-ink-400 hover:text-ink-200" onClick={() => setStage('done')}>
              Skip and show results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
