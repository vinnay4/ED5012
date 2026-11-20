import { DRILLIS_CONTINI } from '../analysis/anthropometry'
import type { GroundTruthRep, PoseFrame, PoseTrack } from '../pose/types'

/**
 * Synthetic squat-set generator used for demonstration and for functional
 * evaluation with known ground truth. A 3D stick model scaled with
 * Drillis–Contini segment proportions performs a set in which technique
 * faults are injected progressively (fatigue scenario). Landmarks are
 * projected to a side or front camera and perturbed with Gaussian noise that
 * resembles pose-estimation jitter, then fed through the exact same analysis
 * pipeline as real video.
 */

type Vec = [number, number, number]

export interface RepPlan {
  depthK: number
  leanDelta: number
  ascentSlow: number
  valgus: number
  shift: number
}

export const FATIGUE_PLAN: RepPlan[] = [
  { depthK: 1.0, leanDelta: 0, ascentSlow: 1.0, valgus: 0, shift: 0 },
  { depthK: 0.99, leanDelta: 1, ascentSlow: 1.02, valgus: 0, shift: 0 },
  { depthK: 1.01, leanDelta: 0, ascentSlow: 1.03, valgus: 0, shift: 0 },
  { depthK: 0.98, leanDelta: 2, ascentSlow: 1.04, valgus: 0.004, shift: 0.004 },
  { depthK: 0.96, leanDelta: 4, ascentSlow: 1.07, valgus: 0.008, shift: 0.008 },
  { depthK: 0.88, leanDelta: 8, ascentSlow: 1.18, valgus: 0.014, shift: 0.014 },
  { depthK: 0.84, leanDelta: 14, ascentSlow: 1.28, valgus: 0.026, shift: 0.02 },
  { depthK: 0.77, leanDelta: 18, ascentSlow: 1.38, valgus: 0.032, shift: 0.034 },
  { depthK: 0.74, leanDelta: 25, ascentSlow: 1.5, valgus: 0.048, shift: 0.044 },
  { depthK: 0.72, leanDelta: 27, ascentSlow: 1.62, valgus: 0.056, shift: 0.058 },
]

export interface SyntheticOptions {
  camera: 'side' | 'front'
  statureM?: number
  fps?: number
  noisePx?: number
  seed?: number
  plan?: RepPlan[]
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rand: () => number) {
  const u = Math.max(1e-9, rand())
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k]
const deg = Math.PI / 180

interface Pose3D {
  pts: Vec[]
}

const BASE = { thetaMax: 100, alphaMax: 34, lean0: 4, leanMax: 34 }

