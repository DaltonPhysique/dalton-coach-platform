import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { localDateStr } from '../../../lib/dates'

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isMissingTable(error) {
  return error && (error.code === '42P01' || /does not exist/i.test(error.message || ''))
}

export default function LogbookScreen({ profile }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [exercise, setExercise] = useState('')
  const [session, setSession] = useState('Upper A')
  const [set1, setSet1] = useState('')
  const [set2, setSet2] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [dbMissing, setDbMissing] = useState(false)

  useEffect(() => {
    async function load() {
      if (!profile?.id) { setLoading(false); return }
      try {
        const { data, error } = await supabase
          .from('client_pr_logs').select('*')
          .eq('client_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (error) throw error
        setEntries(data || [])
      } catch (e) {
        if (isMissingTable(e)) setDbMissing(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile?.id])

  async function handleSave(e) {
    e.preventDefault()
    if (!exercise.trim() || saving || dbMissing) return
    setSaving(true)
    setSaveMsg('')
    try {
      const { data, error } = await supabase
        .from('client_pr_logs')
        .insert({
          client_id: profile.id,
          log_date: localDateStr(),
          session,
          exercise: exercise.trim(),
          set1: set1.trim() || null,
          set2: set2.trim() || null,
        })
        .select()
        .single()
      if (error) throw error
      setEntries(prev => [data, ...prev])
      setExercise('')
      setSet1('')
      setSet2('')
      setSaveMsg('Saved ✓')
    } catch (err) {
      if (isMissingTable(err)) {
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

  return (
    <div>
      <div className="v2-page-title">Logbook</div>

      {dbMissing && (
        <div className="card" style={{ borderColor: 'var(--abrd)', background: 'var(--abg)' }}>
          <strong style={{ fontSize: 14 }}>The logbook isn't connected yet.</strong>
          <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text2)' }}>
            Your coach needs to run a quick database update before entries save to your account.
          </p>
        </div>
      )}

      <div className="card">
        <div className="v2-card-eyebrow" style={{ marginBottom: 16 }}>Log New Entry</div>
        <form onSubmit={handleSave}>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="form-label">Date</label>
              <input type="text" value={todayLabel()} disabled />
            </div>
            <div>
              <label className="form-label">Session</label>
              <select value={session} onChange={(e) => setSession(e.target.value)}>
                <option>Upper A</option>
                <option>Upper B</option>
                <option>Lower A</option>
                <option>Lower B</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Exercise</label>
            <input
              type="text"
              placeholder="e.g. Incline Smith Press"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
            />
          </div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="form-label">Set 1</label>
              <input type="text" placeholder="225 × 8" value={set1} onChange={(e) => setSet1(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Set 2</label>
              <input type="text" placeholder="225 × 7" value={set2} onChange={(e) => setSet2(e.target.value)} />
            </div>
          </div>
          {saveMsg && (
            <div className={saveMsg.includes('Could not') ? 'error-text' : 'success-text'} style={{ marginBottom: 10 }}>
              {saveMsg}
            </div>
          )}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </form>
      </div>

      <div className="v2-card-eyebrow" style={{ margin: '20px 0 12px' }}>Recent Entries</div>
      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">No entries yet. Log your first one above.</div>
      ) : (
        entries.map((e) => (
          <div className="v2-entry-card" key={e.id}>
            <div className="v2-entry-top">
              <span className="v2-entry-date">{fmtDate(e.log_date)}</span>
              {e.session && <span className="v2-entry-tag lower">{e.session}</span>}
            </div>
            <div className="v2-entry-name">{e.exercise}</div>
            <div className="v2-entry-meta">
              S1: {e.set1 || '—'} · S2: {e.set2 || '—'}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
