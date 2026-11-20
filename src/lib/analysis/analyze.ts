import { LM, getPoint, getWorld, type PoseFrame, type PoseTrack } from '../pose/types'
import { angle2, angle3, angleFromVertical, dist, mid, type V2 } from './geometry'
import { fillGaps, linearFit, mean, median, percentile, resample, smooth } from './signal'
import { dtwDistance } from './dtw'
import { LEVEL_RANK, METRICS, METRIC_ORDER, type Level, type MetricId, type ViewType } from './metrics'
import { buildCues, type Cue, type FeedbackMode } from './feedback'
import { estimateAnthropometry, type AnthropometryEstimate } from './anthropometry'
import { lumbarLoad, type LumbarEstimate } from './biomech'

export interface AnalysisSettings {
  statureCm: number
  massKg: number
  externalLoadKg: number
  /** 0 = automatic (3 for long sets, fewer for short ones). */
  baselineReps: number
  feedbackMode: FeedbackMode
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
  statureCm: 170,
  massKg: 70,
  externalLoadKg: 0,
  baselineReps: 0,
  feedbackMode: 'combined',
}

export interface RepMetrics {
  depth?: number
  trunkLean?: number
  kneeValgus?: number
  hipShift?: number
  velocity?: number
  pattern?: number
  kneeMin?: number
  kneeAsym?: number
  descentS: number
  pauseS: number
  ascentS: number
}

export interface Deviation {
  value: number
  baseline: number
  /** Deterioration in threshold units (% for relative metrics); negative means better than baseline. */
  dev: number
  level: Level
}

export interface Rep {
  index: number
  start: number
  bottom: number
  end: number
  startFrame: number
  bottomFrame: number
  endFrame: number
  metrics: RepMetrics
  deviations: Partial<Record<MetricId, Deviation>>
  score: number
  isBaseline: boolean
  confidence: number
  lowConfidence: boolean
  lumbar?: LumbarEstimate
  worstLevel: Level
}

export interface Issue {
  metric: MetricId
  worstLevel: Level
  reps: number[]
  firstRep: number
  maxDev: number
}

export interface ViewInfo {
  type: ViewType
  ratio: number
  nearSide: 'left' | 'right'
  facing: 'left' | 'right' | 'camera'
  label: string
}

export interface SessionAnalysis {
  ok: boolean
  error?: string
  view: ViewInfo
  quality: { detectedPct: number; meanVisibility: number; fullBodyPct: number; warnings: string[] }
  timeline: { t: number[]; depth: number[]; kneeAngle: number[]; trunkLean: number[]; kneeRatio: number[] }
  reps: Rep[]
  baselineCount: number
  baseline: Partial<Record<MetricId, number>>
  available: MetricId[]
  unavailable: { id: MetricId; reason: string }[]
  trend: { slope: number; intercept: number; r2: number }
  driftOnsetRep: number | null
  fatigueRep: number | null
  issues: Issue[]
  cues: Cue[]
  anthropometry: AnthropometryEstimate
  settings: AnalysisSettings
  summary: { meanScore: number; baselineScore: number; postBaselineScore: number; flaggedReps: number; worstRep: number | null }
  source: PoseTrack['source']
  model?: string
}

const KEY_LANDMARKS = [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE]

function px(frame: PoseFrame, i: number, W: number, H: number): V2 & { v: number } {
  const p = getPoint(frame, i)
  return { x: p.x * W, y: p.y * H, v: p.v }
}

