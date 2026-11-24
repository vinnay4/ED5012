import { METRICS, type Level, type MetricId } from './metrics'
import type { Rep } from './analyze'

export type FeedbackMode = 'combined' | 'visual' | 'audio' | 'haptic' | 'silent'
export type Channel = 'visual' | 'audio' | 'haptic'

export const FEEDBACK_MODES: { id: FeedbackMode; label: string; channels: Channel[]; note: string }[] = [
  { id: 'combined', label: 'Combined', channels: ['visual', 'audio', 'haptic'], note: 'Visual ring and word, short spoken cue, and vibration on supported phones.' },
  { id: 'visual', label: 'Visual only', channels: ['visual'], note: 'Large colour ring plus one word. Needs the screen in view.' },
  { id: 'audio', label: 'Audio only', channels: ['audio'], note: 'A 2–3 word spoken cue, so your eyes stay free (auditory channel, multiple resource theory).' },
  { id: 'haptic', label: 'Haptic only', channels: ['haptic'], note: 'Vibration pattern on a phone (Android Chrome). Silent on laptops.' },
  { id: 'silent', label: 'Silent', channels: [], note: 'Nothing during the set; everything appears in the post-set summary.' },
]

export interface Cue {
  rep: number
  t: number
  text: string
  metric?: MetricId
  level: Level | 'info'
  delivered: boolean
  reason?: string
  channels: Channel[]
}

/** Minimum gap between delivered cues so feedback never stacks up. */
export const CUE_COOLDOWN_S = 3
/** After this many identical consecutive cues (one more for major faults), repeats go to the summary only. */
export const MAX_REPEATS = 2

function priority(metric: MetricId, level: Level) {
  const kind = METRICS[metric].kind
  if (level === 'ok') return 0
  const major = level === 'major'
  switch (kind) {
    case 'safety':
      return major ? 5 : 3
    case 'technique':
      return major ? 4 : 2
    case 'fatigue':
      // Below any technique fault: a correction the user can act on comes first.
      return major ? 1.5 : 0
    case 'consistency':
      return major ? 1 : 0.5
  }
}

/**
 * Rule-based cue scheduler: at most one cue per rep, delivered at the top of
 * the rep (after the concentric phase, never at the bottom), priority
 * safety > major technique > fatigue > minor technique > consistency, with a
 * cooldown and a repeat limit to avoid nagging and habituation.
 */
export function buildCues(reps: Rep[], mode: FeedbackMode): Cue[] {
  const channels = FEEDBACK_MODES.find((m) => m.id === mode)?.channels ?? []
  const cues: Cue[] = []
  let lastDelivered = -Infinity
  const lastBase = reps.filter((r) => r.isBaseline).pop()
  if (lastBase) {
    cues.push({
      rep: lastBase.index,
      t: lastBase.end,
      text: 'Baseline set',
      level: 'info',
      delivered: channels.length > 0,
      channels,
      reason: 'Your first reps are now the reference',
    })
  }
  const majorCount = (r: Rep) => Object.values(r.deviations).filter((d) => d?.level === 'major').length
  let stopIssued = false
  reps.forEach((r, i) => {
    if (r.isBaseline) return
    let best: { metric: MetricId; level: Level; p: number } | null = null
    for (const [metric, d] of Object.entries(r.deviations) as [MetricId, NonNullable<Rep['deviations'][MetricId]>][]) {
      const p = priority(metric, d.level)
      if (p > 0 && (!best || p > best.p)) best = { metric, level: d.level, p }
    }
    if (!best) return
    // Escalate once to a stop recommendation when several measures are
    // severely off for two reps in a row; repeating a correction would not help.
    const prev = reps[i - 1]
    const escalate = !stopIssued && prev && !prev.isBaseline && majorCount(r) >= 2 && majorCount(prev) >= 2
    const text = escalate ? STOP_CUE : METRICS[best.metric].cue
    const cue: Cue = { rep: r.index, t: r.end, text, metric: best.metric, level: best.level, delivered: true, channels }
    const limit = best.level === 'major' ? MAX_REPEATS + 1 : MAX_REPEATS
    const recent = cues.filter((c) => c.delivered && c.level !== 'info').slice(-limit)
    if (channels.length === 0) {
      cue.delivered = false
      cue.reason = 'Silent mode: shown in summary only'
    } else if (r.end - lastDelivered < CUE_COOLDOWN_S) {
      cue.delivered = false
      cue.reason = `Cooldown (< ${CUE_COOLDOWN_S} s since last cue)`
    } else if (!escalate && recent.length === limit && recent.every((c) => c.text === text)) {
      cue.delivered = false
      cue.reason = `Repeat limit: “${text}” already given ${limit}× in a row`
    } else if (stopIssued) {
      cue.delivered = false
      cue.reason = 'Stop already recommended'
    }
    if (escalate) stopIssued = true
    if (cue.delivered) lastDelivered = r.end
    cues.push(cue)
  })
  return cues
}

export const STOP_CUE = 'End the set'
