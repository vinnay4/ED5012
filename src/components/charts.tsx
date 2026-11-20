import type { Rep, SessionAnalysis } from '../lib/analysis/analyze'
import { METRICS, type MetricId } from '../lib/analysis/metrics'
import { NIOSH_ACTION_LIMIT_N } from '../lib/analysis/biomech'
import { LEVEL_COLOR } from './ui'

const GRID = 'rgba(148,163,184,0.08)'
const TEXT = '#93a0b5'

function ticks(min: number, max: number, n = 4) {
  const span = max - min || 1
  const raw = span / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) ?? raw
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6))
  return out
}

interface Frame {
  W: number
  H: number
  l: number
  r: number
  t: number
  b: number
}

function frame(W = 640, H = 240, l = 44, r = 16, t = 16, b = 30): Frame {
  return { W, H, l, r, t, b }
}

function YAxis({ f, y, vals, fmt = (v: number) => `${v}` }: { f: Frame; y: (v: number) => number; vals: number[]; fmt?: (v: number) => string }) {
  return (
    <g>
      {vals.map((v) => (
        <g key={v}>
          <line x1={f.l} x2={f.W - f.r} y1={y(v)} y2={y(v)} stroke={GRID} />
          <text x={f.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={TEXT} className="num">
            {fmt(v)}
          </text>
        </g>
      ))}
    </g>
  )
}

export function RepScoreChart({ a, onSelect, selected }: { a: SessionAnalysis; onSelect?: (rep: number) => void; selected?: number }) {
  const f = frame(640, 230)
  const n = a.reps.length
  const bw = (f.W - f.l - f.r) / n
  const y = (v: number) => f.t + (1 - v / 100) * (f.H - f.t - f.b)
  const { slope, intercept } = a.trend
  return (
    <svg viewBox={`0 0 ${f.W} ${f.H}`} className="w-full" role="img" aria-label="Form score per repetition">
      <YAxis f={f} y={y} vals={[0, 25, 50, 75, 100]} />
      {a.reps.map((r, i) => {
        const x = f.l + i * bw + bw * 0.18
        const w = bw * 0.64
        const color = r.isBaseline ? LEVEL_COLOR.base : LEVEL_COLOR[r.worstLevel]
        const isSel = selected === r.index
        return (
          <g key={r.index} onClick={() => onSelect?.(r.index)} className={onSelect ? 'cursor-pointer' : ''}>
            <rect x={f.l + i * bw} y={f.t} width={bw} height={f.H - f.t - f.b} fill="transparent" />
            <rect
              x={x}
              y={y(r.score)}
              width={w}
              height={Math.max(2, y(0) - y(r.score))}
              rx={4}
              fill={color}
              opacity={isSel ? 1 : 0.82}
              stroke={isSel ? '#fff' : 'none'}
              strokeWidth={1.5}
            />
            <text x={x + w / 2} y={y(r.score) - 6} textAnchor="middle" fontSize={11} fill="#e6eaf1" className="num">
              {r.score}
            </text>
            <text x={x + w / 2} y={f.H - 10} textAnchor="middle" fontSize={11} fill={TEXT}>
              {r.index}
            </text>
          </g>
        )
      })}
      {n >= 3 && (
        <line
          x1={f.l + bw / 2}
          x2={f.l + (n - 0.5) * bw}
          y1={y(Math.max(0, Math.min(100, slope * 1 + intercept)))}
          y2={y(Math.max(0, Math.min(100, slope * n + intercept)))}
          stroke="#e6eaf1"
          strokeDasharray="5 5"
          strokeWidth={1.5}
          opacity={0.6}
        />
      )}
    </svg>
  )
}

export function MetricChart({ a, metric, height = 170 }: { a: SessionAnalysis; metric: MetricId; height?: number }) {
  const def = METRICS[metric]
  const f = frame(420, height, 46, 14, 14, 26)
  const reps = a.reps.filter((r) => r.metrics[metric] !== undefined && Number.isFinite(r.metrics[metric]!))
  const base = a.baseline[metric]
  if (!reps.length || base === undefined) return null
  const vals = reps.map((r) => r.metrics[metric] as number)
  const thr = (k: number) => {
    const sign = def.worse === 'lower' ? -1 : 1
    return def.mode === 'relative' ? base * (1 + (sign * k) / 100) : base + sign * k
  }
  const minorT = thr(def.minor)
  const majorT = thr(def.major)
  let lo = Math.min(...vals, base, minorT, majorT)
  let hi = Math.max(...vals, base, minorT, majorT)
  const pad = (hi - lo) * 0.12 || 1
  lo -= pad
  hi += pad
  if (metric === 'pattern') hi = Math.min(hi, 105)
  const n = a.reps.length
  const x = (idx: number) => f.l + ((idx - 1) / Math.max(1, n - 1)) * (f.W - f.l - f.r)
  const y = (v: number) => f.t + (1 - (v - lo) / (hi - lo)) * (f.H - f.t - f.b)
  const yMinor = y(minorT)
  const yMajor = y(majorT)
  const worseDown = def.worse === 'lower'
  const fmt = (v: number) => (Math.abs(hi - lo) < 3 ? v.toFixed(2) : v.toFixed(0))
  return (
    <svg viewBox={`0 0 ${f.W} ${f.H}`} className="w-full" role="img" aria-label={`${def.label} per repetition`}>
      <YAxis f={f} y={y} vals={ticks(lo, hi, 4)} fmt={fmt} />
      <rect
        x={f.l}
        width={f.W - f.l - f.r}
        y={worseDown ? yMinor : f.t}
        height={worseDown ? Math.max(0, yMajor - yMinor) : Math.max(0, yMinor - yMajor)}
        fill={LEVEL_COLOR.minor}
        opacity={0.08}
      />
      {worseDown ? (
        <rect x={f.l} width={f.W - f.l - f.r} y={yMajor} height={Math.max(0, f.H - f.b - yMajor)} fill={LEVEL_COLOR.major} opacity={0.08} />
      ) : (
        <rect x={f.l} width={f.W - f.l - f.r} y={f.t} height={Math.max(0, yMajor - f.t)} fill={LEVEL_COLOR.major} opacity={0.08} />
      )}
      {!worseDown && <rect x={f.l} width={f.W - f.l - f.r} y={yMajor} height={Math.max(0, yMinor - yMajor)} fill={LEVEL_COLOR.minor} opacity={0.08} />}
      <line x1={f.l} x2={f.W - f.r} y1={y(base)} y2={y(base)} stroke={LEVEL_COLOR.base} strokeDasharray="6 4" strokeWidth={1.5} />
      <text x={f.W - f.r - 2} y={y(base) - 5} textAnchor="end" fontSize={10} fill={LEVEL_COLOR.base}>
        your baseline
      </text>
      <polyline fill="none" stroke="#e6eaf1" strokeOpacity={0.5} strokeWidth={1.5} points={reps.map((r) => `${x(r.index)},${y(r.metrics[metric] as number)}`).join(' ')} />
      {reps.map((r) => {
        const lvl = r.isBaseline ? 'base' : (r.deviations[metric]?.level ?? 'ok')
        return <circle key={r.index} cx={x(r.index)} cy={y(r.metrics[metric] as number)} r={4.5} fill={LEVEL_COLOR[lvl]} stroke="#070a10" strokeWidth={1.5} />
      })}
      {a.reps.map((r) => (
        <text key={r.index} x={x(r.index)} y={f.H - 8} textAnchor="middle" fontSize={10} fill={TEXT}>
          {r.index}
        </text>
      ))}
    </svg>
  )
}

export function TimelineChart({
  a,
  time,
  onSeek,
  series = 'depth',
}: {
  a: SessionAnalysis
  time?: number
  onSeek?: (t: number) => void
  series?: 'depth' | 'trunkLean' | 'kneeAngle'
}) {
  const f = frame(900, 170, 44, 12, 12, 24)
  const { t } = a.timeline
  const raw = a.timeline[series]
  const v = series === 'depth' ? raw.map((d) => d * 100) : raw
  const T = t[t.length - 1] || 1
  const finite = v.filter(Number.isFinite)
  const lo = series === 'depth' ? Math.min(-5, ...finite) : Math.min(...finite)
  const hi = Math.max(...finite) * 1.08
  const x = (s: number) => f.l + (s / T) * (f.W - f.l - f.r)
  const y = (val: number) => f.t + (1 - (val - lo) / (hi - lo || 1)) * (f.H - f.t - f.b)
  let d = ''
  v.forEach((val, i) => {
    if (!Number.isFinite(val)) return
    d += `${d === '' || !Number.isFinite(v[i - 1]) ? 'M' : 'L'}${x(t[i]).toFixed(1)},${y(val).toFixed(1)}`
  })
  return (
    <svg
      viewBox={`0 0 ${f.W} ${f.H}`}
      className={`w-full ${onSeek ? 'cursor-crosshair' : ''}`}
      onClick={(e) => {
        if (!onSeek) return
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        const px = ((e.clientX - rect.left) / rect.width) * f.W
        onSeek(Math.max(0, Math.min(T, ((px - f.l) / (f.W - f.l - f.r)) * T)))
      }}
    >
      <YAxis f={f} y={y} vals={ticks(lo, hi, 3)} fmt={(n) => n.toFixed(0)} />
      {a.reps.map((r) => {
        const color = r.isBaseline ? LEVEL_COLOR.base : LEVEL_COLOR[r.worstLevel]
        return (
          <g key={r.index}>
            <rect x={x(r.start)} y={f.t} width={x(r.end) - x(r.start)} height={f.H - f.t - f.b} fill={color} opacity={0.1} rx={3} />
            <text x={(x(r.start) + x(r.end)) / 2} y={f.t + 11} textAnchor="middle" fontSize={10} fill={color}>
              {r.index}
            </text>
          </g>
        )
      })}
      <path d={d} fill="none" stroke="#3dd6ef" strokeWidth={2} />
      {a.cues
        .filter((c) => c.level !== 'info')
        .map((c) => (
          <g key={`${c.rep}-${c.text}`}>
            <line x1={x(c.t)} x2={x(c.t)} y1={f.t} y2={f.H - f.b} stroke={c.delivered ? LEVEL_COLOR[c.level === 'major' ? 'major' : 'minor'] : '#66748c'} strokeDasharray="2 3" />
          </g>
        ))}
      {time !== undefined && <line x1={x(time)} x2={x(time)} y1={f.t - 4} y2={f.H - f.b + 4} stroke="#fff" strokeWidth={1.5} />}
      {ticks(0, T, 6).map((s) => (
        <text key={s} x={x(s)} y={f.H - 6} textAnchor="middle" fontSize={10} fill={TEXT} className="num">
          {s}s
        </text>
      ))}
    </svg>
  )
}

export function TempoChart({ reps }: { reps: Rep[] }) {
  const rowH = 22
  const f = frame(640, reps.length * rowH + 40, 52, 16, 8, 30)
  const max = Math.max(...reps.map((r) => r.metrics.descentS + r.metrics.pauseS + r.metrics.ascentS)) * 1.05
  const x = (s: number) => f.l + (s / max) * (f.W - f.l - f.r)
  const colors = { descent: '#3dd6ef', pause: '#818cf8', ascent: '#34d399' }
  return (
    <svg viewBox={`0 0 ${f.W} ${f.H}`} className="w-full" role="img" aria-label="Tempo per repetition">
      {ticks(0, max, 5).map((s) => (
        <g key={s}>
          <line x1={x(s)} x2={x(s)} y1={f.t} y2={f.H - f.b} stroke={GRID} />
          <text x={x(s)} y={f.H - f.b + 14} textAnchor="middle" fontSize={10} fill={TEXT} className="num">
            {s}s
          </text>
        </g>
      ))}
      {reps.map((r, i) => {
        const yy = f.t + i * rowH + 3
        const m = r.metrics
        const segs: [keyof typeof colors, number, number][] = [
          ['descent', 0, m.descentS],
          ['pause', m.descentS, m.pauseS],
          ['ascent', m.descentS + m.pauseS, m.ascentS],
        ]
        return (
          <g key={r.index}>
            <text x={f.l - 10} y={yy + 12} textAnchor="end" fontSize={11} fill={TEXT}>
              Rep {r.index}
            </text>
            {segs.map(([k, s0, w]) => (
              <rect key={k} x={x(s0)} y={yy} width={Math.max(0, x(s0 + w) - x(s0))} height={rowH - 7} fill={colors[k]} opacity={0.85} rx={2} />
            ))}
          </g>
        )
      })}
      {(['descent', 'pause', 'ascent'] as const).map((k, i) => (
        <g key={k} transform={`translate(${f.l + i * 110}, ${f.H - 8})`}>
          <rect width={10} height={10} y={-9} fill={colors[k]} rx={2} />
          <text x={15} fontSize={11} fill={TEXT}>
            {k === 'pause' ? 'bottom pause' : k}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function LumbarChart({ reps }: { reps: Rep[] }) {
  const data = reps.filter((r) => r.lumbar)
  if (!data.length) return null
  const f = frame(640, 220)
  const max = Math.max(NIOSH_ACTION_LIMIT_N * 1.1, ...data.map((r) => r.lumbar!.compressionN * 1.1))
  const y = (v: number) => f.t + (1 - v / max) * (f.H - f.t - f.b)
  const bw = (f.W - f.l - f.r) / data.length
  const baseVal = data.filter((r) => r.isBaseline).map((r) => r.lumbar!.compressionN)
  const baseMean = baseVal.length ? baseVal.reduce((a, b) => a + b, 0) / baseVal.length : NaN
  return (
    <svg viewBox={`0 0 ${f.W} ${f.H}`} className="w-full" role="img" aria-label="Estimated L5/S1 compression per repetition">
      <YAxis f={f} y={y} vals={ticks(0, max, 4)} fmt={(v) => `${(v / 1000).toFixed(1)} kN`} />
      <line x1={f.l} x2={f.W - f.r} y1={y(NIOSH_ACTION_LIMIT_N)} y2={y(NIOSH_ACTION_LIMIT_N)} stroke={LEVEL_COLOR.major} strokeDasharray="6 4" />
      <text x={f.W - f.r - 4} y={y(NIOSH_ACTION_LIMIT_N) - 6} textAnchor="end" fontSize={10} fill={LEVEL_COLOR.major}>
        NIOSH action limit 3.4 kN
      </text>
      {data.map((r, i) => {
        const v = r.lumbar!.compressionN
        const color = r.isBaseline ? LEVEL_COLOR.base : v > baseMean * 1.15 ? LEVEL_COLOR.minor : '#3dd6ef'
        return (
          <g key={r.index}>
            <rect x={f.l + i * bw + bw * 0.2} y={y(v)} width={bw * 0.6} height={y(0) - y(v)} rx={4} fill={color} opacity={0.85} />
            <text x={f.l + i * bw + bw / 2} y={y(v) - 6} textAnchor="middle" fontSize={10} fill="#e6eaf1" className="num">
              {(v / 1000).toFixed(2)}
            </text>
            <text x={f.l + i * bw + bw / 2} y={f.H - 10} textAnchor="middle" fontSize={11} fill={TEXT}>
              {r.index}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function LineChart({
  series,
  xLabels,
  yMin = 0,
  yMax = 1,
  fmt = (v: number) => v.toFixed(2),
  height = 220,
}: {
  series: { name: string; color: string; values: number[] }[]
  xLabels: string[]
  yMin?: number
  yMax?: number
  fmt?: (v: number) => string
  height?: number
}) {
  const f = frame(640, height, 46, 16, 16, 40)
  const n = xLabels.length
  const x = (i: number) => f.l + (i / Math.max(1, n - 1)) * (f.W - f.l - f.r)
  const y = (v: number) => f.t + (1 - (v - yMin) / (yMax - yMin)) * (f.H - f.t - f.b)
  return (
    <svg viewBox={`0 0 ${f.W} ${f.H}`} className="w-full">
      <YAxis f={f} y={y} vals={ticks(yMin, yMax, 4)} fmt={fmt} />
      {xLabels.map((l, i) => (
        <text key={l} x={x(i)} y={f.H - 22} textAnchor="middle" fontSize={10} fill={TEXT} className="num">
          {l}
        </text>
      ))}
      {series.map((s) => (
        <g key={s.name}>
          <polyline fill="none" stroke={s.color} strokeWidth={2} points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
          {s.values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={s.color} />
          ))}
        </g>
      ))}
      {series.map((s, i) => (
        <g key={s.name} transform={`translate(${f.l + i * 150}, ${f.H - 6})`}>
          <rect width={10} height={3} y={-5} fill={s.color} />
          <text x={15} fontSize={11} fill={TEXT}>
            {s.name}
          </text>
        </g>
      ))}
    </svg>
  )
}
