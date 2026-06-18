import { useState } from 'react'
import { DEMO_LOGBOOK_ENTRIES } from '../demoData'
import DemoBadge from '../components/DemoBadge'

export default function LogbookScreen() {
  const [entries, setEntries] = useState(DEMO_LOGBOOK_ENTRIES)
  const [exercise, setExercise] = useState('')
  const [set1, setSet1] = useState('')
  const [set2, setSet2] = useState('')

  function handleSave(e) {
    e.preventDefault()
    if (!exercise.trim()) return
    setEntries([
      { date: 'Today', session: 'Upper A', exercise, set1, set2, rir: 0 },
      ...entries,
    ])
    setExercise('')
    setSet1('')
    setSet2('')
  }

  return (
    <div>
      <div className="v2-page-title">Logbook</div>
      <DemoBadge label="Demo data — entries here are not saved to your account yet" />

      <div className="card">
        <div className="v2-card-eyebrow" style={{ marginBottom: 16 }}>Log New Entry</div>
        <form onSubmit={handleSave}>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div>
              <label className="form-label">Date</label>
              <input type="text" value="Jun 18, 2026" disabled />
            </div>
            <div>
              <label className="form-label">Session</label>
              <select defaultValue="Upper A">
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
          <button className="btn-primary" type="submit">Save Entry</button>
        </form>
      </div>

      <div className="v2-card-eyebrow" style={{ margin: '20px 0 12px' }}>Recent Entries</div>
      {entries.map((e, i) => (
        <div className="v2-entry-card" key={i}>
          <div className="v2-entry-top">
            <span className="v2-entry-date">{e.date}</span>
            <span className="v2-entry-tag lower">{e.session}</span>
          </div>
          <div className="v2-entry-name">{e.exercise}</div>
          <div className="v2-entry-meta">
            S1: {e.set1 || '—'} · S2: {e.set2 || '—'} · RIR: {e.rir}
          </div>
        </div>
      ))}
    </div>
  )
}
