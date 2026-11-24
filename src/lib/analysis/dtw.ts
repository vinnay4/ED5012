/**
 * Dynamic time warping between two multichannel sequences (each frame is a
 * feature vector). Returns the mean per-step Euclidean distance along the
 * optimal warping path, so the value is comparable across sequence lengths.
 * Sakoe–Chiba band limits warping to `band` × length.
 */
export function dtwDistance(a: number[][], b: number[][], band = 0.25): number {
  const n = a.length
  const m = b.length
  if (!n || !m) return NaN
  const w = Math.max(Math.ceil(Math.max(n, m) * band), Math.abs(n - m))
  const INF = Number.POSITIVE_INFINITY
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF))
  const steps: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  cost[0][0] = 0
  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - w)
    const jEnd = Math.min(m, i + w)
    for (let j = jStart; j <= jEnd; j++) {
      let d = 0
      const fa = a[i - 1]
      const fb = b[j - 1]
      for (let k = 0; k < fa.length; k++) d += (fa[k] - fb[k]) ** 2
      d = Math.sqrt(d)
      let best = cost[i - 1][j - 1]
      let bestSteps = steps[i - 1][j - 1]
      if (cost[i - 1][j] < best) {
        best = cost[i - 1][j]
        bestSteps = steps[i - 1][j]
      }
      if (cost[i][j - 1] < best) {
        best = cost[i][j - 1]
        bestSteps = steps[i][j - 1]
      }
      cost[i][j] = best + d
      steps[i][j] = bestSteps + 1
    }
  }
  return cost[n][m] / Math.max(1, steps[n][m])
}
