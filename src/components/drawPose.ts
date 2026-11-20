import { SKELETON_EDGES, type PoseFrame } from '../lib/pose/types'

export type Highlight = { joints: number[]; color: string }

const LIMB_GROUPS: Record<string, number[]> = {
  depth: [23, 24, 25, 26],
  trunkLean: [11, 12, 23, 24],
  kneeValgus: [25, 26, 27, 28],
  hipShift: [23, 24],
  velocity: [23, 24],
  pattern: [23, 24],
}

export function highlightFor(metric: string | undefined, color: string): Highlight | undefined {
  if (!metric || !LIMB_GROUPS[metric]) return undefined
  return { joints: LIMB_GROUPS[metric], color }
}

/** Linear interpolation between two frames for smooth playback. */
export function lerpFrame(a: PoseFrame | null, b: PoseFrame | null, f: number): PoseFrame | null {
  if (!a) return b
  if (!b || f <= 0) return a
  const lm = a.lm.map((v, i) => (i % 4 === 3 ? Math.min(v, b.lm[i]) : v + (b.lm[i] - v) * f))
  return { t: a.t + (b.t - a.t) * f, lm, wl: a.wl }
}

interface DrawOpts {
  /** Drawing rectangle within the canvas, in CSS pixels. */
  x: number
  y: number
  w: number
  h: number
  mannequin?: boolean
  highlight?: Highlight
  minVis?: number
}

export function drawPose(ctx: CanvasRenderingContext2D, frame: PoseFrame, o: DrawOpts) {
  const P = (i: number) => ({ x: o.x + frame.lm[i * 4] * o.w, y: o.y + frame.lm[i * 4 + 1] * o.h, v: frame.lm[i * 4 + 3] })
  const minVis = o.minVis ?? 0.3
  const scale = Math.max(1, o.h / 480)
  const hl = new Set(o.highlight?.joints ?? [])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (o.mannequin) {
    // Draw far-side limbs first (dimmer) for a sense of depth.
    const order = [...SKELETON_EDGES].sort((e1, e2) => P(e1[0]).v + P(e1[1]).v - (P(e2[0]).v + P(e2[1]).v))
    for (const [a, b] of order) {
      if (a <= 10 || b <= 10) continue
      const pa = P(a)
      const pb = P(b)
      const dim = (pa.v + pb.v) / 2 < 0.75
      const isHl = hl.has(a) && hl.has(b)
      ctx.strokeStyle = isHl ? o.highlight!.color : dim ? 'rgba(148,163,184,0.35)' : 'rgba(226,232,240,0.92)'
      ctx.lineWidth = (a === 11 && b === 12) || (a === 23 && b === 24) ? 10 * scale : 13 * scale
      if (a === 11 && b === 23) ctx.lineWidth = 16 * scale
      if (a === 12 && b === 24) ctx.lineWidth = 16 * scale
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
    }
    const nose = P(0)
    const ls = P(11)
    const rs = P(12)
    const neck = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 }
    const head = { x: neck.x + (nose.x - neck.x) * 0.9, y: neck.y + (nose.y - neck.y) * 1.25 }
    ctx.fillStyle = 'rgba(226,232,240,0.92)'
    ctx.beginPath()
    ctx.arc(head.x, head.y, 15 * scale, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  for (const [a, b] of SKELETON_EDGES) {
    const pa = P(a)
    const pb = P(b)
    if (pa.v < minVis || pb.v < minVis) continue
    const isHl = hl.has(a) && hl.has(b)
    ctx.strokeStyle = isHl ? o.highlight!.color : 'rgba(255,255,255,0.85)'
    ctx.lineWidth = (isHl ? 5 : 3) * scale
    ctx.shadowColor = 'rgba(0,0,0,0.6)'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  for (let i = 11; i < 33; i++) {
    if (i >= 17 && i <= 22) continue
    const p = P(i)
    if (p.v < minVis) continue
    ctx.fillStyle = hl.has(i) ? o.highlight!.color : '#3dd6ef'
    ctx.beginPath()
    ctx.arc(p.x, p.y, (hl.has(i) ? 5.5 : 4) * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(7,10,16,0.8)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

export function drawSyntheticBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, groundY: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#0f1724')
  g.addColorStop(1, '#0a0f18')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(148,163,184,0.06)'
  ctx.lineWidth = 1
  const step = Math.max(24, h / 16)
  for (let x = 0; x < w; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(61,214,239,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, groundY)
  ctx.lineTo(w, groundY)
  ctx.stroke()
}
