import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Camera, CheckCircle2, FileVideo, Sun, Upload } from 'lucide-react'
import { DEMO_CLIPS, type DemoClip } from '../lib/demo/library'
import { setUpload } from '../lib/upload'
import { SettingsPanel } from '../components/SettingsPanel'
import { SectionTitle, SourceBadge } from '../components/ui'

function ClipThumb({ clip }: { clip: DemoClip }) {
  if (clip.poster)
    return (
      <div className="relative aspect-video overflow-hidden bg-black">
        <img src={clip.poster} alt="" className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
      </div>
    )
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-ink-800 to-ink-900">
      <svg viewBox="0 0 120 80" className="h-28 opacity-90">
        <line x1="10" y1="72" x2="110" y2="72" stroke="#3dd6ef" strokeOpacity="0.4" strokeWidth="1.5" />
        {clip.camera === 'side' ? (
          <g stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M58 70 L66 52 L48 44 L60 20" />
            <path d="M60 22 L70 34 L64 30" strokeWidth="3.5" />
            <circle cx="62" cy="13" r="5" fill="#e2e8f0" stroke="none" />
          </g>
        ) : (
          <g stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M46 70 L52 52 L56 42 M74 70 L68 52 L64 42" />
            <path d="M54 42 L66 42 L64 20 L56 20 Z" />
            <circle cx="60" cy="12" r="5" fill="#e2e8f0" stroke="none" />
          </g>
        )}
      </svg>
      <span className="absolute right-3 bottom-3 rounded bg-black/40 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-ink-300 uppercase">{clip.camera} camera</span>
    </div>
  )
}

export default function Analyze() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')

  const onFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setError('Please choose a video file (MP4, WebM or MOV).')
      return
    }
    setUpload(file)
    navigate('/session/upload')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <SectionTitle eyebrow="Analyse" title="Pick a demo set or analyse your own video">
        Demo sets open instantly with cached pose landmarks. Your own video is processed live by MediaPipe in this browser, and nothing is uploaded.
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {DEMO_CLIPS.map((clip, i) => (
            <Link
              key={clip.id}
              to={`/session/${clip.id}`}
              className="group card overflow-hidden transition hover:border-brand-400/40 hover:shadow-[0_20px_60px_-30px_rgba(61,214,239,0.5)]"
            >
              <ClipThumb clip={clip} />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <SourceBadge kind={clip.kind} />
                  {i === 0 && <span className="chip border-brand-400/40 bg-brand-400/10 text-brand-300">Start here</span>}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{clip.title}</h3>
                <div className="text-xs text-ink-400">{clip.subtitle}</div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-300">{clip.description}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-300">
                  Analyse <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              onFile(e.dataTransfer.files[0])
            }}
            className={`card flex flex-col items-center justify-center gap-3 border-dashed p-8 text-center sm:col-span-2 ${drag ? 'border-brand-400 bg-brand-400/5' : ''}`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-400/10">
              <Upload className="h-6 w-6 text-brand-300" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">Analyse your own squat video</div>
              <p className="mt-1 text-sm text-ink-300">Drag a file here or choose one. MP4/WebM/MOV, up to 2 minutes. Processed locally.</p>
            </div>
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button className="btn-primary" onClick={() => inputRef.current?.click()}>
              <FileVideo className="h-4 w-4" /> Choose video
            </button>
            {error && <div className="text-sm text-major">{error}</div>}
            <div className="mt-2 grid w-full max-w-2xl gap-2 text-left text-xs text-ink-300 sm:grid-cols-3">
              <div className="flex gap-2 rounded-lg bg-white/[0.03] p-3">
                <Camera className="h-4 w-4 shrink-0 text-brand-400" /> Side view for depth and trunk lean; front view for knees and hips.
              </div>
              <div className="flex gap-2 rounded-lg bg-white/[0.03] p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-400" /> Whole body in frame, feet included, about 3 m away.
              </div>
              <div className="flex gap-2 rounded-lg bg-white/[0.03] p-3">
                <Sun className="h-4 w-4 shrink-0 text-brand-400" /> Even lighting, with nothing bright directly behind you.
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SettingsPanel />
          <div className="card card-pad text-sm text-ink-300">
            <div className="mb-1 font-semibold text-white">Why a personal baseline?</div>
            Two lifters with different femur-to-torso ratios squat with different trunk angles, and both can be correct. FormDrift never judges you against a textbook angle, only
            against how <em>you</em> moved at the start of the set.
          </div>
        </div>
      </div>
    </div>
  )
}