function classifyView(frames: (PoseFrame | null)[], W: number, H: number): ViewInfo {
  const ratios: number[] = []
  let visL = 0
  let visR = 0
  const footDir: number[] = []
  for (const f of frames) {
    if (!f) continue
    const ls = px(f, LM.LEFT_SHOULDER, W, H)
    const rs = px(f, LM.RIGHT_SHOULDER, W, H)
    const lh = px(f, LM.LEFT_HIP, W, H)
    const rh = px(f, LM.RIGHT_HIP, W, H)
    const torso = dist(mid(ls, rs), mid(lh, rh))
    if (torso > 1) ratios.push((Math.abs(ls.x - rs.x) + Math.abs(lh.x - rh.x)) / 2 / torso)
    visL += (lh.v + px(f, LM.LEFT_KNEE, W, H).v + px(f, LM.LEFT_ANKLE, W, H).v) / 3
    visR += (rh.v + px(f, LM.RIGHT_KNEE, W, H).v + px(f, LM.RIGHT_ANKLE, W, H).v) / 3
  }
  const nearSide = visL >= visR ? 'left' : 'right'
  for (const f of frames) {
    if (!f) continue
    const heel = px(f, nearSide === 'left' ? LM.LEFT_HEEL : LM.RIGHT_HEEL, W, H)
    const toe = px(f, nearSide === 'left' ? LM.LEFT_FOOT : LM.RIGHT_FOOT, W, H)
    footDir.push(toe.x - heel.x)
  }
  const ratio = median(ratios)
  const type: ViewType = ratio < 0.28 ? 'side' : ratio >= 0.5 ? 'front' : 'oblique'
  const fd = median(footDir)
  const facing = type === 'front' ? 'camera' : fd >= 0 ? 'right' : 'left'
  const label = type === 'side' ? `Side view (sagittal plane), facing ${facing}` : type === 'front' ? 'Front view (frontal plane)' : 'Oblique view (about 30–60° to the camera)'
  return { type, ratio, nearSide, facing, label }
}

export function defaultBaselineCount(nReps: number) {
  if (nReps >= 6) return 3
  if (nReps >= 4) return 2
  if (nReps >= 2) return 1
  return 0
}

interface RawSeries {
  hipY: number[]
  legLen: number[]
  kneeAngle: number[]
  trunkLean: number[]
  kneeRatio: number[]
  hipShiftPx: number[]
  stance: number[]
  kneeAsym: number[]
  vis: number[]
}

function buildSeries(track: PoseTrack, view: ViewInfo): RawSeries {
  const { width: W, height: H } = track
  const near = view.nearSide === 'left'
  const S = near ? LM.LEFT_SHOULDER : LM.RIGHT_SHOULDER
  const Hp = near ? LM.LEFT_HIP : LM.RIGHT_HIP
  const K = near ? LM.LEFT_KNEE : LM.RIGHT_KNEE
  const A = near ? LM.LEFT_ANKLE : LM.RIGHT_ANKLE
  const out: RawSeries = { hipY: [], legLen: [], kneeAngle: [], trunkLean: [], kneeRatio: [], hipShiftPx: [], stance: [], kneeAsym: [], vis: [] }
  for (const f of track.frames) {
    if (!f) {
      for (const k of Object.keys(out) as (keyof RawSeries)[]) out[k].push(NaN)
      continue
    }
    out.vis.push(mean(KEY_LANDMARKS.map((i) => getPoint(f, i).v)))
    const lh = px(f, LM.LEFT_HIP, W, H)
    const rh = px(f, LM.RIGHT_HIP, W, H)
    const lk = px(f, LM.LEFT_KNEE, W, H)
    const rk = px(f, LM.RIGHT_KNEE, W, H)
    const la = px(f, LM.LEFT_ANKLE, W, H)
    const ra = px(f, LM.RIGHT_ANKLE, W, H)
    const wl = (i: number) => getWorld(f, i)
    const kneeL3 = angle3(wl(LM.LEFT_HIP), wl(LM.LEFT_KNEE), wl(LM.LEFT_ANKLE))
    const kneeR3 = angle3(wl(LM.RIGHT_HIP), wl(LM.RIGHT_KNEE), wl(LM.RIGHT_ANKLE))
    out.kneeAsym.push(Math.abs(kneeL3 - kneeR3))
    if (view.type === 'side') {
      const s = px(f, S, W, H)
      const h = px(f, Hp, W, H)
      const k = px(f, K, W, H)
      const a = px(f, A, W, H)
      out.hipY.push(h.y)
      out.legLen.push(dist(h, k) + dist(k, a))
      out.kneeAngle.push(angle2(h, k, a))
      out.trunkLean.push(angleFromVertical(s, h))
      out.kneeRatio.push(NaN)
      out.hipShiftPx.push(NaN)
      out.stance.push(NaN)
    } else {
      const midHip = mid(lh, rh)
      const midAnkle = mid(la, ra)
      out.hipY.push(midHip.y)
      out.legLen.push((dist(lh, lk) + dist(lk, la) + dist(rh, rk) + dist(rk, ra)) / 2)
      out.kneeAngle.push((kneeL3 + kneeR3) / 2)
      const ls = px(f, LM.LEFT_SHOULDER, W, H)
      const rs = px(f, LM.RIGHT_SHOULDER, W, H)
      out.trunkLean.push(angleFromVertical(mid(ls, rs), midHip))
      if (view.type === 'front') {
        const ankleSep = Math.abs(la.x - ra.x)
        out.kneeRatio.push(ankleSep > 1 ? (Math.abs(lk.x - rk.x) / ankleSep) * 100 : NaN)
        out.hipShiftPx.push(midHip.x - midAnkle.x)
        out.stance.push(Math.abs(la.x - ra.x))
      } else {
        out.kneeRatio.push(NaN)
        out.hipShiftPx.push(NaN)
        out.stance.push(NaN)
      }
    }
  }
  return out
}

