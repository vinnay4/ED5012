export interface V2 {
  x: number
  y: number
}
export interface V3 {
  x: number
  y: number
  z: number
}

export const RAD = 180 / Math.PI

export function mid<T extends V2>(a: T, b: T): V2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function mid3(a: V3, b: V3): V3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}

export function dist(a: V2, b: V2) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function dist3(a: V3, b: V3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/** Interior angle ABC in degrees (2D). */
export function angle2(a: V2, b: V2, c: V2) {
  const v1x = a.x - b.x
  const v1y = a.y - b.y
  const v2x = c.x - b.x
  const v2y = c.y - b.y
  const d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)
  if (d === 0) return NaN
  return Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / d))) * RAD
}

/** Interior angle ABC in degrees (3D). */
export function angle3(a: V3, b: V3, c: V3) {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }
  const d = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z)
  if (d === 0) return NaN
  return Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / d))) * RAD
}

/** Angle of segment bottom→top from image vertical, in degrees (0 = upright). */
export function angleFromVertical(top: V2, bottom: V2) {
  const dx = top.x - bottom.x
  const dy = bottom.y - top.y
  return Math.abs(Math.atan2(dx, dy) * RAD)
}

/**
 * Signed perpendicular distance of point p from line a→b. Positive values lie
 * to the left of the direction a→b in image coordinates.
 */
export function signedOffset(p: V2, a: V2, b: V2) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return ((p.x - a.x) * dy - (p.y - a.y) * dx) / len
}
