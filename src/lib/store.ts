import { useSyncExternalStore } from 'react'
import { DEFAULT_SETTINGS, type AnalysisSettings } from './analysis/analyze'

const KEY = 'formdrift.settings.v1'

function read(): AnalysisSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_SETTINGS
}

let current = read()
const listeners = new Set<() => void>()

export function getSettings() {
  return current
}

export function updateSettings(patch: Partial<AnalysisSettings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

export function useSettings(): [AnalysisSettings, (p: Partial<AnalysisSettings>) => void] {
  const s = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
  return [s, updateSettings]
}

export const PERCEPTION_KEY = 'formdrift.perception.v1'
export const STUDY_KEY = 'formdrift.study.v1'

export interface PerceptionEntry {
  ts: string
  clip: string
  perceived: number | 'none' | 'unsure'
  measured: number | null
  reps: number
}

/** Generic localStorage-backed list, used for study responses. */
export function loadList<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

export function saveList<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    /* storage unavailable */
  }
}

export function downloadFile(name: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