interface Segment {
  start: number
  bottom: number
  end: number
  first95: number
  last95: number
  peak: number
}

function segmentReps(depth: number[], fps: number, kneeAngle: number[]): Segment[] {
  const detect = smooth(depth, Math.max(1, fps * 0.12))
  const R = percentile(detect, 0.98)
  if (!Number.isFinite(R) || R < 0.08) return []
  const coreThr = 0.35 * R
  const minCore = Math.round(0.2 * fps)
  const cores: [number, number][] = []
  let s = -1
  for (let i = 0; i <= detect.length; i++) {
    const above = i < detect.length && detect[i] > coreThr
    if (above && s < 0) s = i
    if (!above && s >= 0) {
      if (i - s >= minCore) cores.push([s, i - 1])
      s = -1
    }
  }
  // Merge cores split by a brief dip (e.g. a bounce out of the hole).
  const merged: [number, number][] = []
  for (const c of cores) {
    const last = merged[merged.length - 1]
    if (last && c[0] - last[1] < 0.3 * fps) last[1] = c[1]
    else merged.push([c[0], c[1]])
  }
  const segs: Segment[] = []
  let prevEnd = 0
  for (let k = 0; k < merged.length; k++) {
    const [c0, c1] = merged[k]
    const nextStart = k + 1 < merged.length ? merged[k + 1][0] : detect.length - 1
    let bottom = c0
    for (let i = c0; i <= c1; i++) if (detect[i] > detect[bottom]) bottom = i
    const peak = depth[bottom]
    const low = 0.1 * peak
    let start = c0
    while (start > prevEnd && detect[start - 1] <= detect[start] + 1e-4 && depth[start] > low) start--
    let end = c1
    while (end < nextStart && detect[end + 1] <= detect[end] + 1e-4 && depth[end] > low) end++
    let first95 = bottom
    while (first95 > start && depth[first95 - 1] >= 0.92 * peak) first95--
    let last95 = bottom
    while (last95 < end && depth[last95 + 1] >= 0.92 * peak) last95++
    // A bend with almost straight knees (e.g. picking up a weight) is a hinge,
    // not a squat rep.
    const minKnee = Math.min(...kneeAngle.slice(start, end + 1).filter(Number.isFinite))
    const incomplete = !(depth[start] < 0.5 * peak) || !(depth[end] < 0.5 * peak)
    if ((Number.isFinite(minKnee) && minKnee > 140) || incomplete) {
      prevEnd = end
      continue
    }
    segs.push({ start, bottom, end, first95, last95, peak })
    prevEnd = end
  }
  return segs
}

/**
 * Time (s) at which `values` crosses `level`, scanning from `from` toward
 * `to` (either direction) and interpolating between the bracketing samples.
 */
function crossing(values: number[], from: number, to: number, level: number, fps: number) {
  const step = to >= from ? 1 : -1
  for (let i = from; i !== to; i += step) {
    const a = values[i]
    const b = values[i + step]
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    if ((a - level) * (b - level) <= 0 && a !== b) {
      const f = (level - a) / (b - a)
      return (i + f * step) / fps
    }
  }
  return from / fps
}

