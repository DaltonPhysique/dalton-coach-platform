import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { BASE_NUTRITION } from '../../lib/baseNutrition'
import { BASE_GROCERY } from '../../lib/baseGrocery'
import { DAY_TYPES, DAY_LABELS } from '../../lib/nutrition'

const EYEBROW = { fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }
const LBL = { display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }
const SECTION = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }
const inputSm = { fontSize: 14, padding: '10px 12px' }

const DAY_ACCENT = { training: 'var(--v)', legs: 'var(--g)', rest: 'var(--a)' }
const DAY_COLOR = { training: 'var(--v2)', legs: 'var(--g)', rest: 'var(--a)' }

const blankDayMacros = () => ({ calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: 30 })
const blankMacroDays = () => ({ training: blankDayMacros(), legs: blankDayMacros(), rest: blankDayMacros() })
const blankGroceryCats = () => [{ category: '', items: [''] }]

// ════════════════════════════════════════════════════════════
// NUTRITION TEMPLATES — coach builds reusable macro presets with
// per-day-type targets (training / leg day / rest), plus grocery
// lists. Assign to a client from their detail page → Nutrition tab.
// ════════════════════════════════════════════════════════════

export default function NutritionTemplates() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [subtab, setSubtab] = useState('macros') // 'macros' | 'grocery'

  // ── macro templates state ──
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('Fat loss')
  const [notes, setNotes] = useState('')
  const [macroDays, setMacroDays] = useState(blankMacroDays())
  const [busy, setBusy] = useState(false)
  const [baseBusy, setBaseBusy] = useState(null)
  const [error, setError] = useState('')

  // ── grocery state ──
  const [gTemplates, setGTemplates] = useState([])
  const [gLoading, setGLoading] = useState(true)
  const [gEditing, setGEditing] = useState(null)
  const [gName, setGName] = useState('')
  const [gCats, setGCats] = useState(blankGroceryCats())
  const [gBusy, setGBusy] = useState(false)
  const [gBaseBusy, setGBaseBusy] = useState(null)
  const [gError, setGError] = useState('')

  useEffect(() => { if (profile) { loadTemplates(); loadGrocery() } }, [profile])

  // ════════ macro templates ════════
  async function loadTemplates() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('nutrition_templates').select('id, name, goal, created_at')
        .eq('coach_id', profile.id).order('created_at', { ascending: false })
      if (error) throw error
      setTemplates(data || [])
    } catch { /* tables missing until migration is run */ }
    setLoading(false)
  }

  function startNew() {
    setEditing('new'); setName(''); setGoal('Fat loss'); setNotes('')
    setMacroDays(blankMacroDays()); setError('')
  }

  async function startEdit(t) {
    setError('')
    const { data: days } = await supabase.from('nutrition_template_days')
      .select('*').eq('template_id', t.id)
    const md = blankMacroDays()
    for (const d of days || []) {
      if (md[d.day_type]) {
        md[d.day_type] = {
          calories: d.calories ?? '', protein_g: d.protein_g ?? '',
          carbs_g: d.carbs_g ?? '', fat_g: d.fat_g ?? '', fiber_g: d.fiber_g ?? 30,
        }
      }
    }
    setEditing(t.id); setName(t.name); setGoal(t.goal || 'Fat loss'); setNotes(t.notes || '')
    setMacroDays(md)
  }

  function setDayVal(dt, field, val) {
    setMacroDays(prev => ({ ...prev, [dt]: { ...prev[dt], [field]: val } }))
  }

  async function saveTemplate() {
    setError('')
    if (!name.trim()) { setError('Give the template a name.'); return }
    const filled = DAY_TYPES.filter(dt => macroDays[dt].calories !== '' && macroDays[dt].calories != null)
    if (!filled.length) { setError('Fill in at least one day type.'); return }
    setBusy(true)
    try {
      let templateId = editing
      if (editing === 'new') {
        const { data, error } = await supabase.from('nutrition_templates')
          .insert({ coach_id: profile.id, name: name.trim(), goal, notes: notes.trim() || null })
          .select('id').single()
        if (error) throw error
        templateId = data.id
      } else {
        const { error } = await supabase.from('nutrition_templates')
          .update({ name: name.trim(), goal, notes: notes.trim() || null }).eq('id', editing)
        if (error) throw error
        await supabase.from('nutrition_template_days').delete().eq('template_id', editing)
      }
      const rows = filled.map(dt => ({
        template_id: templateId, day_type: dt,
        calories: Number(macroDays[dt].calories) || null,
        protein_g: Number(macroDays[dt].protein_g) || null,
        carbs_g: Number(macroDays[dt].carbs_g) || null,
        fat_g: Number(macroDays[dt].fat_g) || null,
        fiber_g: Number(macroDays[dt].fiber_g) || 0,
      }))
      const { error: dErr } = await supabase.from('nutrition_template_days').insert(rows)
      if (dErr) throw dErr
      setEditing(null)
      await loadTemplates()
    } catch (e) {
      setError(e.message || "Couldn't save the template.")
    }
    setBusy(false)
  }

  async function useBaseNutrition(bt) {
    setError(''); setBaseBusy(bt.name)
    try {
      const { data, error } = await supabase.from('nutrition_templates')
        .insert({ coach_id: profile.id, name: bt.name, goal: bt.goal, notes: bt.notes || null })
        .select('id').single()
      if (error) throw error
      const rows = DAY_TYPES.map(dt => ({
        template_id: data.id, day_type: dt,
        calories: bt.days[dt].calories, protein_g: bt.days[dt].protein_g,
        carbs_g: bt.days[dt].carbs_g, fat_g: bt.days[dt].fat_g,
        fiber_g: bt.days[dt].fiber_g ?? 30,
      }))
      const { error: dErr } = await supabase.from('nutrition_template_days').insert(rows)
      if (dErr) throw dErr
      await loadTemplates()
      await startEdit({ id: data.id, name: bt.name, goal: bt.goal })
    } catch (e) {
      setError(e.message || "Couldn't create the template from the base.")
    }
    setBaseBusy(null)
  }

  async function deleteTemplate(id) {
    if (!window.confirm('Delete this template? Clients assigned to it keep their current targets until you assign a new one.')) return
    await supabase.from('client_nutrition').update({ template_id: null }).eq('template_id', id)
    await supabase.from('nutrition_templates').delete().eq('id', id)
    await loadTemplates()
  }

  // ════════ grocery templates ════════
  async function loadGrocery() {
    setGLoading(true)
    try {
      const { data, error } = await supabase
        .from('grocery_templates').select('id, name, created_at')
        .eq('coach_id', profile.id).order('created_at', { ascending: false })
      if (error) throw error
      const withCounts = await Promise.all((data || []).map(async t => {
        const { count } = await supabase.from('grocery_items')
          .select('id', { count: 'exact', head: true }).eq('template_id', t.id)
        return { ...t, itemCount: count || 0 }
      }))
      setGTemplates(withCounts)
    } catch { /* tables missing until migration is run */ }
    setGLoading(false)
  }

  function gStartNew() {
    setGEditing('new'); setGName(''); setGCats(blankGroceryCats()); setGError('')
  }

  async function gStartEdit(t) {
    setGError('')
    const { data: items } = await supabase.from('grocery_items')
      .select('*').eq('template_id', t.id).order('sort_order')
    const grouped = []
    for (const it of items || []) {
      let c = grouped.find(g => g.category === it.category)
      if (!c) { c = { category: it.category, items: [] }; grouped.push(c) }
      c.items.push(it.item)
    }
    setGEditing(t.id); setGName(t.name)
    setGCats(grouped.length ? grouped : blankGroceryCats())
  }

  function setCat(ci, val) {
    setGCats(cs => cs.map((c, i) => i === ci ? { ...c, category: val } : c))
  }
  function setItem(ci, ii, val) {
    setGCats(cs => cs.map((c, i) => i === ci
      ? { ...c, items: c.items.map((it, j) => j === ii ? val : it) } : c))
  }
  function addItem(ci) { setGCats(cs => cs.map((c, i) => i === ci ? { ...c, items: [...c.items, ''] } : c)) }
  function removeItem(ci, ii) { setGCats(cs => cs.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c)) }
  function addCategory() { setGCats(cs => [...cs, { category: '', items: [''] }]) }
  function removeCategory(ci) { setGCats(cs => cs.filter((_, i) => i !== ci)) }

  async function gSaveTemplate() {
    setGError('')
    if (!gName.trim()) { setGError('Give the list a name.'); return }
    const clean = gCats
      .map(c => ({ category: c.category.trim(), items: c.items.map(i => i.trim()).filter(Boolean) }))
      .filter(c => c.category && c.items.length)
    if (!clean.length) { setGError('Add at least one category with one item.'); return }
    setGBusy(true)
    try {
      let templateId = gEditing
      if (gEditing === 'new') {
        const { data, error } = await supabase.from('grocery_templates')
          .insert({ coach_id: profile.id, name: gName.trim() }).select('id').single()
        if (error) throw error
        templateId = data.id
      } else {
        const { error } = await supabase.from('grocery_templates')
          .update({ name: gName.trim() }).eq('id', gEditing)
        if (error) throw error
        await supabase.from('grocery_items').delete().eq('template_id', gEditing)
      }
      let order = 0
      const rows = []
      for (const c of clean) {
        for (const item of c.items) {
          rows.push({ template_id: templateId, category: c.category, item, sort_order: order++ })
        }
      }
      const { error: iErr } = await supabase.from('grocery_items').insert(rows)
      if (iErr) throw iErr
      setGEditing(null)
      await loadGrocery()
    } catch (e) {
      setGError(e.message || "Couldn't save the list.")
    }
    setGBusy(false)
  }

  async function useBaseGrocery(bg) {
    setGError(''); setGBaseBusy(bg.name)
    try {
      const { data, error } = await supabase.from('grocery_templates')
        .insert({ coach_id: profile.id, name: bg.name }).select('id').single()
      if (error) throw error
      let order = 0
      const rows = []
      for (const c of bg.categories) {
        for (const item of c.items) {
          rows.push({ template_id: data.id, category: c.category, item, sort_order: order++ })
        }
      }
      const { error: iErr } = await supabase.from('grocery_items').insert(rows)
      if (iErr) throw iErr
      await loadGrocery()
      await gStartEdit({ id: data.id, name: bg.name })
    } catch (e) {
      setGError(e.message || "Couldn't create the list from the base.")
    }
    setGBaseBusy(null)
  }

  async function gDeleteTemplate(id) {
    if (!window.confirm('Delete this grocery list? Clients assigned to it will lose it.')) return
    await supabase.from('grocery_templates').delete().eq('id', id)
    await loadGrocery()
  }

  const goalPill = (g) => (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase',
      borderRadius: 6, padding: '3px 8px',
      background: g === 'Fat loss' ? 'var(--gbg)' : 'var(--vbg)',
      color: g === 'Fat loss' ? 'var(--g)' : 'var(--v2)',
    }}>{g}</span>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '26px 28px', paddingTop: 'max(26px, env(safe-area-inset-top))' }}>
        <button onClick={() => navigate('/coach')}
          style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 13px', color: 'var(--text2)', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
          ← Command Center
        </button>

        <div style={EYEBROW}>Programming</div>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.5px', marginBottom: 18 }}>Nutrition</div>

        <div className="v2-subtabs" style={{ marginBottom: 22 }}>
          <button className={`v2-subtab ${subtab === 'macros' ? 'active' : ''}`} onClick={() => setSubtab('macros')}>Macro Templates</button>
          <button className={`v2-subtab ${subtab === 'grocery' ? 'active' : ''}`} onClick={() => setSubtab('grocery')}>Grocery Lists</button>
        </div>

        {/* ════════ MACRO TEMPLATES ════════ */}
        {subtab === 'macros' && (<>
          {editing === null && (<>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn-primary" onClick={startNew} style={{ maxWidth: 220 }}>+ New Template</button>
            </div>
            {loading && <div className="muted">Loading…</div>}
            {!loading && (
              <div style={{ marginBottom: 26 }}>
                <div style={EYEBROW}>Start from a base template</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {BASE_NUTRITION.map(bt => (
                    <div key={bt.name} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{bt.name}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {goalPill(bt.goal)}
                        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                          {bt.days.training.calories} / {bt.days.legs.calories} / {bt.days.rest.calories} cal
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>Training · Legs · Rest targets</div>
                      <button onClick={() => useBaseNutrition(bt)} disabled={baseBusy !== null}
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
              </div>
            )}
            {templates.map(t => (
              <div key={t.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{t.name}</div>
                  <div style={{ marginTop: 4 }}>{goalPill(t.goal || 'Custom')}</div>
                </div>
                <button onClick={() => startEdit(t)} style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>Edit</button>
                <button onClick={() => deleteTemplate(t.id)} style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>Delete</button>
              </div>
            ))}
            {!loading && !templates.length && (
              <div className="card"><div className="empty-state"><div className="icon">🥗</div>Clone a base template above or build your own.</div></div>
            )}
            {error && <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{error}</div>}
          </>)}

          {editing !== null && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <label style={LBL}>Template name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aggressive Cut" style={{ fontWeight: 700, fontSize: 16 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={LBL}>Goal</label>
                  <select value={goal} onChange={e => setGoal(e.target.value)} style={{ ...inputSm, width: '100%' }}>
                    {['Fat loss', 'Recomp', 'Mass', 'Maintenance'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={LBL}>Notes (optional)</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Coaching notes shown with the targets…" style={{ resize: 'vertical' }} />
              </div>

              {DAY_TYPES.map(dt => (
                <div key={dt} style={SECTION}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: DAY_ACCENT[dt], boxShadow: `0 0 6px ${DAY_ACCENT[dt]}` }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: DAY_COLOR[dt] }}>{DAY_LABELS[dt]} day</span>
                  </div>
                  <div className="nutri-day-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                    {[['calories', 'Calories'], ['protein_g', 'Protein (g)'], ['carbs_g', 'Carbs (g)'], ['fat_g', 'Fat (g)'], ['fiber_g', 'Fiber (g)']].map(([k, l]) => (
                      <div key={k}>
                        <label style={LBL}>{l}</label>
                        <input type="number" value={macroDays[dt][k]} onChange={e => setDayVal(dt, k, e.target.value)} placeholder="—" style={inputSm} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {error && <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={saveTemplate} disabled={busy} style={{ maxWidth: 240 }}>
                  {busy ? 'Saving…' : (editing === 'new' ? 'Save Template' : 'Save Changes')}
                </button>
                <button onClick={() => setEditing(null)} style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700 }}>Cancel</button>
              </div>
            </div>
          )}
        </>)}

        {/* ════════ GROCERY LISTS ════════ */}
        {subtab === 'grocery' && (<>
          {gEditing === null && (<>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn-primary" onClick={gStartNew} style={{ maxWidth: 220 }}>+ New List</button>
            </div>
            {gLoading && <div className="muted">Loading…</div>}
            {!gLoading && (
              <div style={{ marginBottom: 26 }}>
                <div style={EYEBROW}>Start from a base list</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  {BASE_GROCERY.map(bg => (
                    <div key={bg.name} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{bg.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {bg.categories.length} categories · {bg.categories.reduce((n, c) => n + c.items.length, 0)} items
                      </div>
                      <button onClick={() => useBaseGrocery(bg)} disabled={gBaseBusy !== null}
                        style={{
                          marginTop: 'auto', background: gBaseBusy ? 'var(--bg4)' : 'linear-gradient(135deg,var(--v3),var(--v))',
                          color: gBaseBusy ? 'var(--text3)' : '#fff', border: 'none', borderRadius: 10,
                          padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: gBaseBusy ? 'default' : 'pointer',
                        }}>
                        {gBaseBusy === bg.name ? 'Creating…' : 'Use this list'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {gTemplates.map(t => (
              <div key={t.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{t.itemCount} items</div>
                </div>
                <button onClick={() => gStartEdit(t)} style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>Edit</button>
                <button onClick={() => gDeleteTemplate(t.id)} style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>Delete</button>
              </div>
            ))}
            {!gLoading && !gTemplates.length && (
              <div className="card"><div className="empty-state"><div className="icon">🛒</div>Clone the base list above or build your own.</div></div>
            )}
            {gError && <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginTop: 12 }}>{gError}</div>}
          </>)}

          {gEditing !== null && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <label style={LBL}>List name</label>
                <input value={gName} onChange={e => setGName(e.target.value)} placeholder="e.g. High-Protein Staples" style={{ fontWeight: 700, fontSize: 16 }} />
              </div>
              {gCats.map((c, ci) => (
                <div key={ci} style={SECTION}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                    <input value={c.category} onChange={e => setCat(ci, e.target.value)} placeholder="Category (e.g. Proteins)" style={{ fontWeight: 700, fontSize: 15, flex: 1 }} />
                    <button type="button" onClick={() => removeCategory(ci)}
                      style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Remove</button>
                  </div>
                  {c.items.map((it, ii) => (
                    <div key={ii} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input value={it} onChange={e => setItem(ci, ii, e.target.value)} placeholder="Item" style={{ ...inputSm, flex: 1 }} />
                      <button type="button" onClick={() => removeItem(ci, ii)}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, lineHeight: 1, padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addItem(ci)}
                    style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, marginTop: 4 }}>+ Add Item</button>
                </div>
              ))}
              <button type="button" onClick={addCategory}
                style={{ background: 'var(--vbg)', border: '1px solid var(--vbrd)', color: 'var(--v2)', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, marginBottom: 20 }}>+ Add Category</button>
              {gError && <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{gError}</div>}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={gSaveTemplate} disabled={gBusy} style={{ maxWidth: 240 }}>
                  {gBusy ? 'Saving…' : (gEditing === 'new' ? 'Save List' : 'Save Changes')}
                </button>
                <button onClick={() => setGEditing(null)} style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700 }}>Cancel</button>
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}
