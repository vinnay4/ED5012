/** MediaPipe BlazePose landmark indices used by the analysis. */
export const LM = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT: 31,
  RIGHT_FOOT: 32,
} as const

export const SKELETON_EDGES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32],
  [0, 11],
  [0, 12],
]

export interface Point {
  x: number
  y: number
  z: number
  v: number
}

/**
 * One analysed frame. `lm` is 33 image-space landmarks flattened as
 * [x, y, z, visibility] (x/y normalised 0..1); `wl` is 33 world landmarks
 * flattened as [x, y, z] in metres, hip-centred (MediaPipe convention).
 */
export interface PoseFrame {
  t: number
  lm: number[]
  wl: number[]
}

export type PoseSource = 'mediapipe' | 'synthetic'

export interface PoseTrack {
  version: 1
  source: PoseSource
  model?: string
  width: number
  height: number
  duration: number
  sampleFps: number
  /** null where no person was detected in the frame. */
  frames: (PoseFrame | null)[]
  /** Ground-truth fault labels per rep, only for synthetic tracks. */
  groundTruth?: GroundTruthRep[]
}

export interface GroundTruthRep {
  rep: number
  start: number
  end: number
  /** True metric values from the noise-free model (same units as the analysis). */
  values: Partial<Record<'depth' | 'trunkLean' | 'kneeValgus' | 'hipShift' | 'velocity', number>>
  /** Parameters injected into this rep. */
  injected: Record<string, number>
}

export function getPoint(frame: PoseFrame, i: number): Point {
  const o = i * 4
  return { x: frame.lm[o], y: frame.lm[o + 1], z: frame.lm[o + 2], v: frame.lm[o + 3] }
}

export function getWorld(frame: PoseFrame, i: number): Point {
  const o = i * 3
  return { x: frame.wl[o], y: frame.wl[o + 1], z: frame.wl[o + 2], v: 1 }
}
