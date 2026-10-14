import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { DAY_TYPES, DAY_LABELS, resolveDayType, inferDayTypeFromLogs, todaysMacros } from '../../../lib/nutrition'
import { localDateStr } from '../../../lib/dates'

// ════════════════════════════════════════════════════════════
// FUEL — client nutrition tab.
//
// Two modes:
//  1. Template assigned (new): "Today's targets" resolved from the
//     coach's nutrition template day rows. Day type auto-detects
//     from today's logged session (leg keywords) with a manual
//     override toggle. Grocery checklist below.
//  2. No template (legacy): the old nutrition_plans training/rest
//     view, unchanged. Honest empty state when nothing is set.
// ════════════════════════════════════════════════════════════

export default function FuelScreen({ nutritionPlan, dayType, setDayType, profile }) {
  const [tplDays, setTplDays] = useState(null) // null = no template → legacy UI
  const [tplName, setTplName] = useState('')
  const [tplNotes, setTplNotes] = useState('')
  const [override, setOverride] = useState(null) // null = auto
  const [autoType, setAutoType] = useState(null)
  const [grocery, setGrocery] = useState([]) // [{ listId, name, cats: [{category, items:[{item, checked}]}] }]
  const [loaded, setLoaded] = useState(false)

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
      </div>
    )
  }

  // ════════ legacy mode (unchanged) ════════
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
    </div>
  )
}
