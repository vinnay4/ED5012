import type { PoseTrack } from '../pose/types'
import { generateSyntheticTrack } from '../synthetic/generator'

export interface Credit {
  title: string
  author: string
  license: string
  licenseUrl: string
  sourceUrl: string
  changes: string
}

export interface DemoClip {
  id: string
  title: string
  subtitle: string
  kind: 'real' | 'synthetic'
  camera: 'side' | 'front' | 'oblique'
  video?: string
  poster?: string
  posePath?: string
  generate?: () => PoseTrack
  expectedReps: number
  loadKg: number
  statureCm?: number
  description: string
  lookFor: string[]
  credit?: Credit
  aspect: number
}

const base = import.meta.env.BASE_URL

export const DEMO_CLIPS: DemoClip[] = [
  {
    id: 'sim-side',
    title: 'Fatigue set: side camera',
    subtitle: 'Simulated · 10 reps · known ground truth',
    kind: 'synthetic',
    camera: 'side',
    generate: () => generateSyntheticTrack({ camera: 'side' }),
    expectedReps: 10,
    loadKg: 12,
    statureCm: 175,
    aspect: 4 / 3,
    description:
      'A 1.75 m digital mannequin performs a 12 kg goblet-squat set. From rep 6, depth, trunk lean and ascent speed deteriorate progressively, the way they do under fatigue. Landmarks carry pose-estimation-like noise and go through the same pipeline as real video, so detections can be checked against known truth.',
    lookFor: ['“Baseline set” after rep 3', 'Depth loss and slower ascent from rep 6', 'Trunk lean flagged from rep 7', 'Escalation to “End the set” at rep 9'],
  },
  {
    id: 'sim-front',
    title: 'Fatigue set: front camera',
    subtitle: 'Simulated · 10 reps · known ground truth',
    kind: 'synthetic',
    camera: 'front',
    generate: () => generateSyntheticTrack({ camera: 'front' }),
    expectedReps: 10,
    loadKg: 12,
    statureCm: 175,
    aspect: 4 / 3,
    description:
      'The same simulated set filmed from the front. Here the frontal-plane faults can be measured: knees collapsing inward (dynamic valgus) and the pelvis shifting to one side as fatigue builds.',
    lookFor: ['Knee tracking flagged from rep 7', 'Lateral hip shift from rep 8', 'Trunk lean reported as “not measurable” from this view'],
  },
  {
    id: 'side-kettlebell-squat',
    title: 'Kettlebell squat: side view',
    subtitle: 'Real video · 6 reps · MediaPipe',
    kind: 'real',
    camera: 'side',
    video: `${base}samples/side-kettlebell-squat.mp4`,
    poster: `${base}samples/side-kettlebell-squat.jpg`,
    posePath: `${base}samples/side-kettlebell-squat.pose.json`,
    expectedReps: 6,
    loadKg: 16,
    aspect: 640 / 352,
    description:
      'An experienced lifter performs a racked kettlebell squat outdoors, filmed side-on against bright sky (a hard, silhouetted lighting case). Technique stays consistent, so a trustworthy system should not raise alarms. Real measured variation is still shown, including a longer pause at the bottom in reps 5–6.',
    lookFor: ['All 6 reps counted', 'No false technique alarms', 'Lumbar load estimate per rep', 'Longer bottom pause in reps 5–6 (tempo chart)'],
    credit: {
      title: 'Kettlebell Racked Squats (side view)',
      author: 'Taco Fleur',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kettlebell_Racked_Squats_(side_view).webm',
      changes: 'Trimmed to 3.0–47.5 s, letterbox cropped, re-encoded to H.264.',
    },
  },
  {
    id: 'oblique-barbell-back-squat',
    title: 'Barbell back squat: studio',
    subtitle: 'Real video · 4 reps · MediaPipe',
    kind: 'real',
    camera: 'oblique',
    video: `${base}samples/oblique-barbell-back-squat.mp4`,
    poster: `${base}samples/oblique-barbell-back-squat.jpg`,
    posePath: `${base}samples/oblique-barbell-back-squat.pose.json`,
    expectedReps: 4,
    loadKg: 40,
    aspect: 540 / 960,
    description:
      'A barbell back squat filmed at roughly 45°. FormDrift recognises the oblique view and only reports what this angle supports: depth, tempo, velocity and consistency. Trunk lean and knee valgus are marked “not measurable” rather than guessed.',
    lookFor: ['Oblique view detected automatically', '“Not measurable” panel for unsupported metrics', 'About 10 % velocity loss on the last rep (below threshold)'],
    credit: {
      title: 'Barbell back squat exercise demonstration',
      author: 'Your Move (ymove.app)',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Barbell_back_squat_exercise_demonstration.webm',
      changes: 'Scaled to 540×960, re-encoded to H.264.',
    },
  },
]

export function getClip(id: string) {
  return DEMO_CLIPS.find((c) => c.id === id)
}

const trackCache = new Map<string, Promise<PoseTrack>>()

export function loadClipTrack(clip: DemoClip): Promise<PoseTrack> {
  if (!trackCache.has(clip.id)) {
    const p = clip.generate
      ? Promise.resolve(clip.generate())
      : fetch(clip.posePath!).then((r) => {
          if (!r.ok) throw new Error(`Could not load cached landmarks (${r.status})`)
          return r.json() as Promise<PoseTrack>
        })
    trackCache.set(clip.id, p)
    p.catch(() => trackCache.delete(clip.id))
  }
  return trackCache.get(clip.id)!
}