export function deviation(id: MetricId, value: number | undefined, base: number | undefined): Deviation | undefined {
  if (value === undefined || base === undefined || !Number.isFinite(value) || !Number.isFinite(base)) return undefined
  const d = METRICS[id]
  let dev: number
  if (d.mode === 'relative') {
    if (Math.abs(base) < 1e-6) return undefined
    dev = ((d.worse === 'lower' ? base - value : value - base) / Math.abs(base)) * 100
  } else {
    dev = d.worse === 'lower' ? base - value : value - base
  }
  const level: Level = dev >= d.major ? 'major' : dev >= d.minor ? 'minor' : 'ok'
  return { value, baseline: base, dev, level }
}

export function analyzeTrack(track: PoseTrack, settings: AnalysisSettings = DEFAULT_SETTINGS): SessionAnalysis {
  const fps = track.sampleFps
  const t = track.frames.map((_, i) => i / fps)
  const detected = track.frames.filter(Boolean).length
  const emptyAnthro = estimateAnthropometry([], settings.statureCm)
  const fail = (error: string): SessionAnalysis => ({
    ok: false,
    error,
    view: { type: 'oblique', ratio: NaN, nearSide: 'left', facing: 'camera', label: 'Unknown' },
    quality: { detectedPct: (detected / Math.max(1, track.frames.length)) * 100, meanVisibility: 0, fullBodyPct: 0, warnings: [] },
    timeline: { t, depth: [], kneeAngle: [], trunkLean: [], kneeRatio: [] },
    reps: [],
    baselineCount: 0,
    baseline: {},
    available: [],
    unavailable: [],
    trend: { slope: 0, intercept: 0, r2: 0 },
    driftOnsetRep: null,
    fatigueRep: null,
    issues: [],
    cues: [],
    anthropometry: emptyAnthro,
    settings,
    summary: { meanScore: NaN, baselineScore: NaN, postBaselineScore: NaN, flaggedReps: 0, worstRep: null },
    source: track.source,
    model: track.model,
  })
  if (detected < fps * 2) return fail('No person was detected for long enough. Make sure the whole body is visible and well lit.')

  const view = classifyView(track.frames, track.width, track.height)
  const raw = buildSeries(track, view)
  const maxGap = Math.round(fps * 0.6)
  const sigma = Math.max(0.8, fps * 0.06)
  const prep = (v: number[]) => smooth(fillGaps(v, maxGap), sigma)
  const hipY = prep(raw.hipY)
  const kneeAngle = prep(raw.kneeAngle)
  const trunkLean = prep(raw.trunkLean)
  const kneeRatio = prep(raw.kneeRatio)
  const hipShiftPx = prep(raw.hipShiftPx)
  const kneeAsym = prep(raw.kneeAsym)

  // Standing reference: hips highest (smallest image y) for a sustained period.
  const standingHipY = percentile(hipY, 0.08)
  const range = percentile(hipY, 0.98) - standingHipY
  const standingIdx = hipY.map((y, i) => (y <= standingHipY + 0.08 * range ? i : -1)).filter((i) => i >= 0)
  const legLenPx = median(standingIdx.map((i) => raw.legLen[i]))
  const stancePx = median(standingIdx.map((i) => raw.stance[i]))
  const depth = hipY.map((y) => (y - standingHipY) / legLenPx)

  const fullBody = track.frames.filter((f) => f && getPoint(f, LM.LEFT_ANKLE).v > 0.5 && getPoint(f, LM.RIGHT_ANKLE).v > 0.3).length
  const warnings: string[] = []
  const detectedPct = (detected / track.frames.length) * 100
  const meanVis = mean(raw.vis)
  const fullBodyPct = (fullBody / Math.max(1, detected)) * 100
  if (detectedPct < 85) warnings.push(`A person was detected in only ${detectedPct.toFixed(0)} % of frames; gaps were interpolated.`)
  if (fullBodyPct < 70) warnings.push('Feet and ankles are often not visible. Keep the whole body in frame for reliable depth.')
  if (view.type === 'oblique') warnings.push('Camera is at an angle. Trunk lean and knee valgus need a pure side or front view, so they were not measured.')

  const segs = segmentReps(depth, fps, kneeAngle)
  if (segs.length === 0) return { ...fail('No squat repetitions were found in this clip.'), view, quality: { detectedPct, meanVisibility: meanVis, fullBodyPct, warnings } }

  const statureM = settings.statureCm / 100
  const legLenM = (0.245 + 0.246) * statureM

  const reps: Rep[] = segs.map((s, idx) => {
    const sl = <T>(arr: T[], a = s.start, b = s.end) => arr.slice(a, b + 1)
    const bottomRegion = depth.map((d, i) => (i >= s.start && i <= s.end && d > 0.6 * s.peak ? i : -1)).filter((i) => i >= 0)
    // Sub-frame crossing times (linear interpolation) so tempo and velocity are
    // not quantised to the sampling interval.
    const hi = 0.9 * s.peak
    const lo = 0.15 * s.peak
    const tStart = crossing(depth, s.start, s.first95, lo, fps)
    const tDown = crossing(depth, s.start, s.first95, hi, fps)
    const tUp = crossing(depth, s.end, s.last95, hi, fps)
    const tEnd = crossing(depth, s.end, s.last95, lo, fps)
    const descentS = Math.max(0, tDown - tStart)
    const pauseS = Math.max(0, tUp - tDown)
    const ascentS = Math.max(0.5 / fps, tEnd - tUp)
    const ascentTravel = (hi - lo) * legLenM
    const metrics: RepMetrics = {
      depth: s.peak * 100,
      kneeMin: Math.min(...sl(kneeAngle).filter(Number.isFinite)),
      velocity: ascentTravel / ascentS,
      descentS,
      pauseS,
      ascentS,
      kneeAsym: mean(bottomRegion.map((i) => kneeAsym[i])),
    }
    if (view.type === 'side') metrics.trunkLean = Math.max(...sl(trunkLean).filter(Number.isFinite))
    if (view.type === 'front') {
      metrics.kneeValgus = median(bottomRegion.map((i) => kneeRatio[i]))
      metrics.hipShift = (median(bottomRegion.map((i) => Math.abs(hipShiftPx[i]))) / stancePx) * 100
    }
    const visRep = mean(sl(raw.vis))
    const detectedRep = sl(track.frames).filter(Boolean).length / (s.end - s.start + 1)
    const confidence = Math.max(0, Math.min(1, visRep * detectedRep))
    let lumbar: LumbarEstimate | undefined
    if (view.type === 'side' && metrics.trunkLean !== undefined) {
      lumbar = lumbarLoad({ trunkLeanDeg: metrics.trunkLean, statureM, massKg: settings.massKg, loadKg: settings.externalLoadKg })
    }
    return {
      index: idx + 1,
      start: t[s.start],
      bottom: t[s.bottom],
      end: t[s.end],
      startFrame: s.start,
      bottomFrame: s.bottom,
      endFrame: s.end,
      metrics,
      deviations: {},
      score: 100,
      isBaseline: false,
      confidence,
      lowConfidence: confidence < 0.45,
      lumbar,
      worstLevel: 'ok' as Level,
    }
  })

  // Personal baseline from the first reps of the set.
  const requested = settings.baselineReps > 0 ? settings.baselineReps : defaultBaselineCount(reps.length)
  const baselineCount = Math.max(0, Math.min(requested, reps.length - 1))
  reps.forEach((r, i) => (r.isBaseline = i < baselineCount))
  const baseReps = reps.filter((r) => r.isBaseline && !r.lowConfidence)
  const baseSet = baseReps.length ? baseReps : reps.slice(0, Math.max(1, baselineCount))

  // Movement-shape template for DTW similarity. Each rep's hip-height curve is
  // normalised by its own peak and duration so that depth and speed (scored
  // separately) are not double-counted; what remains is rhythm and shape.
  const curve = (r: Rep) => {
    const peak = (r.metrics.depth ?? 100) / 100 || 1
    return resample(depth.slice(r.startFrame, r.endFrame + 1), 50).map((v) => [v / peak])
  }
  const baseCurves = baseSet.map(curve)
  const template = baseCurves[0].map((_, i) => [mean(baseCurves.map((c) => c[i][0]))])
  for (const r of reps) {
    const d = dtwDistance(curve(r), template, 0.1)
    r.metrics.pattern = Number.isFinite(d) ? Math.max(0, 100 * (1 - d / 0.25)) : undefined
  }

  const available = METRIC_ORDER.filter((id) => METRICS[id].views.includes(view.type))
  const unavailable = METRIC_ORDER.filter((id) => !available.includes(id)).map((id) => ({
    id,
    reason: id === 'trunkLean' ? 'Needs a side (sagittal) view' : id === 'kneeValgus' || id === 'hipShift' ? 'Needs a front (frontal-plane) view' : 'Not measurable in this view',
  }))

  const baseline: Partial<Record<MetricId, number>> = {}
  for (const id of available) baseline[id] = median(baseSet.map((r) => r.metrics[id] as number))

  for (const r of reps) {
    let penalty = 0
    let worst: Level = 'ok'
    for (const id of available) {
      const dv = deviation(id, r.metrics[id], baseline[id])
      if (!dv) continue
      if (r.lowConfidence) dv.level = 'ok'
      r.deviations[id] = dv
      penalty += METRICS[id].weight * Math.min(1.2, Math.max(0, dv.dev) / METRICS[id].major)
      if (!r.isBaseline && LEVEL_RANK[dv.level] > LEVEL_RANK[worst]) worst = dv.level
    }
    r.score = Math.round(Math.max(0, Math.min(100, 100 - penalty)))
    r.worstLevel = worst
  }

  const evalReps = reps.filter((r) => !r.isBaseline)
  const flagged = (r: Rep) => (Object.entries(r.deviations) as [MetricId, Deviation][]).some(([id, d]) => METRICS[id].kind !== 'fatigue' && d.level !== 'ok')
  let driftOnsetRep: number | null = null
  for (let i = 0; i < evalReps.length; i++) {
    if (flagged(evalReps[i]) && (i === evalReps.length - 1 || flagged(evalReps[i + 1]))) {
      driftOnsetRep = evalReps[i].index
      break
    }
  }
  const fatigueRep = evalReps.find((r) => (r.deviations.velocity?.dev ?? 0) >= 20)?.index ?? null

  const issues: Issue[] = []
  for (const id of available) {
    const hits = evalReps.filter((r) => r.deviations[id] && r.deviations[id]!.level !== 'ok')
    if (!hits.length) continue
    const worstLevel = hits.some((r) => r.deviations[id]!.level === 'major') ? 'major' : 'minor'
    issues.push({
      metric: id,
      worstLevel,
      reps: hits.map((r) => r.index),
      firstRep: hits[0].index,
      maxDev: Math.max(...hits.map((r) => r.deviations[id]!.dev)),
    })
  }
  const kindRank = { safety: 0, technique: 1, fatigue: 2, consistency: 3 }
  issues.sort((a, b) => LEVEL_RANK[b.worstLevel] - LEVEL_RANK[a.worstLevel] || kindRank[METRICS[a.metric].kind] - kindRank[METRICS[b.metric].kind] || b.reps.length - a.reps.length)

  const scores = reps.map((r) => r.score)
  const trend = linearFit(scores)
  const cues = buildCues(reps, settings.feedbackMode)
  const worstRep = evalReps.length ? evalReps.reduce((a, b) => (b.score < a.score ? b : a)).index : null

  return {
    ok: true,
    view,
    quality: { detectedPct, meanVisibility: meanVis, fullBodyPct, warnings },
    timeline: { t, depth, kneeAngle, trunkLean, kneeRatio },
    reps,
    baselineCount,
    baseline,
    available,
    unavailable,
    trend,
    driftOnsetRep,
    fatigueRep,
    issues,
    cues,
    anthropometry: estimateAnthropometry(
      track.frames.filter((f, i): f is PoseFrame => !!f && standingIdx.includes(i)),
      settings.statureCm,
    ),
    settings,
    summary: {
      meanScore: mean(scores),
      baselineScore: mean(reps.filter((r) => r.isBaseline).map((r) => r.score)),
      postBaselineScore: mean(evalReps.map((r) => r.score)),
      flaggedReps: evalReps.filter((r) => r.worstLevel !== 'ok').length,
      worstRep,
    },
    source: track.source,
    model: track.model,
  }
}
