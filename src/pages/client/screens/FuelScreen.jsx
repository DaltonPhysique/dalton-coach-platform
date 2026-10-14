import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { DAY_TYPES, DAY_LABELS, resolveDayType, inferDayTypeFromLogs, todaysMacros } from '../../../lib/nutrition'
import { localDateStr } from '../../../lib/dates'
import {
  foodSearchAvailable, searchFoods, scaleMacros, gramsFromOz,
  MEALS, MEAL_LABELS,
} from '../../../lib/fooddb'

// ════════════════════════════════════════════════════════════
// FUEL — client nutrition tab.
//
// Two modes:
//  1. Template assigned (new): "Today's targets" resolved from the
//     coach's nutrition template day rows. Day type auto-detects
//     from today's logged session (leg keywords) with a manual
//     override toggle. Food log + remaining macros + grocery below.
//  2. No template (legacy): the old nutrition_plans training/rest
//     view, unchanged, with the food log appended. Honest empty
//     states when nothing is set.
//
// Food logging powers "remaining macros" — the number the future
// AI meal-builder will use. USDA search needs VITE_USDA_API_KEY;
// without it, search degrades honestly and manual entry works.
// ════════════════════════════════════════════════════════════

const inputLg = { fontSize: 16, padding: '12px 14px', width: '100%' }

function sumLogs(logs) {
  const t = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  for (const l of logs || []) {
    t.calories += Number(l.calories) || 0
    t.protein_g += Number(l.protein_g) || 0
    t.carbs_g += Number(l.carbs_g) || 0
    t.fat_g += Number(l.fat_g) || 0
    t.fiber_g += Number(l.fiber_g) || 0
  }
  const r = v => Math.round(v * 10) / 10
  return { calories: r(t.calories), protein_g: r(t.protein_g), carbs_g: r(t.carbs_g), fat_g: r(t.fat_g), fiber_g: r(t.fiber_g) }
}

