import type { GroundTruthRep } from '../pose/types'
import { deviation, type SessionAnalysis } from './analyze'
import { median } from './signal'
import { METRICS, type Level, type MetricId } from './metrics'

export interface MetricEvaluation {
  metric: MetricId
  tp: number
  fp: number
  fn: number
  tn: number
  levelAgreement: number
  mae: number
  rows: { rep: number; gtValue: number; measured: number; gtLevel: Level; detectedLevel: Level }[]
}

export interface Evaluation {
  repsTrue: number
  repsDetected: number
  repsMatched: number
  metrics: MetricEvaluation[]
  overall: { precision: number; recall: number; accuracy: number; f1: number }
}

/**
 * Compares the analysis of a synthetic track against its ground truth:
 * rep counting, per-metric measurement error, and drift-flag agreement
 * (a rep counts as flagged when its level is minor or major).
 */
export function evaluateAgainstTruth(analysis: SessionAnalysis, truth: GroundTruthRep[]): Evaluation {
  const matched = truth.map((g) => analysis.reps.find((r) => r.bottom >= g.start && r.bottom <= g.end) ?? null)
  const nBase = analysis.baselineCount
  const metrics: MetricEvaluation[] = []
  for (const id of analysis.available) {
    if (id === 'pattern') continue
    const gtVals = truth.map((g) => g.values[id as keyof GroundTruthRep['values']])
    if (gtVals.every((v) => v === undefined)) continue
    const base = median(gtVals.slice(0, nBase).filter((v): v is number => v !== undefined))
    const ev: MetricEvaluation = { metric: id, tp: 0, fp: 0, fn: 0, tn: 0, levelAgreement: 0, mae: 0, rows: [] }
    let errSum = 0
    let errN = 0
    truth.forEach((g, i) => {
      const rep = matched[i]
      const gv = gtVals[i]
      if (gv === undefined) return
      const measured = rep?.metrics[id]
      if (rep && measured !== undefined) {
        errSum += Math.abs(measured - gv)
        errN++
      }
      if (i < nBase) return
      const gtLevel = deviation(id, gv, base)?.level ?? 'ok'
      const detectedLevel: Level = rep?.deviations[id]?.level ?? 'ok'
      const gtFlag = gtLevel !== 'ok'
      const dFlag = detectedLevel !== 'ok'
      if (gtFlag && dFlag) ev.tp++
      else if (!gtFlag && dFlag) ev.fp++
      else if (gtFlag && !dFlag) ev.fn++
      else ev.tn++
      if (gtLevel === detectedLevel) ev.levelAgreement++
      ev.rows.push({ rep: g.rep, gtValue: gv, measured: measured ?? NaN, gtLevel, detectedLevel })
    })
    ev.mae = errN ? errSum / errN : NaN
    ev.levelAgreement = ev.rows.length ? ev.levelAgreement / ev.rows.length : NaN
    metrics.push(ev)
  }
  const sum = metrics.reduce((a, m) => ({ tp: a.tp + m.tp, fp: a.fp + m.fp, fn: a.fn + m.fn, tn: a.tn + m.tn }), { tp: 0, fp: 0, fn: 0, tn: 0 })
  const precision = sum.tp + sum.fp ? sum.tp / (sum.tp + sum.fp) : 1
  const recall = sum.tp + sum.fn ? sum.tp / (sum.tp + sum.fn) : 1
  const total = sum.tp + sum.fp + sum.fn + sum.tn
  return {
    repsTrue: truth.length,
    repsDetected: analysis.reps.length,
    repsMatched: matched.filter(Boolean).length,
    metrics,
    overall: {
      precision,
      recall,
      accuracy: total ? (sum.tp + sum.tn) / total : NaN,
      f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0,
    },
  }
}

export function metricLabel(id: MetricId) {
  return METRICS[id].label
}
