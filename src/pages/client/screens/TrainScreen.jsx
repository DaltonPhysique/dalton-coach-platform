import { useState } from 'react'

export default function TrainScreen({ trainingPlan }) {
  const days = trainingPlan?.split_json || []
  const [activeDay, setActiveDay] = useState(0)

  return (
    <div>
      <div className="v2-page-title">Training</div>

      {!trainingPlan && (
        <div className="card">
          <div className="empty-state">
            <div className="icon">🏋️</div>
            Your coach hasn't assigned a training plan yet.
          </div>
        </div>
      )}

      {trainingPlan && days.length > 0 && (
        <>
          <div className="v2-subtabs">
            {days.map((day, i) => (
              <button
                key={i}
                className={`v2-subtab ${activeDay === i ? 'active' : ''}`}
                onClick={() => setActiveDay(i)}
              >
                {day.day}
              </button>
            ))}
          </div>

          <div className="v2-insight-bar" style={{ marginBottom: 16 }}>
            {days[activeDay]?.day} — {(days[activeDay]?.exercises || []).length} exercises
          </div>

          {(days[activeDay]?.exercises || []).map((ex, i) => (
            <div className="v2-ex-row" key={i}>
              <div className="v2-ex-left">
                <div className="v2-ex-dot" style={{ background: 'var(--v2)' }} />
                <div>
                  <div className="v2-ex-name">{ex.name}</div>
                  <div className="v2-ex-meta">{ex.sets} sets · {ex.reps} reps</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
