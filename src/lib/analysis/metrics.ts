export type MetricId = 'depth' | 'trunkLean' | 'kneeValgus' | 'hipShift' | 'velocity' | 'pattern'
export type Level = 'ok' | 'minor' | 'major'
export type ViewType = 'side' | 'front' | 'oblique'
export type MetricKind = 'technique' | 'safety' | 'fatigue' | 'consistency'

export interface MetricDef {
  id: MetricId
  label: string
  unit: string
  decimals: number
  /** Which direction counts as a deterioration. */
  worse: 'lower' | 'higher'
  /** relative: deviation in % of baseline; absolute: deviation in metric units. */
  mode: 'relative' | 'absolute'
  minor: number
  major: number
  /** Maximum points deducted from the 100-point rep score. */
  weight: number
  kind: MetricKind
  cue: string
  views: ViewType[]
  hfLevel: string
  what: string
  why: string
  drill: string
  thresholdNote: string
}

export const METRICS: Record<MetricId, MetricDef> = {
  depth: {
    id: 'depth',
    label: 'Squat depth',
    unit: '% leg',
    decimals: 0,
    worse: 'lower',
    mode: 'relative',
    minor: 15,
    major: 30,
    weight: 30,
    kind: 'technique',
    cue: 'Sit deeper',
    views: ['side', 'front', 'oblique'],
    hfLevel: 'Biomechanics',
    what: 'Peak vertical travel of the hip joint centre, expressed as a percentage of your own leg length (hip→knee→ankle) measured in the same clip.',
    why: 'Shortening the range of motion late in a set is a common fatigue compensation: the quadriceps moment peaks near the bottom, so cutting depth reduces demand. Joint-position sense degrades with fatigue, which is why lifters rarely notice it themselves.',
    drill: 'Target (box) squat: set a box or bench at your baseline depth and touch it lightly on every rep, using a 3-1-1 tempo.',
    thresholdNote: 'Minor at ≥15 % loss versus your baseline, major at ≥30 % (baseline-drift bands adapted from RehabFlow).',
  },
  trunkLean: {
    id: 'trunkLean',
    label: 'Trunk lean',
    unit: '°',
    decimals: 0,
    worse: 'higher',
    mode: 'absolute',
    minor: 8,
    major: 15,
    weight: 25,
    kind: 'safety',
    cue: 'Chest up',
    views: ['side'],
    hfLevel: 'Biomechanics',
    what: 'Maximum forward inclination of the hip→shoulder line from vertical during the rep (side view only).',
    why: 'More trunk flexion lengthens the horizontal moment arm of the upper body (and any load held) about L5/S1, raising the lumbar extensor moment and spinal compression (static sagittal model, Chaffin et al., 1999). When the quadriceps fatigue, work shifts to the hips and the chest drops.',
    drill: 'Goblet squat with a 2 s pause at the bottom, load held against the sternum. If lean is high even in your baseline, work on ankle dorsiflexion mobility.',
    thresholdNote: 'Minor at ≥8° more lean than your baseline, major at ≥15°. Absolute lean is not judged, because it depends on your femur-to-torso proportions.',
  },
  kneeValgus: {
    id: 'kneeValgus',
    label: 'Knee tracking (valgus)',
    unit: '% ankle width',
    decimals: 0,
    worse: 'lower',
    mode: 'relative',
    minor: 10,
    major: 20,
    weight: 30,
    kind: 'safety',
    cue: 'Knees out',
    views: ['front'],
    hfLevel: 'Biomechanics',
    what: 'Knee-to-ankle separation ratio: the distance between the knees divided by the distance between the ankles at the bottom of the rep (front view only). If it falls below your baseline, the knees are collapsing inward (dynamic valgus).',
    why: 'Dynamic knee valgus increases loading on the medial knee and ACL. Normalised knee separation from frontal video is an established screening measure (Noyes et al., 2005; Barber-Westin et al., 2005). Fatigue of the hip abductors and external rotators tends to increase valgus over a set. The 2D frontal-plane projection angle was rejected here because the thigh points at the camera in a deep squat, which makes that angle unstable.',
    drill: 'Light mini-band around the knees with a “spread the floor” cue; lateral band walks in the warm-up.',
    thresholdNote: 'Minor when knee separation falls ≥10 % below your baseline, major at ≥20 %.',
  },
  hipShift: {
    id: 'hipShift',
    label: 'Lateral hip shift',
    unit: '% stance',
    decimals: 0,
    worse: 'higher',
    mode: 'absolute',
    minor: 8,
    major: 15,
    weight: 20,
    kind: 'technique',
    cue: 'Even weight',
    views: ['front'],
    hfLevel: 'Biomechanics',
    what: 'Sideways offset of the pelvis centre from the centre of the feet at the bottom, as a percentage of stance width (front view only).',
    why: 'Shifting toward one side loads one limb more than the other. It often compensates for a weaker or less mobile side and tends to grow as that side fatigues.',
    drill: 'Slow-tempo squats facing a mirror with a vertical tape line; extra split-squat volume on the weaker side.',
    thresholdNote: 'Minor at ≥8 percentage points more shift than your baseline, major at ≥15.',
  },
  velocity: {
    id: 'velocity',
    label: 'Concentric velocity',
    unit: 'm/s',
    decimals: 2,
    worse: 'lower',
    mode: 'relative',
    minor: 15,
    major: 30,
    weight: 15,
    kind: 'fatigue',
    cue: 'Consider stopping',
    views: ['side', 'front', 'oblique'],
    hfLevel: 'Biomechanics / physiology',
    what: 'Mean upward hip velocity during the ascent, scaled to metres using your stature (set in Profile).',
    why: 'Velocity loss within a set is a validated proxy for neuromuscular fatigue in velocity-based training; around 20 % loss is a common cut-off for ending a set (González-Badillo & Sánchez-Medina, 2010; Pareja-Blanco et al., 2017). It is not a technique fault, but it often comes before technique breakdown.',
    drill: 'End the set, or reduce the load, once velocity loss passes about 20–25 %. Rest 2–3 minutes between sets.',
    thresholdNote: 'Minor at ≥15 % velocity loss versus baseline, major at ≥30 %.',
  },
  pattern: {
    id: 'pattern',
    label: 'Movement consistency',
    unit: '%',
    decimals: 0,
    worse: 'lower',
    mode: 'absolute',
    minor: 12,
    major: 25,
    weight: 10,
    kind: 'consistency',
    cue: 'Steady tempo',
    views: ['side', 'front', 'oblique'],
    hfLevel: 'Biomechanics / motor control',
    what: 'Similarity of the shape of the rep (the hip-height curve normalised for depth and duration) to your own baseline reps, computed with dynamic time warping.',
    why: 'Catches changes in rhythm and shape that a single peak value misses, such as a hitch in the ascent, a rushed descent or a longer grind out of the bottom. Depth and speed are normalised out, so this does not double-count them.',
    drill: 'Keep a consistent tempo (for example 3 s down, 1 s up), using a metronome app.',
    thresholdNote: 'Minor at a ≥12-point drop in similarity versus baseline, major at a ≥25-point drop.',
  },
}

export const METRIC_ORDER: MetricId[] = ['depth', 'trunkLean', 'kneeValgus', 'hipShift', 'velocity', 'pattern']

export const LEVEL_RANK: Record<Level, number> = { ok: 0, minor: 1, major: 2 }

export function formatMetric(id: MetricId, v: number | undefined, extraDecimals = 0) {
  if (v === undefined || !Number.isFinite(v)) return '—'
  const d = METRICS[id]
  return `${v.toFixed(d.decimals + extraDecimals)}${d.unit === '°' ? '°' : ` ${d.unit}`}`
}

export function formatDeviation(id: MetricId, dev: number) {
  const d = METRICS[id]
  const sign = dev > 0 ? '+' : ''
  if (d.mode === 'relative') return `${sign}${dev.toFixed(0)} %`
  const suffix = d.unit === '°' ? '°' : d.unit.startsWith('%') ? ' pts' : ` ${d.unit}`
  return `${sign}${dev.toFixed(d.decimals)}${suffix}`
}
