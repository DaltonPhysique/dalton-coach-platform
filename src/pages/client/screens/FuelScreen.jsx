export default function FuelScreen({ nutritionPlan, dayType, setDayType }) {
  const cal = dayType === 'training' ? nutritionPlan?.training_cal : nutritionPlan?.rest_cal
  const protein = dayType === 'training' ? nutritionPlan?.training_protein : nutritionPlan?.rest_protein
  const carbs = dayType === 'training' ? nutritionPlan?.training_carbs : nutritionPlan?.rest_carbs
  const fat = dayType === 'training' ? nutritionPlan?.training_fat : nutritionPlan?.rest_fat

  const totalG = (Number(protein) || 0) + (Number(carbs) || 0) + (Number(fat) || 0)
  const pPct = totalG ? Math.round((protein / totalG) * 100) : 0
  const cPct = totalG ? Math.round((carbs / totalG) * 100) : 0
  const fPct = totalG ? Math.round((fat / totalG) * 100) : 0

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

            {totalG > 0 && (
              <>
                <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Macro Split</div>
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