/** 3D joint positions (metres; x = subject's left, y = up, z = forward). */
function pose3d(s: number, plan: RepPlan, H: number): Pose3D {
  const shank = DRILLIS_CONTINI.shank * H
  const thigh = DRILLIS_CONTINI.thigh * H
  const trunk = DRILLIS_CONTINI.trunk * H
  const upperArm = DRILLIS_CONTINI.upperArm * H
  const forearm = DRILLIS_CONTINI.forearm * H
  const ankleH = 0.039 * H
  const hipHalf = 0.055 * H
  const shoulderHalf = 0.105 * H
  const footX = 0.095 * H

  const theta = s * BASE.thetaMax * plan.depthK * deg
  const alpha = s * BASE.alphaMax * plan.depthK * deg
  const lean = (BASE.lean0 + s * (BASE.leanMax - BASE.lean0) * plan.depthK + s * plan.leanDelta) * deg
  const kneeOut = 0.02 * s
  const valgus = plan.valgus * s
  const shift = plan.shift * s

  const pts: Vec[] = new Array(33).fill(null).map(() => [0, 0, 0] as Vec)
  const leg = (side: 1 | -1) => {
    const ankle: Vec = [side * footX, ankleH, 0]
    const knee: Vec = [side * (footX + kneeOut - valgus), ankleH + shank * Math.cos(alpha), shank * Math.sin(alpha)]
    const hipY = knee[1] + thigh * Math.cos(theta)
    const hipZ = knee[2] - thigh * Math.sin(theta)
    const heel: Vec = [side * footX, 0.012 * H, -0.045 * H]
    const toe: Vec = [side * (footX + Math.sin(18 * deg) * 0.11 * H), 0.008 * H, 0.105 * H]
    return { ankle, knee, hipY, hipZ, heel, toe }
  }
  const L = leg(1)
  const R = leg(-1)
  const pelvis: Vec = [shift, (L.hipY + R.hipY) / 2, (L.hipZ + R.hipZ) / 2]
  const lHip: Vec = [pelvis[0] + hipHalf, pelvis[1], pelvis[2]]
  const rHip: Vec = [pelvis[0] - hipHalf, pelvis[1], pelvis[2]]
  const up: Vec = [0, Math.cos(lean), Math.sin(lean)]
  const fwd: Vec = [0, -Math.sin(lean), Math.cos(lean)]
  const chest = add(pelvis, scale(up, trunk))
  const lSh: Vec = [chest[0] + shoulderHalf, chest[1], chest[2]]
  const rSh: Vec = [chest[0] - shoulderHalf, chest[1], chest[2]]
  const elbow = (sh: Vec, side: 1 | -1): Vec => add(add(sh, scale(add(scale(up, -0.8), scale(fwd, 0.6)), upperArm)), [-side * 0.03 * H, 0, 0])
  const wrist = (el: Vec, side: 1 | -1): Vec => add(add(el, scale(add(scale(up, 0.82), scale(fwd, 0.4)), forearm)), [-side * 0.035 * H, 0, 0])
  const lEl = elbow(lSh, 1)
  const rEl = elbow(rSh, -1)
  const lWr = wrist(lEl, 1)
  const rWr = wrist(rEl, -1)
  const neck = add(chest, scale(up, 0.06 * H))
  const ear = (side: 1 | -1): Vec => add(add(neck, scale(up, 0.035 * H)), [side * 0.045 * H, 0, 0])
  const nose = add(add(neck, scale(up, 0.03 * H)), scale(fwd, 0.07 * H))

  pts[0] = nose
  for (let i = 1; i <= 6; i++) pts[i] = add(nose, [(i <= 3 ? 1 : -1) * 0.02 * H, 0.015 * H, -0.01 * H])
  pts[7] = ear(1)
  pts[8] = ear(-1)
  pts[9] = add(nose, [0.012 * H, -0.02 * H, 0])
  pts[10] = add(nose, [-0.012 * H, -0.02 * H, 0])
  pts[11] = lSh
  pts[12] = rSh
  pts[13] = lEl
  pts[14] = rEl
  pts[15] = lWr
  pts[16] = rWr
  for (const [i, w] of [
    [17, lWr],
    [19, lWr],
    [21, lWr],
    [18, rWr],
    [20, rWr],
    [22, rWr],
  ] as [number, Vec][])
    pts[i] = add(w, scale(up, 0.03 * H))
  pts[23] = lHip
  pts[24] = rHip
  pts[25] = L.knee
  pts[26] = R.knee
  pts[27] = L.ankle
  pts[28] = R.ankle
  pts[29] = L.heel
  pts[30] = R.heel
  pts[31] = L.toe
  pts[32] = R.toe
  return { pts }
}

/** Smooth 0→1 easing used for each movement phase. */
const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, u)))

interface RepTiming {
  start: number
  downEnd: number
  upStart: number
  end: number
}

function buildTimeline(plan: RepPlan[]) {
  const reps: RepTiming[] = []
  let t = 1.2
  for (const p of plan) {
    const descent = 1.6
    const pause = 0.3
    const ascent = 1.25 * p.ascentSlow
    reps.push({ start: t, downEnd: t + descent, upStart: t + descent + pause, end: t + descent + pause + ascent })
    t += descent + pause + ascent + 1.0
  }
  return { reps, duration: t + 0.6 }
}

function phaseAt(t: number, reps: RepTiming[]): { s: number; rep: number } {
  for (let i = 0; i < reps.length; i++) {
    const r = reps[i]
    if (t < r.start) return { s: 0, rep: Math.max(0, i - 1) }
    if (t <= r.downEnd) return { s: ease((t - r.start) / (r.downEnd - r.start)), rep: i }
    if (t <= r.upStart) return { s: 1, rep: i }
    if (t <= r.end) return { s: 1 - ease((t - r.upStart) / (r.end - r.upStart)), rep: i }
  }
  return { s: 0, rep: reps.length - 1 }
}

function project(p: Vec, camera: 'side' | 'front', W: number, Hpx: number, k: number): [number, number] {
  const ground = 0.93 * Hpx
  if (camera === 'side') return [W * 0.45 + p[2] * k, ground - p[1] * k]
  return [W / 2 - p[0] * k, ground - p[1] * k]
}

