import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { localDateStr } from '../../../lib/dates'

const SLIDERS = [
  { key: 'sleep', label: 'Sleep Quality', low: 'Terrible', high: 'Excellent' },
  { key: 'energy', label: 'Energy Level', low: 'Drained', high: 'Energized' },
  { key: 'soreness', label: 'Muscle Soreness', low: 'Destroyed', high: 'Fresh' },
  { key: 'stress', label: 'Stress Level', low: 'High Stress', high: 'Calm' },
  { key: 'digestion', label: 'Digestion', low: 'Off', high: 'Optimal' },
]

const NEUTRAL = { sleep: 3, energy: 3, soreness: 3, stress: 3, digestion: 3 }

function score(r) {
  return r.sleep + r.energy + r.soreness + r.stress + r.digestion
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isMissingTable(error) {
  return error && (error.code === '42P01' || /does not exist/i.test(error.message || ''))
}

export default function RecoveryScreen({ profile }) {
  const [values, setValues] = useState(NEUTRAL)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [dbMissing, setDbMissing] = useState(false)

  useEffect(() => {
    async function load() {
      if (!profile?.id) { setLoading(false); return }
      try {
        const { data: today, error: todayErr } = await supabase
          .from('client_recovery_logs').select('sleep, energy, soreness, stress, digestion')
          .eq('client_id', profile.id)
          .eq('log_date', localDateStr())
          .maybeSingle()
        if (todayErr) throw todayErr
        if (today) setValues({ sleep: today.sleep, energy: today.energy, soreness: today.soreness, stress: today.stress, digestion: today.digestion })

        const { data: hist, error: histErr } = await supabase
          .from('client_recovery_logs').select('log_date, sleep, energy, soreness, stress, digestion')
          .eq('client_id', profile.id)
          .order('log_date', { ascending: false })
          .limit(7)
        if (histErr) throw histErr
        setHistory(hist || [])
      } catch (e) {
        if (isMissingTable(e)) setDbMissing(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile?.id])

  async function handleSave() {
    if (saving || dbMissing) return
    setSaving(true)
    setSaveMsg('')
    try {
      const { error } = await supabase
        .from('client_recovery_logs')
        .upsert(
          { client_id: profile.id, log_date: localDateStr(), ...values },
          { onConflict: 'client_id,log_date' }
        )
      if (error) throw error
      setSaveMsg('Saved ✓')
      setHistory(h => {
        const rest = h.filter(r => r.log_date !== localDateStr())
        return [{ log_date: localDateStr(), ...values }, ...rest].slice(0, 7)
      })
    } catch (e) {
      if (isMissingTable(e)) {
        setDbMissing(true)
        setSaveMsg('')
      } else {
        setSaveMsg('Could not save — check your connection and try again.')
      }
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3500)
    }
  }

  const currentScore = score(values)

  return (
    <div>
      <div className="v2-page-title">Recovery</div>

      {dbMissing && (
        <div className="card" style={{ borderColor: 'var(--abrd)', background: 'var(--abg)' }}>
          <strong style={{ fontSize: 14 }}>Recovery logging isn't connected yet.</strong>
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text2)' }}>
            Your coach needs to run a quick database update before check-ins save to your account.
          </p>
        </div>
      )}

      <div className="card">
        <div className="v2-card-title-row">
          <span className="v2-card-eyebrow">Today's Check-in</span>
          <button className="btn-small" onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {saveMsg && (
          <div className={saveMsg.includes('Could not') ? 'error-text' : 'success-text'} style={{ marginBottom: 10 }}>
            {saveMsg}
          </div>
        )}

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

      <div className="card">
        <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Recovery Log</div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : history.length === 0 ? (
          <div className="empty-state">No check-ins yet. Log your first one above.</div>
        ) : (
          <div className="log-list">
            {history.map((r) => (
              <div className="log-row" key={r.log_date}>
                <span className="date">{fmtDate(r.log_date)}</span>
                <span className="val" style={{ color: score(r) >= 20 ? 'var(--g)' : 'var(--a)' }}>{score(r)}/25</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
