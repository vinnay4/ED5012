import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PoseFrame, PoseTrack } from './types'
import { SINGLE_FILE } from '../assets'

export type ModelVariant = 'full'

const base = import.meta.env.BASE_URL

// The single-HTML build cannot carry the 24 MB model and runtime, so it loads them from the official CDNs.
const WASM_DIR = SINGLE_FILE ? `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MEDIAPIPE_VERSION__}/wasm` : `${base}mediapipe/wasm`
const modelUrl = (variant: ModelVariant) =>
  SINGLE_FILE
    ? `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${variant}/float16/latest/pose_landmarker_${variant}.task`
    : `${base}models/pose_landmarker_${variant}.task`

let cached: { variant: ModelVariant; delegate: 'GPU' | 'CPU'; lm: PoseLandmarker } | null = null
let lastTimestamp = 0

async function createLandmarker(variant: ModelVariant, delegate: 'GPU' | 'CPU') {
  const fileset = await FilesetResolver.forVisionTasks(WASM_DIR)
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: modelUrl(variant),
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}

export async function getLandmarker(variant: ModelVariant = 'full', preferGpu = true) {
  if (cached && cached.variant === variant) return cached
  cached?.lm.close()
  let delegate: 'GPU' | 'CPU' = preferGpu ? 'GPU' : 'CPU'
  let lm: PoseLandmarker
  try {
    lm = await createLandmarker(variant, delegate)
  } catch {
    delegate = 'CPU'
    lm = await createLandmarker(variant, delegate)
  }
  cached = { variant, delegate, lm }
  return cached
}

const round = (n: number, d = 4) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

function seek(video: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('Video seek failed'))
    }
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = t
  })
}

export function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    video.src = src
    video.onloadeddata = () => resolve(video)
    video.onerror = () => reject(new Error('This video format could not be decoded by the browser. Try an MP4 (H.264) or WebM file.'))
  })
}

export interface ExtractProgress {
  done: number
  total: number
  detected: number
  delegate: string
}

/**
 * Runs MediaPipe Pose Landmarker over a video file frame by frame (seek, then
 * detect) so results are deterministic and independent of playback speed.
 */
export async function extractPoseTrack(
  src: string,
  opts: {
    sampleFps?: number
    variant?: ModelVariant
    maxDuration?: number
    onProgress?: (p: ExtractProgress) => void
    signal?: AbortSignal
  } = {},
): Promise<PoseTrack> {
  const sampleFps = opts.sampleFps ?? 15
  const variant = opts.variant ?? 'full'
  const { lm, delegate } = await getLandmarker(variant)
  const video = await loadVideo(src)
  const duration = Math.min(video.duration, opts.maxDuration ?? 120)
  const total = Math.max(1, Math.floor(duration * sampleFps))
  const canvas = document.createElement('canvas')
  const maxSide = 960
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
  canvas.width = Math.round(video.videoWidth * scale)
  canvas.height = Math.round(video.videoHeight * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!

  const frames: (PoseFrame | null)[] = []
  let detected = 0
  for (let i = 0; i < total; i++) {
    if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const t = i / sampleFps
    await seek(video, t)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    // MediaPipe requires strictly increasing timestamps for the lifetime of a
    // landmarker instance, including across separate extractions.
    lastTimestamp += 1000 / sampleFps
    const res = lm.detectForVideo(canvas, lastTimestamp)
    const pose = res.landmarks[0]
    const world = res.worldLandmarks[0]
    if (pose && world) {
      detected++
      const flat: number[] = []
      for (const p of pose) flat.push(round(p.x), round(p.y), round(p.z), round(p.visibility ?? 0, 3))
      const wflat: number[] = []
      for (const p of world) wflat.push(round(p.x), round(p.y), round(p.z))
      frames.push({ t: round(t, 3), lm: flat, wl: wflat })
    } else {
      frames.push(null)
    }
    if (i % 3 === 0 || i === total - 1) opts.onProgress?.({ done: i + 1, total, detected, delegate })
    // Yield so the UI can repaint progress.
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0))
  }
  video.removeAttribute('src')
  video.load()
  return {
    version: 1,
    source: 'mediapipe',
    model: `pose_landmarker_${variant} (MediaPipe Tasks Vision, ${delegate})`,
    width: video.videoWidth || canvas.width,
    height: video.videoHeight || canvas.height,
    duration: round(duration, 3),
    sampleFps,
    frames,
  }
}
