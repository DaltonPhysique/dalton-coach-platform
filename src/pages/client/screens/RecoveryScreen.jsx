import { useState } from 'react'
import { DEMO_RECOVERY_TODAY, DEMO_RECOVERY_HISTORY } from '../demoData'
import DemoBadge from '../components/DemoBadge'

const SLIDERS = [
  { key: 'sleep', label: 'Sleep Quality', low: 'Terrible', high: 'Excellent' },
  { key: 'energy', label: 'Energy Level', low: 'Drained', high: 'Energized' },
  { key: 'soreness', label: 'Muscle Soreness', low: 'Destroyed', high: 'Fresh' },
  { key: 'stress', label: 'Stress Level', low: 'High Stress', high: 'Calm' },
  { key: 'digestion', label: 'Digestion', low: 'Off', high: 'Optimal' },
]

function score(r) {
  return r.sleep + r.energy + r.soreness + r.stress + r.digestion
}

export default function RecoveryScreen() {
  const [values, setValues] = useState(DEMO_RECOVERY_TODAY)
  const [saved, setSaved] = useState(false)

  const currentScore = score(values)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="v2-page-title">Recovery</div>
      <DemoBadge label="Demo data — recovery check-ins are not saved to your account yet" />

      <div className="card">
        <div className="v2-card-title-row">
          <span className="v2-card-eyebrow">Today's Check-in</span>
          <button className="btn-small" onClick={handleSave}>{saved ? 'Saved ✓' : 'Save'}</button>
        </div>

        {SLIDERS.map((s) => (
          <div className="v2-slider-row" key={s.key}>
            <div className="v2-slider-label-row">
              <span className="v2-slider-label">{s.label}</span>
              <span className="v2-slider-value">{values[s.key]}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={values[s.key]}
              className="v2-glow-slider"
              onChange={(e) => setValues({ ...values, [s.key]: Number(e.target.value) })}
            />
            <div className="v2-slider-track-labels">
              <span>{s.low}</span>
              <span>{s.high}</span>
            </div>
          </div>
        ))}

        <div className="v2-toggle-row">
          <span style={{ fontSize: 16, fontWeight: 600 }}>Morning erections present?</span>
          <label className="v2-toggle">
            <input
              type="checkbox"
              checked={values.morningSignal}
              onChange={(e) => setValues({ ...values, morningSignal: e.target.checked })}
            />
            <span className="v2-toggle-track" />
          </label>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--gbg)', borderColor: 'var(--gbrd)' }}>
        <strong style={{ fontSize: 16 }}>
          Recovery Score: {currentScore}/25 — {currentScore >= 20 ? 'Excellent' : currentScore >= 13 ? 'Good' : 'Reduced'}.
        </strong>
        <p style={{ marginTop: 8, color: 'var(--text2)', lineHeight: 1.6 }}>
          {currentScore >= 20
            ? 'All systems optimal. Train hard today. Take every set to true failure. Your body is primed to make progress.'
            : 'Solid recovery. Train normally, but stay attentive to how sets feel.'}
        </p>
      </div>

      {!values.morningSignal && (
        <div className="card" style={{ background: 'var(--abg)', borderColor: 'var(--abrd)' }}>
          ⚠️ No morning erection noted. Hormone signal. If persists 3+ days: check sleep, calories, stress. Do not cut further until resolved.
        </div>
      )}

      <div className="card">
        <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Recovery Log</div>
        <div className="log-list">
          {DEMO_RECOVERY_HISTORY.map((r, i) => (
            <div className="log-row" key={i}>
              <span className="date">{r.date}</span>
              <span className="val" style={{ color: r.score >= 20 ? 'var(--g)' : 'var(--a)' }}>{r.score}/25</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
