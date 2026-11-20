import { useEffect, useMemo, useRef, useState } from 'react'
import { generateSyntheticTrack } from '../lib/synthetic/generator'
import { analyzeTrack, DEFAULT_SETTINGS } from '../lib/analysis/analyze'
import { drawPose, drawSyntheticBackdrop, highlightFor, lerpFrame } from './drawPose'
import { LEVEL_COLOR, LEVEL_LABEL } from './ui'

/** Looping, non-interactive preview of the simulated side-camera set. */
export function HeroCanvas() {
  const track = useMemo(() => generateSyntheticTrack({ camera: 'side' }), [])
  const analysis = useMemo(() => analyzeTrack(track, { ...DEFAULT_SETTINGS, statureCm: 175, externalLoadKg: 12 }), [track])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [t, setT] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    let lastUi = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const time = (((now - start) / 1000) * 1.6) % track.duration
      const c = canvasRef.current
      if (!c) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = c.clientWidth
      const H = c.clientHeight
      if (c.width !== Math.round(W * dpr)) {
        c.width = Math.round(W * dpr)
        c.height = Math.round(H * dpr)
      }
      const ctx = c.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const ch = H
      const cw = ch * (track.width / track.height)
      const cx = (W - cw) / 2
      drawSyntheticBackdrop(ctx, W, H, 0.93 * ch)
      const fi = time * track.sampleFps
      const i0 = Math.floor(fi)
      const frame = lerpFrame(track.frames[i0], track.frames[Math.min(track.frames.length - 1, i0 + 1)], fi - i0)
      const rep = analysis.reps.find((r) => time >= r.start && time <= r.end + 0.4)
      let hl
      if (rep && !rep.isBaseline && rep.worstLevel !== 'ok') {
        const top = Object.entries(rep.deviations).find(([, d]) => d?.level === rep.worstLevel)
        hl = highlightFor(top?.[0], LEVEL_COLOR[rep.worstLevel])
      }
      if (frame) {
        drawPose(ctx, frame, { x: cx, y: 0, w: cw, h: ch, mannequin: true, highlight: hl })
        drawPose(ctx, frame, { x: cx, y: 0, w: cw, h: ch, highlight: hl, minVis: 0.7 })
      }
      if (now - lastUi > 80) {
        lastUi = now
        setT(time)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [analysis, track])

  const completed = analysis.reps.filter((r) => r.end <= t).length
  const last = [...analysis.reps].reverse().find((r) => r.end <= t)
  const calibrating = completed < analysis.baselineCount
  const color = calibrating || !last ? LEVEL_COLOR.base : LEVEL_COLOR[last.worstLevel]
  const label = calibrating || !last ? 'Calibrating' : LEVEL_LABEL[last.worstLevel]
  const cue = analysis.cues.find((c) => c.delivered && t >= c.t && t < c.t + 2.2)

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-[0_30px_80px_-30px_rgba(61,214,239,0.35)]">
      <canvas ref={canvasRef} className="block aspect-[4/3] w-full" />
      <div className="absolute top-4 left-4 rounded-xl bg-black/50 px-3 py-2 backdrop-blur">
        <div className="text-[10px] font-semibold tracking-[0.2em] text-ink-300 uppercase">Rep</div>
        <div className="num text-3xl leading-none font-bold">
          {completed}
          <span className="text-base text-ink-400">/{analysis.reps.length}</span>
        </div>
      </div>
      <div className="absolute top-4 right-4 flex flex-col items-center gap-1.5">
        <div className="h-16 w-16 rounded-full border-[6px] transition-colors duration-300" style={{ borderColor: color, background: `${color}22` }} />
        <span className="rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      {cue && (
        <div key={cue.rep} className="animate-pop absolute inset-x-0 bottom-5 flex justify-center">
          <span
            className="rounded-2xl px-5 py-2.5 text-xl font-extrabold tracking-wide text-ink-950 uppercase"
            style={{ background: cue.level === 'info' ? '#818cf8' : cue.level === 'major' ? '#fb7185' : '#fbbf24' }}
          >
            {cue.text}
          </span>
        </div>
      )}
      <span className="chip absolute bottom-4 left-4 border-violet-400/40 bg-violet-400/10 text-violet-300">Simulated preview</span>
    </div>
  )
}
