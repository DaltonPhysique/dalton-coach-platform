import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { localDateStr } from '../../lib/dates'
import {
  weekNumber, isDeloadWeek, weeklyVolumes, sessionAdherence,
  stallFlags, sessionDays,
} from '../../lib/mesocycle'

const EYEBROW = { fontSize: 10, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }
const LBL = { display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 7 }

// ════════════════════════════════════════════════════════════
// CLIENT MESOCYCLE TAB — assign a template to start a block,
// then monitor: week X of Y, volume trend, per-session adherence,
// stall flags. Lives inside ClientDetail's tab bar.
// ════════════════════════════════════════════════════════════

export default function MesocycleTab({ clientId }) {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState([])
  const [meso, setMeso] = useState(null)
  const [tex, setTex] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const [assignTpl, setAssignTpl] = useState('')
  const [assignDate, setAssignDate] = useState(localDateStr())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [clientId])

  async function load() {
    setLoading(true)
    try {
      const { data: tpls } = await supabase.from('mesocycle_templates')
        .select('id, name, weeks').eq('coach_id', profile.id).order('created_at', { ascending: false })
      setTemplates(tpls || [])

      const { data: mc } = await supabase.from('client_mesocycles')
        .select('*').eq('client_id', clientId).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      setMeso(mc || null)

      if (mc) {
        const [{ data: tpl }, { data: exs }, { data: sl }] = await Promise.all([
          supabase.from('mesocycle_templates').select('name, weeks').eq('id', mc.template_id).maybeSingle(),
          supabase.from('template_exercises').select('*').eq('template_id', mc.template_id).order('sort_order'),
          supabase.from('set_logs').select('*').eq('mesocycle_id', mc.id).order('log_date', { ascending: true }),
        ])
        setMeso({ ...mc, template_name: tpl?.name, template_weeks: tpl?.weeks })
        setTex(exs || [])
        setLogs(sl || [])
      } else { setTex([]); setLogs([]) }
    } catch { /* tables missing until migration runs */ }
    setLoading(false)
  }

  async function assign() {
    setError('')
    if (!assignTpl) { setError('Pick a template first.'); return }
    setBusy(true)
    try {
      await supabase.from('client_mesocycles').update({ status: 'completed' })
        .eq('client_id', clientId).eq('status', 'active')
      const { error } = await supabase.from('client_mesocycles').insert({
        client_id: clientId, template_id: assignTpl, start_date: assignDate, status: 'active',
      })
      if (error) throw error
      await load()
    } catch (e) { setError(e.message || 'Couldn\'t assign the mesocycle.') }
    setBusy(false)
  }

  async function endMesocycle() {
    if (!window.confirm('End this mesocycle? The client\'s Train tab goes back to the regular plan view.')) return
    await supabase.from('client_mesocycles').update({ status: 'completed' }).eq('id', meso.id)
    await load()
  }

  if (loading) return <div className="muted">Loading…</div>

  // ── no active mesocycle → assign ──
  if (!meso) {
    return (
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 26px' }}>
        <div style={EYEBROW}>Mesocycle</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Start a Training Block</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
          The client's Train tab becomes the mesocycle view: weekly progression, RIR logging, auto-deload on the final week.
        </p>
        {templates.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text3)' }}>
            No templates yet — build one on the <a href="/coach/templates" style={{ color: 'var(--v2)', fontWeight: 700 }}>Templates page</a> first.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 18 }}>
            <div><label style={LBL}>Template</label>
              <select value={assignTpl} onChange={e => setAssignTpl(e.target.value)}
                style={{ fontSize: 15, padding: '12px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', width: '100%' }}>
                <option value="">Select…</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.weeks} weeks</option>)}
              </select></div>
            <div><label style={LBL}>Start date</label>
              <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} style={{ fontSize: 15 }} /></div>
          </div>
        )}
        {error && <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', color: 'var(--r)', borderRadius: 12, padding: '12px 16px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{error}</div>}
        {templates.length > 0 && (
          <button className="btn-primary" onClick={assign} disabled={busy} style={{ maxWidth: 240 }}>
            {busy ? 'Assigning…' : 'Assign & Start Block'}
          </button>
        )}
      </div>
    )
  }

  // ── active mesocycle → monitor ──
  const week = weekNumber(meso.start_date, localDateStr())
  const total = meso.template_weeks || 4
  const deload = isDeloadWeek(week, total)
  const volumes = weeklyVolumes(logs)
  const maxVol = Math.max(1, ...volumes.map(v => v.volume))
  const days = sessionDays(tex)
  const stalls = stallFlags(logs)

  return (
    <div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 26px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <div>
            <div style={EYEBROW}>Active Mesocycle</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{meso.template_name}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: deload ? 'var(--g)' : 'var(--v2)' }}>
            Week {Math.min(week, total)} of {total}{deload ? ' · Deload' : ''}
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>Started {meso.start_date}</div>

        {volumes.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={LBL}>Volume / week (lb)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
              {volumes.map(v => (
                <div key={v.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>{(v.volume / 1000).toFixed(1)}k</div>
                  <div style={{
                    width: '100%', borderRadius: 6, height: Math.max(8, (v.volume / maxVol) * 56),
                    background: v.week === week ? 'var(--v)' : 'var(--bg4)', border: '1px solid var(--border2)',
                  }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>W{v.week}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* adherence this week */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '24px 26px', marginBottom: 14 }}>
        <div style={EYEBROW}>This week — logged vs programmed</div>
        {days.map(d => {
          const ad = sessionAdherence(tex, logs, week, d)
          return (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{d}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>{ad.logged}/{ad.prescribed} sets</div>
              <div style={{
                fontSize: 12, fontWeight: 800, borderRadius: 8, padding: '4px 10px',
                background: ad.pct === 100 ? 'var(--gbg)' : ad.pct >= 50 ? 'var(--vbg)' : 'var(--rbg)',
                color: ad.pct === 100 ? 'var(--g)' : ad.pct >= 50 ? 'var(--v2)' : 'var(--r)',
              }}>{ad.pct ?? 0}%</div>
            </div>
          )
        })}
        {days.length === 0 && <div className="muted" style={{ fontSize: 14 }}>No session days in this template.</div>}
      </div>

      {/* stall flags */}
      {stalls.length > 0 && (
        <div style={{ background: 'var(--rbg)', border: '1px solid var(--rbrd)', borderRadius: 18, padding: '20px 26px', marginBottom: 14 }}>
          <div style={{ ...EYEBROW, color: 'var(--r)' }}>Stalled lifts</div>
          {stalls.map(s => (
            <div key={s.exercise} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', padding: '4px 0' }}>
              {s.exercise} — no weight increase in {s.weeksStalled + 1} weeks
            </div>
          ))}
        </div>
      )}

      <button onClick={endMesocycle}
        style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700 }}>
        End Mesocycle
      </button>
    </div>
  )
}
