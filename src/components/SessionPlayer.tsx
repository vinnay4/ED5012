import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Gauge, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import type { PoseTrack } from '../lib/pose/types'
import type { SessionAnalysis } from '../lib/analysis/analyze'
import { FEEDBACK_MODES, type Cue } from '../lib/analysis/feedback'
import { drawPose, drawSyntheticBackdrop, highlightFor, lerpFrame } from './drawPose'
import { LEVEL_COLOR, LEVEL_LABEL } from './ui'

export interface PlayerHandle {
  seek: (t: number) => void
  play: () => void
  pause: () => void
}

interface Props {
  track: PoseTrack
  analysis: SessionAnalysis | null
  videoSrc?: string
  aspect: number
  onTime?: (t: number) => void
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.05
  u.pitch = 1
  window.speechSynthesis.speak(u)
}

function vibrate(level: Cue['level']) {
  if (!('vibrate' in navigator)) return
  navigator.vibrate(level === 'major' ? [90, 60, 90] : level === 'info' ? [40] : [90])
}

export const SessionPlayer = forwardRef<PlayerHandle, Props>(function SessionPlayer({ track, analysis, videoSrc, aspect, onTime }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const clock = useRef({ t: 0, playing: false, last: 0, rate: 1 })
  const lastFired = useRef(-1)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [skeleton, setSkeleton] = useState(true)
  const [analyst, setAnalyst] = useState(false)
  const [sound, setSound] = useState(true)
  const duration = videoSrc ? track.duration : track.duration
  const synthetic = !videoSrc
  const mode = analysis?.settings.feedbackMode ?? 'combined'
  const channels = FEEDBACK_MODES.find((m) => m.id === mode)?.channels ?? []

  const getTime = useCallback(() => (videoRef.current ? videoRef.current.currentTime : clock.current.t), [])

  const seek = useCallback(
    (time: number) => {
      const tt = Math.max(0, Math.min(duration, time))
      if (videoRef.current) videoRef.current.currentTime = tt
      clock.current.t = tt
      lastFired.current = tt
      setT(tt)
    },
    [duration],
  )

  const play = useCallback(() => {
    if (getTime() >= duration - 0.05) seek(0)
    if (videoRef.current) void videoRef.current.play()
    clock.current.playing = true
    clock.current.last = performance.now()
    setPlaying(true)
  }, [duration, getTime, seek])

  const pause = useCallback(() => {
    videoRef.current?.pause()
    clock.current.playing = false
    setPlaying(false)
  }, [])

  useImperativeHandle(ref, () => ({ seek, play, pause }), [seek, play, pause])

  useEffect(() => {
    clock.current.rate = rate
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate])

  // Render loop.
  useEffect(() => {
    let raf = 0
    let lastUi = 0
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const c = clock.current
      if (!videoRef.current && c.playing) {
        c.t += ((now - c.last) / 1000) * c.rate
        c.last = now
        if (c.t >= duration) {
          c.t = duration
          c.playing = false
          setPlaying(false)
        }
      }
      const time = getTime()
      const canvas = canvasRef.current
      const wrap = wrapRef.current
      if (!canvas || !wrap) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = wrap.clientWidth
      const H = wrap.clientHeight
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
      }
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      // Content rectangle matching object-fit: contain.
      const srcAspect = track.width / track.height
      let cw = W
      let ch = W / srcAspect
      if (ch > H) {
        ch = H
        cw = H * srcAspect
      }
      const cx = (W - cw) / 2
      const cy = (H - ch) / 2
      if (synthetic) drawSyntheticBackdrop(ctx, W, H, cy + 0.93 * ch)
      const fi = time * track.sampleFps
      const i0 = Math.max(0, Math.min(track.frames.length - 1, Math.floor(fi)))
      const i1 = Math.min(track.frames.length - 1, i0 + 1)
      const frame = lerpFrame(track.frames[i0], track.frames[i1], fi - i0)
      if (frame && (skeleton || synthetic)) {
        const rep = analysis?.reps.find((r) => time >= r.start && time <= r.end + 0.4)
        let highlight
        if (rep && !rep.isBaseline && rep.worstLevel !== 'ok') {
          const worst = Object.entries(rep.deviations).sort((a, b) => (b[1]?.dev ?? 0) / 1 - (a[1]?.dev ?? 0))
          const top = worst.find(([, d]) => d && d.level === rep.worstLevel)
          highlight = highlightFor(top?.[0], LEVEL_COLOR[rep.worstLevel])
        }
        drawPose(ctx, frame, { x: cx, y: cy, w: cw, h: ch, mannequin: synthetic, highlight })
        if (synthetic && skeleton) drawPose(ctx, frame, { x: cx, y: cy, w: cw, h: ch, highlight, minVis: 0.7 })
      }
      // Cue delivery (audio / haptic) when playback crosses a cue time.
      if (analysis && (videoRef.current ? !videoRef.current.paused : c.playing)) {
        for (const cue of analysis.cues) {
          if (cue.delivered && cue.t > lastFired.current && cue.t <= time) {
            if (sound && cue.channels.includes('audio')) speak(cue.text)
            if (cue.channels.includes('haptic')) vibrate(cue.level)
          }
        }
        lastFired.current = time
      }
      if (now - lastUi > 66) {
        lastUi = now
        setT(time)
        onTime?.(time)
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [analysis, duration, getTime, onTime, skeleton, sound, synthetic, track])

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  // HUD state derived from time.
  const reps = analysis?.reps ?? []
  const completed = reps.filter((r) => r.end <= t).length
  const current = reps.find((r) => t >= r.start && t <= r.end)
  const phase = !current ? 'Standing' : t < current.bottom - 0.15 ? 'Lowering' : t <= current.bottom + 0.15 ? 'Bottom' : 'Rising'
  const lastDone = [...reps].reverse().find((r) => r.end <= t)
  const calibrating = analysis && (completed < analysis.baselineCount || (current?.isBaseline ?? false))
  const ringColor = !analysis ? '#3d4a61' : calibrating ? LEVEL_COLOR.base : lastDone ? LEVEL_COLOR[lastDone.worstLevel] : LEVEL_COLOR.base
  const ringLabel = !analysis ? 'Waiting' : calibrating ? 'Calibrating' : lastDone ? LEVEL_LABEL[lastDone.worstLevel] : 'Ready'
  const activeCue = analysis?.cues.find((c) => c.delivered && c.channels.includes('visual') && t >= c.t && t < c.t + 2.4)
  const fIdx = Math.min(track.frames.length - 1, Math.round(t * track.sampleFps))
  const tl = analysis?.timeline

  return (
    <div className="card overflow-hidden">
      <div
        ref={wrapRef}
        className="relative mx-auto w-full bg-black"
        style={{ aspectRatio: `${Math.max(aspect, 4 / 3)}`, maxHeight: '64vh' }}
        onClick={() => (playing ? pause() : play())}
      >
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="absolute inset-0 h-full w-full object-contain"
            muted
            playsInline
            preload="auto"
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
          />
        )}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

        {analysis && (
          <>
            <div className="pointer-events-none absolute top-3 left-3 rounded-xl bg-black/55 px-3 py-2 backdrop-blur">
              <div className="text-[10px] font-semibold tracking-[0.2em] text-ink-300 uppercase">Rep</div>
              <div className="num text-3xl leading-none font-bold text-white">
                {completed}
                <span className="text-base text-ink-400">/{reps.length}</span>
              </div>
              <div className="mt-1 text-[11px] font-medium text-brand-300">{phase}</div>
            </div>
            {channels.includes('visual') && (
              <div className="pointer-events-none absolute top-3 right-3 flex flex-col items-center gap-1.5">
                <div
                  className={`h-16 w-16 rounded-full border-[6px] transition-colors duration-300 sm:h-20 sm:w-20 ${activeCue ? 'animate-pulse-ring' : ''}`}
                  style={{ borderColor: ringColor, color: `${ringColor}66`, background: `${ringColor}22` }}
                />
                <div className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold" style={{ color: ringColor }}>
                  {ringLabel}
                </div>
              </div>
            )}
            {activeCue && (
              <div key={`${activeCue.rep}-${activeCue.text}`} className="animate-pop pointer-events-none absolute inset-x-0 top-3 flex justify-center px-20 sm:px-32">
                <div
                  className="rounded-2xl px-3 py-2 text-center text-base font-extrabold tracking-wide uppercase shadow-2xl sm:px-6 sm:py-3 sm:text-3xl"
                  style={{
                    background: activeCue.level === 'info' ? 'rgba(129,140,248,0.92)' : activeCue.level === 'major' ? 'rgba(251,113,133,0.95)' : 'rgba(251,191,36,0.95)',
                    color: '#070a10',
                  }}
                >
                  {activeCue.text}
                </div>
              </div>
            )}
            {analyst && tl && (
              <div className="num pointer-events-none absolute bottom-3 left-3 space-y-0.5 rounded-lg bg-black/65 px-3 py-2 text-[11px] text-ink-200">
                <div>t = {t.toFixed(2)} s</div>
                <div>depth = {Number.isFinite(tl.depth[fIdx]) ? (tl.depth[fIdx] * 100).toFixed(0) : '—'} % leg</div>
                <div>knee = {Number.isFinite(tl.kneeAngle[fIdx]) ? tl.kneeAngle[fIdx].toFixed(0) : '—'}°</div>
                {analysis.view.type === 'side' && <div>trunk lean = {tl.trunkLean[fIdx]?.toFixed(0)}°</div>}
                {analysis.view.type === 'front' && <div>knee/ankle width = {tl.kneeRatio[fIdx]?.toFixed(0)} %</div>}
              </div>
            )}
          </>
        )}
        {!playing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur">
              <Play className="ml-1 h-7 w-7 text-white" />
            </div>
          </div>
        )}
      </div>

      {analysis && (
        <div className="relative h-7 bg-ink-850">
          {reps.map((r) => {
            const color = r.isBaseline ? LEVEL_COLOR.base : LEVEL_COLOR[r.worstLevel]
            return (
              <button
                key={r.index}
                title={`Rep ${r.index}: score ${r.score}`}
                onClick={() => seek(Math.max(0, r.start - 0.3))}
                className="absolute top-1 bottom-1 rounded-md text-[10px] font-bold text-ink-950 transition hover:brightness-125"
                style={{ left: `${(r.start / duration) * 100}%`, width: `${((r.end - r.start) / duration) * 100}%`, background: color }}
              >
                {r.index}
              </button>
            )
          })}
          <div className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${(t / duration) * 100}%` }} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-3 py-2.5">
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => (playing ? pause() : play())} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => seek(0)} aria-label="Restart">
          <RotateCcw className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={t}
          onChange={(e) => seek(+e.target.value)}
          className="mx-1 min-w-32 flex-1 accent-brand-400"
          aria-label="Seek"
        />
        <span className="num w-20 text-right text-xs text-ink-300">
          {t.toFixed(1)} / {duration.toFixed(1)}s
        </span>
        <select className="input !w-auto !py-1.5" value={rate} onChange={(e) => setRate(+e.target.value)} aria-label="Playback speed">
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={1.5}>1.5×</option>
          <option value={2}>2×</option>
        </select>
        {!synthetic && (
          <button className={`btn-ghost !px-3 !py-1.5 ${skeleton ? '!text-brand-300' : ''}`} onClick={() => setSkeleton((s) => !s)}>
            Skeleton
          </button>
        )}
        <button
          className={`btn-ghost !px-3 !py-1.5 ${analyst ? '!text-brand-300' : ''}`}
          onClick={() => setAnalyst((s) => !s)}
          title="Show live numbers (analyst view). The athlete view deliberately shows no numbers during a set."
        >
          <Gauge className="h-4 w-4" />
          Analyst
        </button>
        <button className="btn-ghost !px-3 !py-1.5" onClick={() => setSound((s) => !s)} title="Spoken cues" aria-label="Toggle spoken cues">
          {sound && channels.includes('audio') ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
})
