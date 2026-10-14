import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { DAY_LABELS } from '../../lib/nutrition'

const EYEBROW = { fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }
const LBL = { display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }
const SECTION = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }

// ════════════════════════════════════════════════════════════
// NUTRITION ASSIGN — sits at the top of the ClientDetail
// Nutrition tab. Assigns a macro template (with per-day-type
// targets) and grocery lists to this client. Template targets
// take precedence over the manual plan form below.
// ════════════════════════════════════════════════════════════

export default function NutritionAssign({ clientId }) {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState('')
  const [current, setCurrent] = useState(null) // { row, template, days }
  const [groceryT, setGroceryT] = useState([])
  const [gSelected, setGSelected] = useState('')
  const [gLists, setGLists] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { if (profile && clientId) { load(); } }, [profile, clientId])

  async function load() {
    try {
      const { data: tpls } = await supabase.from('nutrition_templates')
        .select('id, name, goal').eq('coach_id', profile.id).order('name')
      setTemplates(tpls || [])

      const { data: row } = await supabase.from('client_nutrition')
        .select('*').eq('client_id', clientId).maybeSingle()
      if (row?.template_id) {
        const [{ data: tpl }, { data: days }] = await Promise.all([
          supabase.from('nutrition_templates').select('id, name, goal').eq('id', row.template_id).maybeSingle(),
          supabase.from('nutrition_template_days').select('*').eq('template_id', row.template_id),
        ])
        setCurrent({ row, template: tpl, days: days || [] })
        setSelected(row.template_id)
      } else {
        setCurrent(row ? { row, template: null, days: [] } : null)
      }

      const { data: gt } = await supabase.from('grocery_templates')
        .select('id, name').eq('coach_id', profile.id).order('name')
      setGroceryT(gt || [])

      const { data: gl } = await supabase.from('client_grocery_lists')
        .select('id, template_id, grocery_templates(id, name)').eq('client_id', clientId)
      setGLists(gl || [])
    } catch { /* tables missing until migration is run — section stays quiet */ }
  }

  async function assignTemplate() {
    if (!selected) return
    setBusy(true); setMsg('')
    try {
      const { error } = await supabase.from('client_nutrition').upsert(
        { client_id: clientId, template_id: selected, day_override: null, updated_at: new Date().toISOString() },
        { onConflict: 'client_id' },
      )
      if (error) throw error
      setMsg('✓ Template assigned — the client sees day-type targets now.')
      await load()
    } catch (e) {
      setMsg(e.message || "Couldn't assign the template.")
    }
    setBusy(false)
  }

  async function unassignTemplate() {
    setBusy(true); setMsg('')
    try {
      const { error } = await supabase.from('client_nutrition').delete().eq('client_id', clientId)
      if (error) throw error
      setSelected(''); setMsg('Template removed.')
      await load()
    } catch (e) {
      setMsg(e.message || "Couldn't remove the template.")
    }
    setBusy(false)
  }

  async function assignGrocery() {
    if (!gSelected) return
    setBusy(true); setMsg('')
    try {
      const { error } = await supabase.from('client_grocery_lists')
        .insert({ client_id: clientId, template_id: gSelected })
      if (error) throw error
      setGSelected(''); setMsg('✓ Grocery list assigned.')
      await load()
    } catch (e) {
      setMsg(e.message || "Couldn't assign the list.")
    }
    setBusy(false)
  }

  async function unassignGrocery(listId) {
    setBusy(true); setMsg('')
    try {
      const { error } = await supabase.from('client_grocery_lists').delete().eq('id', listId)
      if (error) throw error
      await load()
    } catch (e) {
      setMsg(e.message || "Couldn't remove the list.")
    }
    setBusy(false)
  }

  return (
    <div style={{ marginBottom: 22 }}>
      <div style={SECTION}>
        <div style={EYEBROW}>Macro template</div>
        {current?.template ? (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
              {current.template.name}{' '}
              <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--gbg)', color: 'var(--g)', borderRadius: 6, padding: '3px 8px' }}>Assigned</span>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
              {['training', 'legs', 'rest'].map(dt => {
                const d = (current.days || []).find(x => x.day_type === dt)
                return (
                  <div key={dt} style={{ fontSize: 13, color: 'var(--text2)' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text)' }}>{DAY_LABELS[dt]}</span>
                    {' — '}{d?.calories ?? '—'} cal · {d?.protein_g ?? '—'}P / {d?.carbs_g ?? '—'}C / {d?.fat_g ?? '—'}F
                  </div>
                )
              })}
            </div>
            <button onClick={unassignTemplate} disabled={busy}
              style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>
              Remove template
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={LBL}>Assign template</label>
              <select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: '100%', fontSize: 14, padding: '10px 12px' }}>
                <option value="">Choose a template…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.goal ? ` — ${t.goal}` : ''}</option>)}
              </select>
            </div>
            <button onClick={assignTemplate} disabled={busy || !selected} className="btn-primary" style={{ maxWidth: 200 }}>
              {busy ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        )}
        {!templates.length && !current?.template && (
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>
            No macro templates yet — build one on the <a href="/coach/nutrition" style={{ color: 'var(--v2)', fontWeight: 700 }}>Nutrition page</a>.
          </div>
        )}
      </div>

      <div style={SECTION}>
        <div style={EYEBROW}>Grocery lists</div>
        {gLists.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {gLists.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>🛒 {l.grocery_templates?.name || 'List'}</span>
                <button onClick={() => unassignGrocery(l.id)} disabled={busy}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={LBL}>Assign grocery list</label>
            <select value={gSelected} onChange={e => setGSelected(e.target.value)} style={{ width: '100%', fontSize: 14, padding: '10px 12px' }}>
              <option value="">Choose a list…</option>
              {groceryT.filter(t => !gLists.some(l => l.template_id === t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button onClick={assignGrocery} disabled={busy || !gSelected} className="btn-primary" style={{ maxWidth: 200 }}>
            {busy ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </div>

      {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.startsWith('✓') ? 'var(--g)' : 'var(--r)' }}>{msg}</div>}
    </div>
  )
}