export function generateSyntheticTrack(opts: SyntheticOptions): PoseTrack {
  const H = opts.statureM ?? 1.75
  const fps = opts.fps ?? 15
  const plan = opts.plan ?? FATIGUE_PLAN
  const noise = opts.noisePx ?? 2.2
  const rand = mulberry32(opts.seed ?? (opts.camera === 'side' ? 7 : 11))
  const W = 640
  const Hpx = 480
  const k = (0.84 * Hpx) / H
  const { reps, duration } = buildTimeline(plan)
  const frames: PoseFrame[] = []
  const n = Math.floor(duration * fps)
  for (let i = 0; i < n; i++) {
    const t = i / fps
    const { s, rep } = phaseAt(t, reps)
    const { pts } = pose3d(s, plan[rep], H)
    const lm: number[] = []
    const wl: number[] = []
    const pelvis = [(pts[23][0] + pts[24][0]) / 2, (pts[23][1] + pts[24][1]) / 2, (pts[23][2] + pts[24][2]) / 2]
    pts.forEach((p, j) => {
      const [u, v] = project(p, opts.camera, W, Hpx, k)
      const far = opts.camera === 'side' && j > 10 && j % 2 === 0
      const vis = far ? 0.5 + rand() * 0.1 : 0.95 + rand() * 0.04
      const jitter = noise * (far ? 1.6 : 1)
      lm.push(+((u + gaussian(rand) * jitter) / W).toFixed(4), +((v + gaussian(rand) * jitter) / Hpx).toFixed(4), 0, +vis.toFixed(3))
      wl.push(
        +(p[0] - pelvis[0] + gaussian(rand) * 0.008).toFixed(4),
        +(-(p[1] - pelvis[1]) + gaussian(rand) * 0.008).toFixed(4),
        +(p[2] - pelvis[2] + gaussian(rand) * 0.008).toFixed(4),
      )
    })
    frames.push({ t: +t.toFixed(3), lm, wl })
  }
  return {
    version: 1,
    source: 'synthetic',
    model: `Synthetic 3D squat model (stature ${H} m, ${opts.camera} camera, ${noise}px noise)`,
    width: W,
    height: Hpx,
    duration: +(n / fps).toFixed(3),
    sampleFps: fps,
    frames,
    groundTruth: groundTruth(plan, reps, H, opts.camera, W, Hpx, k),
  }
}

/** True metric values from the noise-free model, for evaluation. */
function groundTruth(plan: RepPlan[], reps: RepTiming[], H: number, camera: 'side' | 'front', W: number, Hpx: number, k: number): GroundTruthRep[] {
  const legLen = (DRILLIS_CONTINI.thigh + DRILLIS_CONTINI.shank) * H
  const stand = pose3d(0, plan[0], H).pts
  const standHipY = stand[23][1]
  const stance = Math.abs(stand[27][0] - stand[28][0])
  return reps.map((r, i) => {
    const p = plan[i]
    const bottom = pose3d(1, p, H).pts
    const drop = standHipY - bottom[23][1]
    const depth = (drop / legLen) * 100
    // Velocity between the 90 % and 15 % hip-drop crossings, sampled finely.
    let tHi = r.upStart
    let tLo = r.end
    for (let t = r.upStart; t <= r.end; t += 0.001) {
      const s = 1 - ease((t - r.upStart) / (r.end - r.upStart))
      const d = standHipY - pose3d(s, p, H).pts[23][1]
      if (d <= 0.9 * drop && tHi === r.upStart) tHi = t
      if (d <= 0.15 * drop) {
        tLo = t
        break
      }
    }
    const velocity = (0.75 * drop) / (tLo - tHi)
    const values: GroundTruthRep['values'] = { depth, velocity }
    if (camera === 'side') {
      values.trunkLean = BASE.lean0 + (BASE.leanMax - BASE.lean0) * p.depthK + p.leanDelta
    } else {
      const pr = (j: number) => {
        const [x, y] = project(bottom[j], 'front', W, Hpx, k)
        return { x, y }
      }
      values.kneeValgus = (Math.abs(pr(25).x - pr(26).x) / Math.abs(pr(27).x - pr(28).x)) * 100
      values.hipShift = (Math.abs(p.shift) / stance) * 100
    }
    return {
      rep: i + 1,
      start: r.start,
      end: r.end,
      values,
      injected: { ...p },
    }
  })
}
