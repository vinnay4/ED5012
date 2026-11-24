import { DRILLIS_CONTINI } from './anthropometry'

/**
 * Simplified static 2D sagittal model of the L5/S1 joint (after Chaffin,
 * Andersson & Martin, Occupational Biomechanics, 1999).
 *
 * Upper body above L5/S1 (head, arms, trunk) ≈ 55 % of body mass with its
 * centre of mass about 40 % of the way from hip to shoulder along the trunk
 * (approximation from de Leva, 1996). An external load is assumed to be held
 * close to the chest (goblet/front-rack), about 75 % up the trunk and 10 cm
 * in front of it. Erector spinae moment arm 5 cm.
 *
 * Intended only for comparing reps within a set, not as an absolute or
 * clinical estimate.
 */
export interface LumbarEstimate {
  momentNm: number
  compressionN: number
}

export const NIOSH_ACTION_LIMIT_N = 3400

export function lumbarLoad(p: { trunkLeanDeg: number; statureM: number; massKg: number; loadKg: number }): LumbarEstimate {
  const g = 9.81
  const trunk = DRILLIS_CONTINI.trunk * p.statureM
  const lean = (p.trunkLeanDeg * Math.PI) / 180
  const upperMass = 0.55 * p.massKg
  const upperArm = 0.4 * trunk * Math.sin(lean)
  const loadArm = 0.75 * trunk * Math.sin(lean) + 0.1 * Math.cos(lean)
  const momentNm = upperMass * g * upperArm + p.loadKg * g * loadArm
  const muscleForce = momentNm / 0.05
  const axial = (upperMass + p.loadKg) * g * Math.cos(lean)
  return { momentNm, compressionN: muscleForce + axial }
}
