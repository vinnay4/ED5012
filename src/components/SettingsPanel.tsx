import { FEEDBACK_MODES } from '../lib/analysis/feedback'
import { useSettings } from '../lib/store'

export function SettingsPanel({ compact }: { compact?: boolean }) {
  const [s, set] = useSettings()
  return (
    <div className={compact ? 'space-y-4' : 'card card-pad space-y-5'}>
      {!compact && (
        <div>
          <div className="eyebrow mb-1">Your profile</div>
          <p className="text-sm text-ink-300">Used to scale speed to metres and to estimate spinal load. Stored only on this device.</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-ink-300">
          Stature (cm)
          <input className="input num mt-1" type="number" min={120} max={220} value={s.statureCm} onChange={(e) => set({ statureCm: +e.target.value || 170 })} />
        </label>
        <label className="text-xs text-ink-300">
          Body mass (kg)
          <input className="input num mt-1" type="number" min={30} max={200} value={s.massKg} onChange={(e) => set({ massKg: +e.target.value || 70 })} />
        </label>
        <label className="text-xs text-ink-300">
          External load (kg)
          <input className="input num mt-1" type="number" min={0} max={300} value={s.externalLoadKg} onChange={(e) => set({ externalLoadKg: Math.max(0, +e.target.value) })} />
        </label>
      </div>
      <label className="block text-xs text-ink-300">
        Baseline reps
        <select className="input mt-1" value={s.baselineReps} onChange={(e) => set({ baselineReps: +e.target.value })}>
          <option value={0}>Automatic (3 for sets of 6+, fewer for short sets)</option>
          <option value={1}>First 1 rep</option>
          <option value={2}>First 2 reps</option>
          <option value={3}>First 3 reps</option>
          <option value={4}>First 4 reps</option>
        </select>
      </label>
      <div>
        <div className="mb-1.5 text-xs text-ink-300">Feedback during the set</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {FEEDBACK_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => set({ feedbackMode: m.id })}
              title={m.note}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                s.feedbackMode === m.id ? 'border-brand-400/60 bg-brand-400/15 text-brand-200' : 'border-white/10 bg-white/[0.02] text-ink-300 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-400">{FEEDBACK_MODES.find((m) => m.id === s.feedbackMode)?.note}</p>
      </div>
    </div>
  )
}