// ── Today's food log + remaining macros ─────────────────────
function FoodLog({ clientId, targets, onLog, refreshKey }) {
  const [logs, setLogs] = useState([])
  const [ok, setOk] = useState(true)
  const [confirmDel, setConfirmDel] = useState(null)

  useEffect(() => { if (clientId) load() }, [clientId, refreshKey])

  async function load() {
    try {
      const { data, error } = await supabase.from('food_logs')
        .select('*').eq('client_id', clientId).eq('log_date', localDateStr())
        .order('created_at', { ascending: true })
      if (error) throw error
      setLogs(data || [])
      setOk(true)
    } catch { setOk(false) }
  }

  async function del(id) {
    if (confirmDel !== id) { setConfirmDel(id); return }
    setConfirmDel(null)
    setLogs(ls => ls.filter(l => l.id !== id))
    try {
      await supabase.from('food_logs').delete().eq('id', id).eq('client_id', clientId)
    } catch { load() }
  }

  if (!ok) return null // table missing until migration — stay quiet

  const totals = sumLogs(logs)
  const rem = targets ? {
    calories: Math.round((Number(targets.calories) || 0) - totals.calories),
    protein_g: Math.round(((Number(targets.protein_g) || 0) - totals.protein_g) * 10) / 10,
    carbs_g: Math.round(((Number(targets.carbs_g) || 0) - totals.carbs_g) * 10) / 10,
    fat_g: Math.round(((Number(targets.fat_g) || 0) - totals.fat_g) * 10) / 10,
  } : null

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="v2-card-eyebrow" style={{ margin: 0 }}>Today's food</div>
        <button onClick={onLog} className="btn-primary" style={{ maxWidth: 150, padding: '9px 16px', fontSize: 13 }}>
          + Log food
        </button>
      </div>

      {rem && (
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '14px 16px', marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>
            Remaining today
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: rem.calories < 0 ? 'var(--r)' : 'var(--text)' }}>
              {rem.calories}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>cal</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: rem.protein_g < 0 ? 'var(--r)' : 'var(--v2)' }}>{rem.protein_g}g P</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: rem.carbs_g < 0 ? 'var(--r)' : 'var(--g)' }}>{rem.carbs_g}g C</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: rem.fat_g < 0 ? 'var(--r)' : 'var(--a)' }}>{rem.fat_g}g F</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
            {totals.calories} cal logged{targets?.calories ? ` of ${targets.calories}` : ''}
          </div>
        </div>
      )}

      {!rem && logs.length > 0 && (
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          <strong style={{ color: 'var(--text)' }}>{totals.calories}</strong> cal · {totals.protein_g}g P · {totals.carbs_g}g C · {totals.fat_g}g F logged today
        </div>
      )}

      {logs.length === 0 ? (
        <div className="empty-state" style={{ padding: '18px 12px' }}>
          <div className="icon">📝</div>
          Nothing logged today yet.
        </div>
      ) : MEALS.map(m => {
        const items = logs.filter(l => l.meal === m)
        if (!items.length) return null
        return (
          <div key={m} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4 }}>
              {MEAL_LABELS[m]}
            </div>
            {items.map(l => (
              <button key={l.id} onClick={() => del(l.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                  background: confirmDel === l.id ? 'var(--rbg)' : 'none',
                  border: 'none', borderBottom: '1px solid var(--border)',
                  padding: '10px 4px', cursor: 'pointer', minHeight: 48,
                }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {confirmDel === l.id ? 'Tap again to delete' : l.description}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)' }}>
                    {Number(l.grams)}g · {l.calories} cal · {l.protein_g}P / {l.carbs_g}C / {l.fat_g}F
                  </span>
                </span>
                <span style={{ fontSize: 18, color: confirmDel === l.id ? 'var(--r)' : 'var(--text3)', padding: '6px 10px', flexShrink: 0 }}>
                  {confirmDel === l.id ? '🗑' : '×'}
                </span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Log-food bottom sheet ───────────────────────────────────
function FoodSheet({ clientId, onClose, onAdded }) {
  const [tab, setTab] = useState('search') // 'search' | 'manual'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState(null) // { name, per100, source, presetGrams }
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('g')
  const [meal, setMeal] = useState('lunch')
  const [recent, setRecent] = useState([])
  const [busy, setBusy] = useState(false)
  const [man, setMan] = useState({ name: '', grams: '', calories: '', protein: '', carbs: '', fat: '' })

  const searchOk = foodSearchAvailable()

  useEffect(() => { loadRecent() }, [])
  useEffect(() => {
    if (!searchOk || !query.trim()) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const r = await searchFoods(query)
      setResults(r)
      setSearching(false)
    }, 500)
    return () => clearTimeout(t)
  }, [query])

  async function loadRecent() {
    try {
      const { data } = await supabase.from('food_logs')
        .select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(80)
      const seen = new Map()
      for (const l of data || []) {
        if (!seen.has(l.description)) seen.set(l.description, l)
        if (seen.size >= 10) break
      }
      setRecent([...seen.values()])
    } catch { /* quiet */ }
  }

  function pickUsda(f) {
    setPicked({ name: f.brand ? `${f.name} (${f.brand})` : f.name, per100: f, source: 'usda', presetGrams: 100 })
    setAmount('100'); setUnit('g')
  }

  function pickRecent(l) {
    const g = Number(l.grams) || 1
    const per100 = {
      caloriesPer100g: (Number(l.calories) || 0) / g * 100,
      proteinPer100g: (Number(l.protein_g) || 0) / g * 100,
      carbsPer100g: (Number(l.carbs_g) || 0) / g * 100,
      fatPer100g: (Number(l.fat_g) || 0) / g * 100,
      fiberPer100g: (Number(l.fiber_g) || 0) / g * 100,
    }
    setPicked({ name: l.description, per100, source: 'recent', presetGrams: g })
    setAmount(String(g)); setUnit('g')
  }

  const grams = unit === 'oz' ? gramsFromOz(amount) : Number(amount) || 0
  const preview = picked ? scaleMacros(picked.per100, grams) : null

  async function addPicked() {
    if (!picked || !grams || grams <= 0 || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.from('food_logs').insert({
        client_id: clientId, log_date: localDateStr(), meal,
        description: picked.name, grams: Math.round(grams * 10) / 10,
        calories: preview.calories, protein_g: preview.protein_g,
        carbs_g: preview.carbs_g, fat_g: preview.fat_g, fiber_g: preview.fiber_g,
        source: picked.source === 'usda' ? 'usda' : 'manual',
      })
      if (error) throw error
      onAdded()
    } catch { /* keep sheet open on failure */ }
    setBusy(false)
  }

  async function addManual() {
    const g = Number(man.grams) || 0
    if (!man.name.trim() || !g || g <= 0 || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.from('food_logs').insert({
        client_id: clientId, log_date: localDateStr(), meal,
        description: man.name.trim(), grams: g,
        calories: Number(man.calories) || 0, protein_g: Number(man.protein) || 0,
        carbs_g: Number(man.carbs) || 0, fat_g: Number(man.fat) || 0, fiber_g: 0,
        source: 'manual',
      })
      if (error) throw error
      onAdded()
    } catch { /* keep sheet open on failure */ }
    setBusy(false)
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg2)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 540,
          maxHeight: '90vh', overflowY: 'auto', padding: '16px 18px calc(20px + env(safe-area-inset-bottom))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Log food</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--text3)', padding: '6px 10px' }}>×</button>
        </div>

        <div className="v2-subtabs" style={{ marginBottom: 14 }}>
          <button className={`v2-subtab ${tab === 'search' ? 'active' : ''}`} onClick={() => { setTab('search'); setPicked(null) }}>Search</button>
          <button className={`v2-subtab ${tab === 'manual' ? 'active' : ''}`} onClick={() => { setTab('manual'); setPicked(null) }}>Quick add</button>
        </div>

        {tab === 'search' && !picked && (
          <>
            {!searchOk ? (
              <div className="empty-state">
                <div className="icon">🔌</div>
                Food search isn't connected yet — your coach needs to add a USDA key.
                Manual entry below works fine.
              </div>
            ) : (
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search food — e.g. jasmine rice"
                autoFocus style={{ ...inputLg, marginBottom: 10 }} />
            )}
            {searchOk && searching && <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 2px' }}>Searching…</div>}
            {searchOk && !searching && results.map(f => (
              <button key={f.fdcId} onClick={() => pickUsda(f)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: '11px 4px', minHeight: 52 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{f.name}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)' }}>
                  per 100g · {Math.round(f.caloriesPer100g)} cal · {Math.round(f.proteinPer100g)}P / {Math.round(f.carbsPer100g)}C / {Math.round(f.fatPer100g)}F
                </span>
              </button>
            ))}
            {recent.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text3)', margin: '14px 0 8px' }}>
                  Recent
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                  {recent.map(l => (
                    <button key={l.id} onClick={() => pickRecent(l)}
                      style={{ flexShrink: 0, background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {l.description}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {picked && (
          <div>
            <button onClick={() => setPicked(null)} style={{ background: 'none', border: 'none', color: 'var(--v2)', fontSize: 13, fontWeight: 700, padding: '4px 0 10px' }}>
              ← Back to results
            </button>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>{picked.name}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Amount" style={{ ...inputLg, flex: 1 }} />
              <div className="v2-subtabs" style={{ flexShrink: 0 }}>
                <button className={`v2-subtab ${unit === 'g' ? 'active' : ''}`} onClick={() => setUnit('g')}>g</button>
                <button className={`v2-subtab ${unit === 'oz' ? 'active' : ''}`} onClick={() => setUnit('oz')}>oz</button>
              </div>
            </div>
            {preview && grams > 0 && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 12, fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>{Math.round(grams * 10) / 10}g → </span>
                <strong>{preview.calories} cal</strong>
                <span style={{ color: 'var(--text3)' }}> · {preview.protein_g}P / {preview.carbs_g}C / {preview.fat_g}F</span>
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Meal</div>
            <div className="v2-subtabs" style={{ marginBottom: 14 }}>
              {MEALS.map(m => (
                <button key={m} className={`v2-subtab ${meal === m ? 'active' : ''}`} onClick={() => setMeal(m)}>
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
            <button onClick={addPicked} disabled={busy || !grams || grams <= 0} className="btn-primary" style={{ width: '100%' }}>
              {busy ? 'Adding…' : 'Add to log'}
            </button>
          </div>
        )}

        {tab === 'manual' && (
          <div>
            <input value={man.name} onChange={e => setMan({ ...man, name: e.target.value })} placeholder="Food name" style={{ ...inputLg, marginBottom: 10 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input type="number" inputMode="decimal" value={man.grams} onChange={e => setMan({ ...man, grams: e.target.value })} placeholder="Grams" style={inputLg} />
              <input type="number" inputMode="decimal" value={man.calories} onChange={e => setMan({ ...man, calories: e.target.value })} placeholder="Calories" style={inputLg} />
              <input type="number" inputMode="decimal" value={man.protein} onChange={e => setMan({ ...man, protein: e.target.value })} placeholder="Protein (g)" style={inputLg} />
              <input type="number" inputMode="decimal" value={man.carbs} onChange={e => setMan({ ...man, carbs: e.target.value })} placeholder="Carbs (g)" style={inputLg} />
            </div>
            <input type="number" inputMode="decimal" value={man.fat} onChange={e => setMan({ ...man, fat: e.target.value })} placeholder="Fat (g)" style={{ ...inputLg, marginBottom: 12 }} />
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>Meal</div>
            <div className="v2-subtabs" style={{ marginBottom: 14 }}>
              {MEALS.map(m => (
                <button key={m} className={`v2-subtab ${meal === m ? 'active' : ''}`} onClick={() => setMeal(m)}>
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
            <button onClick={addManual} disabled={busy} className="btn-primary" style={{ width: '100%' }}>
              {busy ? 'Adding…' : 'Add to log'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FuelScreen({ nutritionPlan, dayType, setDayType, profile }) {
  const [tplDays, setTplDays] = useState(null) // null = no template → legacy UI
  const [tplName, setTplName] = useState('')
  const [tplNotes, setTplNotes] = useState('')
  const [override, setOverride] = useState(null) // null = auto
  const [autoType, setAutoType] = useState(null)
  const [grocery, setGrocery] = useState([]) // [{ listId, name, cats: [{category, items:[{item, checked}]}] }]
  const [loaded, setLoaded] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [foodBump, setFoodBump] = useState(0)

  useEffect(() => { if (profile?.id) loadAll() }, [profile?.id])

  async function loadAll() {
    try {
      // ── nutrition template assignment ──
      const { data: cn } = await supabase.from('client_nutrition')
        .select('*').eq('client_id', profile.id).maybeSingle()
      if (cn?.template_id) {
        const [{ data: tpl }, { data: days }] = await Promise.all([
          supabase.from('nutrition_templates').select('name, notes').eq('id', cn.template_id).maybeSingle(),
          supabase.from('nutrition_template_days').select('*').eq('template_id', cn.template_id),
        ])
        setTplDays(days || [])
        setTplName(tpl?.name || 'Nutrition plan')
        setTplNotes(tpl?.notes || '')
        setOverride(cn.day_override || null)

        // ── auto day-type inference ──
        const today = localDateStr()
        let inferred = null
        try {
          const { data: meso } = await supabase.from('client_mesocycles')
            .select('id').eq('client_id', profile.id).eq('status', 'active').limit(1).maybeSingle()
          const { data: logs } = await supabase.from('set_logs')
            .select('session_day').eq('client_id', profile.id).eq('log_date', today)
          inferred = inferDayTypeFromLogs((logs || []).map(l => l.session_day))
          if (!inferred) inferred = meso ? 'training' : 'rest'
        } catch { inferred = 'rest' }
        setAutoType(inferred)
      }
    } catch { /* tables missing until migration — legacy UI */ }

    try {
      // ── grocery lists ──
      const today = localDateStr()
      const { data: lists } = await supabase.from('client_grocery_lists')
        .select('id, template_id, grocery_templates(id, name)').eq('client_id', profile.id)
      const out = []
      for (const l of lists || []) {
        const { data: items } = await supabase.from('grocery_items')
          .select('category, item').eq('template_id', l.template_id).order('sort_order')
        const { data: checks } = await supabase.from('grocery_checks')
          .select('item').eq('client_id', profile.id).eq('list_id', l.id).eq('checked_date', today)
        const checkedSet = new Set((checks || []).map(c => c.item))
        const cats = []
        for (const it of items || []) {
          let c = cats.find(x => x.category === it.category)
          if (!c) { c = { category: it.category, items: [] }; cats.push(c) }
          c.items.push({ item: it.item, checked: checkedSet.has(it.item) })
        }
        out.push({ listId: l.id, name: l.grocery_templates?.name || 'Grocery list', cats })
      }
      setGrocery(out)
    } catch { /* no grocery tables yet */ }
    setLoaded(true)
  }

  async function setDayOverride(val) {
    // val: null (auto) | 'training' | 'legs' | 'rest'
    setOverride(val)
    try {
      await supabase.from('client_nutrition')
        .update({ day_override: val, updated_at: new Date().toISOString() })
        .eq('client_id', profile.id)
    } catch { /* non-fatal */ }
  }

  async function toggleCheck(listId, item, currentlyChecked) {
    setGrocery(gs => gs.map(g => g.listId !== listId ? g : {
      ...g,
      cats: g.cats.map(c => ({ ...c, items: c.items.map(it =>
        it.item !== item ? it : { ...it, checked: !currentlyChecked }) })),
    }))
    try {
      if (currentlyChecked) {
        await supabase.from('grocery_checks').delete()
          .eq('client_id', profile.id).eq('list_id', listId)
          .eq('item', item).eq('checked_date', localDateStr())
      } else {
        await supabase.from('grocery_checks').insert({
          client_id: profile.id, list_id: listId, item, checked_date: localDateStr(),
        })
      }
    } catch { /* non-fatal; reload on next visit */ }
  }

  async function uncheckAll(listId) {
    setGrocery(gs => gs.map(g => g.listId !== listId ? g : {
      ...g, cats: g.cats.map(c => ({ ...c, items: c.items.map(it => ({ ...it, checked: false })) })),
    }))
    try {
      await supabase.from('grocery_checks').delete()
        .eq('client_id', profile.id).eq('list_id', listId).eq('checked_date', localDateStr())
    } catch { /* non-fatal */ }
  }

  const foodSheet = sheetOpen && profile?.id && (
    <FoodSheet clientId={profile.id} onClose={() => setSheetOpen(false)}
      onAdded={() => { setSheetOpen(false); setFoodBump(b => b + 1) }} />
  )

  // ════════ template mode ════════
  if (tplDays !== null) {
    const resolved = resolveDayType({ sessionDayName: null, dayOverride: override }) || autoType || 'rest'
    const macros = todaysMacros(tplDays, resolved)
    const isAuto = !override
    const p = Number(macros?.protein_g) || 0
    const c = Number(macros?.carbs_g) || 0
    const f = Number(macros?.fat_g) || 0
    const pCal = p * 4, cCal = c * 4, fCal = f * 9
    const totalCal = pCal + cCal + fCal
    const pPct = totalCal ? Math.round((pCal / totalCal) * 100) : 0
    const cPct = totalCal ? Math.round((cCal / totalCal) * 100) : 0
    const fPct = totalCal ? Math.round((fCal / totalCal) * 100) : 0
    const targets = macros ? {
      calories: Number(macros.calories) || 0, protein_g: p, carbs_g: c, fat_g: f,
    } : null

    return (
      <div>
        <div className="v2-page-title">Nutrition</div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="v2-card-eyebrow" style={{ marginBottom: 10 }}>Today's targets</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '5px 12px',
              background: resolved === 'legs' ? 'var(--gbg)' : resolved === 'training' ? 'var(--vbg)' : 'var(--abg)',
              color: resolved === 'legs' ? 'var(--g)' : resolved === 'training' ? 'var(--v2)' : 'var(--a)',
            }}>
              {DAY_LABELS[resolved]} day
            </span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{isAuto ? '· auto-detected' : '· you set this'}</span>
          </div>

          <div className="v2-subtabs" style={{ marginBottom: 14 }}>
            {[{ v: null, l: 'Auto' }, ...DAY_TYPES.map(dt => ({ v: dt, l: DAY_LABELS[dt] }))].map(o => (
              <button key={o.l} className={`v2-subtab ${(override || null) === o.v ? 'active' : ''}`}
                onClick={() => setDayOverride(o.v)}>{o.l}</button>
            ))}
          </div>

          {macros ? (<>
            <div className="v2-macro-grid v2-macro-3" style={{ marginBottom: 10 }}>
              <div className="v2-macro-box">
                <div className="label">Calories</div>
                <div className="value">{macros.calories ?? '—'}</div>
              </div>
              <div className="v2-macro-box">
                <div className="label">Protein</div>
                <div className="value" style={{ color: 'var(--v2)' }}>{macros.protein_g ?? '—'}<span className="sub">g</span></div>
              </div>
              <div className="v2-macro-box">
                <div className="label">Carbs</div>
                <div className="value" style={{ color: 'var(--g)' }}>{macros.carbs_g ?? '—'}<span className="sub">g</span></div>
              </div>
            </div>
            <div className="v2-macro-grid v2-macro-2" style={{ marginBottom: 22 }}>
              <div className="v2-macro-box">
                <div className="label">Fat</div>
                <div className="value" style={{ color: 'var(--a)' }}>{macros.fat_g ?? '—'}<span className="sub">g</span></div>
              </div>
              <div className="v2-macro-box">
                <div className="label">Fiber</div>
                <div className="value">{macros.fiber_g ?? '—'}<span className="sub">g</span></div>
              </div>
            </div>

            {totalCal > 0 && (
              <>
                <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Macro Split <span style={{ textTransform: 'none', letterSpacing: 0 }}>· % of calories</span></div>
                {[
                  ['Protein', p, pPct, 'var(--v2)'],
                  ['Carbs', c, cPct, 'var(--g)'],
                  ['Fat', f, fPct, 'var(--a)'],
                ].map(([label, grams, pct, color]) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                      <span>{label}</span><span style={{ fontWeight: 700 }}>{grams}g — {pct}%</span>
                    </div>
                    <div className="v2-goal-track" style={{ height: 6, margin: 0 }}>
                      <div className="v2-goal-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </>) : (
            <div className="empty-state">
              <div className="icon">🍽️</div>
              Your coach hasn't set {DAY_LABELS[resolved].toLowerCase()}-day targets yet.
            </div>
          )}

          {tplNotes && <div className="v2-insight-bar" style={{ marginTop: 14 }}>{tplNotes}</div>}
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>From "{tplName}" — set by your coach</div>
        </div>

        <FoodLog clientId={profile.id} targets={targets} onLog={() => setSheetOpen(true)} refreshKey={foodBump} />

        {grocery.map(g => (
          <div className="card" key={g.listId} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div className="v2-card-eyebrow" style={{ margin: 0 }}>🛒 {g.name}</div>
              <button onClick={() => uncheckAll(g.listId)}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, fontWeight: 700, padding: '8px 4px' }}>
                Uncheck all
              </button>
            </div>
            {g.cats.map(cat => (
              <div key={cat.category} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>
                  {cat.category}
                </div>
                {cat.items.map(it => (
                  <button key={it.item} onClick={() => toggleCheck(g.listId, it.item, it.checked)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                      background: 'none', border: 'none', padding: '9px 4px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      border: it.checked ? 'none' : '2px solid var(--border2)',
                      background: it.checked ? 'var(--g)' : 'transparent',
                      color: '#fff', fontSize: 14, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{it.checked ? '✓' : ''}</span>
                    <span style={{
                      fontSize: 14, color: it.checked ? 'var(--text3)' : 'var(--text)',
                      textDecoration: it.checked ? 'line-through' : 'none',
                    }}>{it.item}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
        {foodSheet}
      </div>
    )
  }

  // ════════ legacy mode (unchanged targets, food log appended) ════════
  const cal = dayType === 'training' ? nutritionPlan?.training_cal : nutritionPlan?.rest_cal
  const protein = dayType === 'training' ? nutritionPlan?.training_protein : nutritionPlan?.rest_protein
  const carbs = dayType === 'training' ? nutritionPlan?.training_carbs : nutritionPlan?.rest_carbs
  const fat = dayType === 'training' ? nutritionPlan?.training_fat : nutritionPlan?.rest_fat

  const p = Number(protein) || 0
  const c = Number(carbs) || 0
  const f = Number(fat) || 0
  const pCal = p * 4
  const cCal = c * 4
  const fCal = f * 9
  const totalCal = pCal + cCal + fCal
  const pPct = totalCal ? Math.round((pCal / totalCal) * 100) : 0
  const cPct = totalCal ? Math.round((cCal / totalCal) * 100) : 0
  const fPct = totalCal ? Math.round((fCal / totalCal) * 100) : 0
  const totalG = p + c + f
  const legacyTargets = nutritionPlan ? {
    calories: Number(cal) || 0, protein_g: p, carbs_g: c, fat_g: f,
  } : null

  return (
    <div>
      <div className="v2-page-title">Nutrition</div>

      <div className="v2-subtabs">
        <button className={`v2-subtab ${dayType === 'training' ? 'active' : ''}`} onClick={() => setDayType('training')}>Training Day</button>
        <button className={`v2-subtab ${dayType === 'rest' ? 'active' : ''}`} onClick={() => setDayType('rest')}>Rest Day</button>
      </div>

      <div className="card">
        {!nutritionPlan && (
          <div className="empty-state">
            <div className="icon">🍽️</div>
            Your coach hasn't assigned a nutrition plan yet.
          </div>
        )}

        {nutritionPlan && (
          <>
            <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>
              {dayType === 'training' ? 'Training Day Targets' : 'Rest Day Targets'}
            </div>
            <div className="v2-macro-grid v2-macro-3" style={{ marginBottom: 10 }}>
              <div className="v2-macro-box">
                <div className="label">Calories</div>
                <div className="value">{cal ?? '—'}</div>
              </div>
              <div className="v2-macro-box">
                <div className="label">Protein</div>
                <div className="value" style={{ color: 'var(--v2)' }}>{protein ?? '—'}<span className="sub">g</span></div>
              </div>
              <div className="v2-macro-box">
                <div className="label">Carbs</div>
                <div className="value" style={{ color: 'var(--g)' }}>{carbs ?? '—'}<span className="sub">g</span></div>
              </div>
            </div>
            <div className="v2-macro-grid v2-macro-2" style={{ marginBottom: 22 }}>
              <div className="v2-macro-box">
                <div className="label">Fat</div>
                <div className="value" style={{ color: 'var(--a)' }}>{fat ?? '—'}<span className="sub">g</span></div>
              </div>
              <div className="v2-macro-box">
                <div className="label">Total Grams</div>
                <div className="value">{totalG || '—'}</div>
              </div>
            </div>

            {totalCal > 0 && (
              <>
                <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Macro Split <span style={{ textTransform: 'none', letterSpacing: 0 }}>· % of calories</span></div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span>Protein</span><span style={{ fontWeight: 700 }}>{protein}g — {pPct}%</span>
                  </div>
                  <div className="v2-goal-track" style={{ height: 6, margin: 0 }}>
                    <div className="v2-goal-fill" style={{ width: `${pPct}%`, background: 'var(--v2)' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span>Carbs</span><span style={{ fontWeight: 700 }}>{carbs}g — {cPct}%</span>
                  </div>
                  <div className="v2-goal-track" style={{ height: 6, margin: 0 }}>
                    <div className="v2-goal-fill" style={{ width: `${cPct}%`, background: 'var(--g)' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span>Fat</span><span style={{ fontWeight: 700 }}>{fat}g — {fPct}%</span>
                  </div>
                  <div className="v2-goal-track" style={{ height: 6, margin: 0 }}>
                    <div className="v2-goal-fill" style={{ width: `${fPct}%`, background: 'var(--a)' }} />
                  </div>
                </div>
              </>
            )}

            {nutritionPlan.notes && (
              <div className="v2-insight-bar">{nutritionPlan.notes}</div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <FoodLog clientId={profile?.id} targets={legacyTargets} onLog={() => setSheetOpen(true)} refreshKey={foodBump} />
      </div>
      {foodSheet}
    </div>
  )
}
