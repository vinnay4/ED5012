import { LM, getWorld, type PoseFrame } from '../pose/types'
import { dist3, mid3 } from './geometry'
import { median } from './signal'

/**
 * Segment lengths as a fraction of stature (Drillis & Contini, 1966, as
 * reproduced in Winter, Biomechanics and Motor Control of Human Movement).
 */
export const DRILLIS_CONTINI = {
  thigh: 0.245,
  shank: 0.246,
  trunk: 0.288,
  upperArm: 0.186,
  forearm: 0.146,
  hipWidth: 0.191,
  shoulderWidth: 0.259,
}

export interface AnthropometryEstimate {
  statureCm: number
  predicted: { thighCm: number; shankCm: number; trunkCm: number; legCm: number }
  /** Ratios measured from the clip (MediaPipe world landmarks, standing frames). */
  measured: { thighToShank: number; thighToTrunk: number } | null
  reference: { thighToShank: number; thighToTrunk: number }
  interpretation: string
}

export function estimateAnthropometry(standingFrames: PoseFrame[], statureCm: number): AnthropometryEstimate {
  const H = statureCm
  const reference = {
    thighToShank: DRILLIS_CONTINI.thigh / DRILLIS_CONTINI.shank,
    thighToTrunk: DRILLIS_CONTINI.thigh / DRILLIS_CONTINI.trunk,
  }
  const predicted = {
    thighCm: DRILLIS_CONTINI.thigh * H,
    shankCm: DRILLIS_CONTINI.shank * H,
    trunkCm: DRILLIS_CONTINI.trunk * H,
    legCm: (DRILLIS_CONTINI.thigh + DRILLIS_CONTINI.shank) * H,
  }
  let measured: AnthropometryEstimate['measured'] = null
  if (standingFrames.length >= 5) {
    const thigh: number[] = []
    const shank: number[] = []
    const trunk: number[] = []
    for (const f of standingFrames) {
      const w = (i: number) => getWorld(f, i)
      thigh.push((dist3(w(LM.LEFT_HIP), w(LM.LEFT_KNEE)) + dist3(w(LM.RIGHT_HIP), w(LM.RIGHT_KNEE))) / 2)
      shank.push((dist3(w(LM.LEFT_KNEE), w(LM.LEFT_ANKLE)) + dist3(w(LM.RIGHT_KNEE), w(LM.RIGHT_ANKLE))) / 2)
      trunk.push(dist3(mid3(w(LM.LEFT_SHOULDER), w(LM.RIGHT_SHOULDER)), mid3(w(LM.LEFT_HIP), w(LM.RIGHT_HIP))))
    }
    measured = { thighToShank: median(thigh) / median(shank), thighToTrunk: median(thigh) / median(trunk) }
  }
  let interpretation = 'Not enough standing frames to estimate body proportions.'
  if (measured) {
    const r = measured.thighToTrunk / reference.thighToTrunk
    interpretation =
      r > 1.08
        ? 'Relatively long thighs for your trunk. To keep your centre of mass over mid-foot you will naturally lean forward more at the same depth, so a fixed “max 30° lean” rule would wrongly flag you. FormDrift judges lean against your own baseline instead.'
        : r < 0.92
          ? 'Relatively short thighs for your trunk. You can squat more upright, so a generic lean threshold would miss real deterioration for you. FormDrift judges lean against your own baseline instead.'
          : 'Proportions close to the population reference. Even so, mobility and stance width change your natural squat shape, which is why every judgement is made against your own baseline reps.'
  }
  return { statureCm, predicted, measured, reference, interpretation }
}
