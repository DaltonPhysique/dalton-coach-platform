import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { BASE_TEMPLATES } from '../../lib/baseTemplates'

const EYEBROW = { fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }
const LBL = { display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }
const SECTION = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }
const inputSm = { fontSize: 14, padding: '10px 12px' }

const blankExercise = () => ({ exercise: '', sets: 3, rep_min: 8, rep_max: 12, target_rir: 2, start_weight: '', notes: '' })
const blankDay = (day) => ({ day, exercises: [blankExercise()] })

// ════════════════════════════════════════════════════════════
// MESOCYCLE TEMPLATES — coach builds reusable RP-style programs:
// name, length (weeks), session days, and per-exercise
// sets × rep range × target RIR × starting weight.
// Assign to a client from their detail page → Mesocycle tab.
// ════════════════════════════════════════════════════════════

export default function MesocycleTemplates() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | templateId

  const [name, setName] = useState('')
  const [weeks, setWeeks] = useState(5)
  const [days, setDays] = useState([blankDay('Upper A')])
  const [busy, setBusy] = useState(false)
  const [baseBusy, setBaseBusy] = useState(null) // base template name being cloned
  const [error, setError] = useState('')

  useEffect(() => { if (profile) loadTemplates() }, [profile])

  async function loadTemplates() {
    setLoading(true)
    try {
      const { data: tpls, error } = await supabase
        .from('mesocycle_templates').select('id, name, weeks, created_at')
        .eq('coach_id', profile.id).order('created_at', { ascending: false })
      if (error) throw error
      const withCounts = await Promise.all((tpls || []).map(async t => {
        const { count } = await supabase.from('template_exercises')
          .select('id', { count: 'exact', head: true }).eq('template_id', t.id)
        return { ...t, exerciseCount: count || 0 }
      }))
      setTemplates(withCounts)
    } catch { /* tables missing until migration is run */ }
    setLoading(false)
  }

  function startNew() {
    setEditing('new'); setName(''); setWeeks(5); setDays([blankDay('Upper A')]); setError('')
  }

  async function startEdit(t) {
    setError('')
    const { data: exs } = await supabase.from('template_exercises')
      .select('*').eq('template_id', t.id).order('sort_order')
    const grouped = []
    for (const e of exs || []) {
      let d = grouped.find(g => g.day === e.session_day)
      if (!d) { d = { day: e.session_day, exercises: [] }; grouped.push(d) }
      d.exercises.push({ exercise: e.exercise, sets: e.sets, rep_min: e.rep_min, rep_max: e.rep_max, target_rir: e.target_rir, start_weight: e.start_weight, notes: e.notes || '' })
    }
    setEditing(t.id); setName(t.name); setWeeks(t.weeks)
    setDays(grouped.length ? grouped : [blankDay('Upper A')])
  }

  function updateDay(di, field, val) {
    setDays(ds => ds.map((d, i) => i === di ? { ...d, [field]: val } : d))
  }
  function updateEx(di, ei, field, val) {
    setDays(ds => ds.map((d, i) => i === di
      ? { ...d, exercises: d.exercises.map((e, j) => j === ei ? { ...e, [field]: val } : e) }
      : d))
  }

  // Insert template_exercises rows. If the DB was migrated before the
  // `notes` column existed, retry without it instead of failing.
  async function insertExercises(rows) {
    const { error } = await supabase.from('template_exercises').insert(rows)
    if (error && /notes/i.test(error.message || '')) {
      const stripped = rows.map(r => { const { notes, ...rest } = r; return rest })
      const retry = await supabase.from('template_exercises').insert(stripped)
      if (retry.error) throw retry.error
      return
    }
    if (error) throw error
  }

  async function saveTemplate() {
    setError('')
    if (!name.trim()) { setError('Give the template a name.'); return }
    const cleanDays = days.filter(d => d.day.trim() && d.exercises.some(e => e.exercise.trim()))
    if (!cleanDays.length) { setError('Add at least one day with one exercise.'); return }
    setBusy(true)
    try {
      let templateId = editing
      if (editing === 'new') {
        const { data, error } = await supabase.from('mesocycle_templates')
          .insert({ coach_id: profile.id, name: name.trim(), weeks: Number(weeks) })
          .select('id').single()
        if (error) throw error
        templateId = data.id
      } else {
        const { error } = await supabase.from('mesocycle_templates')
          .update({ name: name.trim(), weeks: Number(weeks) }).eq('id', editing)
        if (error) throw error
        await supabase.from('template_exercises').delete().eq('template_id', editing)
      }
      let order = 0
      const rows = []
      for (const d of cleanDays) {
        for (const e of d.exercises) {
          if (!e.exercise.trim()) continue
          rows.push({
            template_id: templateId, session_day: d.day.trim(), exercise: e.exercise.trim(),
            sets: Number(e.sets) || 3, rep_min: Number(e.rep_min) || 8,
            rep_max: Number(e.rep_max) || 12, target_rir: Number(e.target_rir) ?? 2,
            start_weight: Number(e.start_weight) || 0, notes: (e.notes || '').trim() || null,
            sort_order: order++,
          })
        }
      }
      await insertExercises(rows)
      setEditing(null)
      await loadTemplates()
    } catch (e) {
      setError(e.message || 'Couldn\'t save the template.')
    }
    setBusy(false)
  }

  // Clone a base template into the coach's own templates, then open it
  // for editing so every detail can be tweaked before assigning.
  async function useBaseTemplate(bt) {
    setError(''); setBaseBusy(bt.name)
    try {
      const { data, error } = await supabase.from('mesocycle_templates')
        .insert({ coach_id: profile.id, name: bt.name, weeks: bt.weeks })
        .select('id').single()
      if (error) throw error
      let order = 0
      const rows = []
      for (const d of bt.days) {
        for (const e of d.exercises) {
          rows.push({
            template_id: data.id, session_day: d.day, exercise: e.exercise,
            sets: e.sets, rep_min: e.rep_min, rep_max: e.rep_max,
            target_rir: e.target_rir, start_weight: e.start_weight || 0,
            notes: e.notes || null, sort_order: order++,
          })
        }
      }
      await insertExercises(rows)
      await loadTemplates()
      await startEdit({ id: data.id, name: bt.name, weeks: bt.weeks })
    } catch (e) {
      setError(e.message || 'Couldn\'t create the template from the base.')
    }
    setBaseBusy(null)
  }

  async function deleteTemplate(id) {
    if (!window.confirm('Delete this template? Clients on it keep their history, but it can\'t be assigned again.')) return
    // Guard: don't delete a template with an active client mesocycle
    const { count } = await supabase.from('client_mesocycles')
      .select('id', { count: 'exact', head: true }).eq('template_id', id).eq('status', 'active')
    if (count > 0) { alert('A client is actively running this template. End their mesocycle first.'); return }
    await supabase.from('mesocycle_templates').delete().eq('id', id)
    await loadTemplates()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '26px 28px' }}>
        <button onClick={() => navigate('/coach')}
          style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 13px', color: 'var(--text2)', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
          ← Command Center
        </button>

        <div style={EYEBROW}>Programming</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.5px' }}>Mesocycle Templates</div>
          {editing === null && (
            <button className="btn-primary" onClick={startNew} style={{ maxWidth: 220 }}>+ New Template</button>
          )}
        </div>

        {loading && <div className="muted">Loading…</div>}

        {/* ── base templates ── */}
        {editing === null && !loading && (
          <div style={{ marginBottom: 26 }}>
            <div style={EYEBROW}>Start from a base template</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {BASE_TEMPLATES.map(bt => (
                <div key={bt.name} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{bt.name}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase',
                      borderRadius: 6, padding: '3px 8px',
                      background: bt.goal === 'Fat loss' ? 'var(--gbg)' : 'var(--vbg)',
                      color: bt.goal === 'Fat loss' ? 'var(--g)' : 'var(--v2)',
                    }}>{bt.goal}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                      {bt.weeks} weeks · {bt.days.length} days
                    </span>
                  </div>
                  <button onClick={() => useBaseTemplate(bt)} disabled={baseBusy !== null}
                    style={{
                      marginTop: 'auto', background: baseBusy ? 'var(--bg4)' : 'linear-gradient(135deg,var(--v3),var(--v))',
                      color: baseBusy ? 'var(--text3)' : '#fff', border: 'none', borderRadius: 10,
                      padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: baseBusy ? 'default' : 'pointer',
                    }}>
                    {baseBusy === bt.name ? 'Creating…' : 'Use this template'}
                  </button>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginTop: 12 }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* ── list ── */}
        {editing === null && !loading && (
          <>
            <div style={EYEBROW}>Your templates</div>
            {templates.length === 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>
                No templates yet. Build one — it becomes the program your clients run week to week.
              </div>
            )}
            {templates.map(t => (
              <div key={t.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{t.weeks} weeks · {t.exerciseCount} exercises</div>
                </div>
                <button onClick={() => startEdit(t)} style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700 }}>Edit</button>
                <button onClick={() => deleteTemplate(t.id)} style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700 }}>Delete</button>
              </div>
            ))}
          </>
        )}

        {/* ── builder ── */}
        {editing !== null && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 26px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 20 }}>
              <div><label style={LBL}>Template name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hypertrophy Block 1" style={{ fontSize: 16, fontWeight: 700 }} /></div>
              <div><label style={LBL}>Weeks</label>
                <select value={weeks} onChange={e => setWeeks(e.target.value)} style={{ fontSize: 16, padding: '12px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', width: '100%' }}>
                  {[4, 5, 6].map(w => <option key={w} value={w}>{w} weeks</option>)}
                </select></div>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
              The final week auto-deloads (half the sets, 60% load, RIR 3). Starting weight is week 1 — the app progresses it from there.
            </p>

            {days.map((d, di) => (
              <div key={di} style={{ ...SECTION }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                  <input value={d.day} onChange={e => updateDay(di, 'day', e.target.value)} placeholder="Day name (e.g. Upper A)" style={{ fontWeight: 700, fontSize: 15, flex: 1 }} />
                  <button type="button" onClick={() => setDays(ds => ds.filter((_, i) => i !== di))}
                    style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 52px 52px 52px 52px 64px 28px', gap: 6, marginBottom: 6, padding: '0 2px' }}>
                  {['Exercise', 'Sets', 'Min', 'Max', 'RIR', 'Start lb', ''].map(h => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text3)' }}>{h}</div>
                  ))}
                </div>
                {d.exercises.map((e, ei) => (
                  <div key={ei} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 52px 52px 52px 52px 64px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <input value={e.exercise} onChange={ev => updateEx(di, ei, 'exercise', ev.target.value)} placeholder="Bench Press" style={inputSm} />
                      <input type="number" value={e.sets} onChange={ev => updateEx(di, ei, 'sets', ev.target.value)} style={{ ...inputSm, textAlign: 'center' }} />
                      <input type="number" value={e.rep_min} onChange={ev => updateEx(di, ei, 'rep_min', ev.target.value)} style={{ ...inputSm, textAlign: 'center' }} />
                      <input type="number" value={e.rep_max} onChange={ev => updateEx(di, ei, 'rep_max', ev.target.value)} style={{ ...inputSm, textAlign: 'center' }} />
                      <input type="number" value={e.target_rir} onChange={ev => updateEx(di, ei, 'target_rir', ev.target.value)} style={{ ...inputSm, textAlign: 'center' }} />
                      <input type="number" value={e.start_weight} onChange={ev => updateEx(di, ei, 'start_weight', ev.target.value)} placeholder="135" style={{ ...inputSm, textAlign: 'center' }} />
                      <button type="button" onClick={() => updateDay(di, 'exercises', d.exercises.filter((_, j) => j !== ei))}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, lineHeight: 1, padding: 0, cursor: 'pointer' }}>×</button>
                    </div>
                    <input value={e.notes} onChange={ev => updateEx(di, ei, 'notes', ev.target.value)}
                      placeholder="Note (optional) — e.g. Burnout, AMRAP, max hold"
                      style={{ ...inputSm, fontSize: 12, padding: '8px 12px', color: 'var(--text2)' }} />
                  </div>
                ))}
                <button type="button" onClick={() => updateDay(di, 'exercises', [...d.exercises, blankExercise()])}
                  style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, marginTop: 4 }}>+ Add Exercise</button>
              </div>
            ))}

            <button type="button" onClick={() => setDays(ds => [...ds, blankDay(`Day ${ds.length + 1}`)])}
              style={{ background: 'var(--vbg)', border: '1px solid var(--vbrd)', color: 'var(--v2)', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, marginBottom: 20 }}>+ Add Training Day</button>

            {error && <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={saveTemplate} disabled={busy} style={{ maxWidth: 240 }}>
                {busy ? 'Saving…' : (editing === 'new' ? 'Save Template' : 'Save Changes')}
              </button>
              <button onClick={() => setEditing(null)} style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700 }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
