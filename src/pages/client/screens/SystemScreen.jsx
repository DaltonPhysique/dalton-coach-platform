const PRIORITIES = [
  { num: 1, name: 'Upper Chest', note: 'Incline Smith first — every upper session', pct: 100 },
  { num: 2, name: 'Side Delts', note: 'Cable laterals — 3 sets both upper sessions', pct: 80 },
  { num: 3, name: 'Rear Delts', note: 'Machine fly + face pull — end of every upper', pct: 55 },
  { num: 4, name: 'Legs', note: 'Hack squat — maintain size and strength', pct: 45 },
  { num: 5, name: 'Back', note: 'Maintain with 2 heavy movements', pct: 30 },
  { num: 6, name: 'Arms', note: 'Secondary — 1 movement per upper session', pct: 15 },
]

const SUPPLEMENTS = [
  { name: 'Magnesium Glycinate — 400–600mg before bed', note: 'Sleep depth, recovery, insulin sensitivity', tag: 'core' },
  { name: 'Zinc — 25–30mg before bed', note: 'Testosterone support, immune function', tag: 'core' },
  { name: 'Creatine Monohydrate — 5g daily', note: 'Strength, cell volumization, fullness on cut', tag: 'add' },
  { name: 'Vitamin D3 — 3,000–5,000 IU with fat meal', note: 'Testosterone, mood, immune function', tag: 'add' },
  { name: 'Omega-3 — 2–3g EPA/DHA with meals', note: 'Inflammation, joints, MPS enhancement', tag: 'good' },
]

const TAG_LABEL = { core: 'Core', add: 'Add', good: 'Good' }
const DOT_COLOR = { core: 'var(--g)', add: 'var(--v2)', good: 'var(--text3)' }

export default function SystemScreen() {
  return (
    <div>
      <div className="v2-page-title">System</div>

      <div className="card">
        <div className="v2-card-eyebrow" style={{ marginBottom: 4 }}>Physique Priorities</div>
        {PRIORITIES.map((p) => (
          <div className="v2-priority-row" key={p.num}>
            <div className="v2-priority-num">{p.num}</div>
            <div className="v2-priority-info">
              <div className="v2-priority-name">{p.name}</div>
              <div className="v2-priority-note">{p.note}</div>
            </div>
            <div className="v2-priority-bar-track">
              <div className="v2-priority-bar-fill" style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="v2-card-eyebrow" style={{ marginBottom: 4 }}>Supplement Stack</div>
        {SUPPLEMENTS.map((s, i) => (
          <div className="v2-priority-row" key={i}>
            <div className="v2-supp-dot" style={{ background: DOT_COLOR[s.tag] }} />
            <div className="v2-priority-info">
              <div className="v2-priority-name" style={{ fontSize: 14 }}>{s.name}</div>
              <div className="v2-priority-note">{s.note}</div>
            </div>
            <span className={`v2-supp-tag ${s.tag}`}>{TAG_LABEL[s.tag]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
