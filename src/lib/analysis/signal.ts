/** Linearly fills NaN gaps up to `maxGap` samples; longer gaps stay NaN. */
export function fillGaps(values: number[], maxGap: number): number[] {
  const out = values.slice()
  let i = 0
  while (i < out.length) {
    if (!Number.isNaN(out[i])) {
      i++
      continue
    }
    const start = i
    while (i < out.length && Number.isNaN(out[i])) i++
    const end = i
    const before = start - 1
    const len = end - start
    if (before >= 0 && end < out.length && len <= maxGap) {
      for (let k = start; k < end; k++) {
        const f = (k - before) / (end - before)
        out[k] = out[before] + f * (out[end] - out[before])
      }
    } else if (len <= maxGap) {
      const edge = before >= 0 ? out[before] : end < out.length ? out[end] : NaN
      for (let k = start; k < end; k++) out[k] = edge
    }
  }
  return out
}

/** Zero-phase Gaussian smoothing (offline, so no lag is introduced). */
export function smooth(values: number[], sigmaSamples: number): number[] {
  if (sigmaSamples <= 0) return values.slice()
  const radius = Math.ceil(sigmaSamples * 2.5)
  const kernel: number[] = []
  for (let k = -radius; k <= radius; k++) kernel.push(Math.exp(-(k * k) / (2 * sigmaSamples * sigmaSamples)))
  return values.map((_, i) => {
    let sum = 0
    let wsum = 0
    for (let k = -radius; k <= radius; k++) {
      const v = values[i + k]
      if (v === undefined || Number.isNaN(v)) continue
      const w = kernel[k + radius]
      sum += v * w
      wsum += w
    }
    return wsum > 0 ? sum / wsum : NaN
  })
}

export function percentile(values: number[], p: number): number {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return NaN
  const idx = (v.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return v[lo] + (v[hi] - v[lo]) * (idx - lo)
}

export function median(values: number[]): number {
  return percentile(values, 0.5)
}

export function mean(values: number[]): number {
  const v = values.filter((x) => Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN
}

export function resample(values: number[], n: number): number[] {
  if (values.length === 0) return new Array(n).fill(NaN)
  if (values.length === 1) return new Array(n).fill(values[0])
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const pos = (i / (n - 1)) * (values.length - 1)
    const lo = Math.floor(pos)
    const hi = Math.min(values.length - 1, lo + 1)
    out.push(values[lo] + (values[hi] - values[lo]) * (pos - lo))
  }
  return out
}

/** Ordinary least-squares line fit with R². */
export function linearFit(ys: number[]) {
  const n = ys.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 }
  const xs = ys.map((_, i) => i + 1)
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = ys.reduce((a, b) => a + b, 0)
  const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sxx = xs.reduce((s, x) => s + x * x, 0)
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  const intercept = (sy - slope * sx) / n
  const my = sy / n
  const ssTot = ys.reduce((s, y) => s + (y - my) ** 2, 0)
  const ssRes = ys.reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0)
  return { slope, intercept, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 }
}
