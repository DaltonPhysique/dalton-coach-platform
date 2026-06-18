import { useState } from 'react'
import { DEMO_SCORECARD, DEMO_BODY_FAT, DEMO_MEASUREMENTS } from '../demoData'
import DemoBadge from '../components/DemoBadge'

const ANGLES = ['front', 'side', 'back']

export default function BodyScreen({ photos, photoBusy, photoError, onPhotoUpload }) {
  const [tab, setTab] = useState('scorecard')

  const circ = 2 * Math.PI * 78
  const offset = circ * (1 - DEMO_SCORECARD.total / 100)

  return (
    <div>
      <div className="v2-page-title">Body</div>
      <div className="v2-page-sub">Scorecard · Body fat · Measurements</div>

      <div className="v2-subtabs">
        <button className={`v2-subtab ${tab === 'scorecard' ? 'active' : ''}`} onClick={() => setTab('scorecard')}>Scorecard</button>
        <button className={`v2-subtab ${tab === 'bodyfat' ? 'active' : ''}`} onClick={() => setTab('bodyfat')}>Body Fat</button>
        <button className={`v2-subtab ${tab === 'measurements' ? 'active' : ''}`} onClick={() => setTab('measurements')}>Measurements</button>
        <button className={`v2-subtab ${tab === 'photos' ? 'active' : ''}`} onClick={() => setTab('photos')}>Photos</button>
      </div>

      {tab === 'scorecard' && (
        <div className="card">
          <DemoBadge label="Demo data — scorecard not yet connected" />
          <div className="v2-card-eyebrow">Physique Score</div>
          <div className="v2-score-ring-wrap">
            <div className="v2-score-ring">
              <svg viewBox="0 0 180 180">
                <circle className="v2-score-track" cx="90" cy="90" r="78" />
                <circle
                  className="v2-score-fill"
                  cx="90" cy="90" r="78"
                  stroke="var(--g)"
                  strokeDasharray={circ.toFixed(1)}
                  strokeDashoffset={offset.toFixed(1)}
                />
              </svg>
              <div className="v2-score-label">
                <div className="v2-score-num">{DEMO_SCORECARD.total}</div>
                <div className="v2-score-den">/100</div>
              </div>
            </div>
          </div>
          <div className="v2-score-grid">
            <div className="v2-score-box">
              <div className="label">Nutrition</div>
              <div className="value" style={{ color: 'var(--g)' }}>{DEMO_SCORECARD.nutrition}<span className="of">/25</span></div>
              <div className="v2-score-bar"><div className="v2-score-bar-fill" style={{ width: `${DEMO_SCORECARD.nutrition / 25 * 100}%`, background: 'var(--g)' }} /></div>
            </div>
            <div className="v2-score-box">
              <div className="label">Training</div>
              <div className="value" style={{ color: 'var(--v2)' }}>{DEMO_SCORECARD.training}<span className="of">/25</span></div>
              <div className="v2-score-bar"><div className="v2-score-bar-fill" style={{ width: `${DEMO_SCORECARD.training / 25 * 100}%`, background: 'var(--v2)' }} /></div>
            </div>
            <div className="v2-score-box">
              <div className="label">Recovery</div>
              <div className="value" style={{ color: 'var(--a)' }}>{DEMO_SCORECARD.recovery}<span className="of">/25</span></div>
              <div className="v2-score-bar"><div className="v2-score-bar-fill" style={{ width: `${DEMO_SCORECARD.recovery / 25 * 100}%`, background: 'var(--a)' }} /></div>
            </div>
            <div className="v2-score-box">
              <div className="label">Momentum</div>
              <div className="value" style={{ color: '#00cba9' }}>{DEMO_SCORECARD.momentum}<span className="of">/25</span></div>
              <div className="v2-score-bar"><div className="v2-score-bar-fill" style={{ width: `${DEMO_SCORECARD.momentum / 25 * 100}%`, background: '#00cba9' }} /></div>
            </div>
          </div>
          <div className="v2-card-eyebrow" style={{ marginBottom: 10 }}>Score Breakdown</div>
          <div className="v2-insight-bar">
            <strong>Score: {DEMO_SCORECARD.total}/100</strong><br />
            {DEMO_SCORECARD.note}
          </div>
        </div>
      )}

      {tab === 'bodyfat' && (
        <div className="card">
          <DemoBadge label="Demo data — body fat tracking not yet connected" />
          <div className="v2-card-eyebrow">Body Fat %</div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1.5px', margin: '10px 0' }}>
            {DEMO_BODY_FAT.current}<span style={{ fontSize: 22, color: 'var(--text3)', fontWeight: 500 }}>%</span>
          </div>
          <div className="log-list">
            {DEMO_BODY_FAT.history.map((h, i) => (
              <div className="log-row" key={i}>
                <span className="date">{h.date}</span>
                <span className="val">{h.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'measurements' && (
        <div className="card">
          <DemoBadge label="Demo data — measurement tracking not yet connected" />
          <div className="v2-card-eyebrow">Latest Measurements</div>
          <div className="log-list">
            {DEMO_MEASUREMENTS.map((m, i) => (
              <div className="log-row" key={i}>
                <span className="date">{m.label}</span>
                <span className="val">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'photos' && (
        <div className="card">
          <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Progress Photos</div>
          <div className="photo-grid">
            {ANGLES.map((angle) => {
              const latestPhoto = photos[angle]?.[0]
              return (
                <div key={angle}>
                  <label className="photo-slot">
                    {latestPhoto ? (
                      <img src={latestPhoto.url} alt={angle} />
                    ) : (
                      <div className="placeholder">
                        <div className="icon">📸</div>
                        Add
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPhotoUpload(angle, e.target.files?.[0])}
                    />
                  </label>
                  <div className="photo-angle-label">{angle}</div>
                </div>
              )
            })}
          </div>
          {photoBusy && <div className="muted">Uploading…</div>}
          {photoError && <div className="error-text">{photoError}</div>}
          <div className="muted" style={{ marginTop: 10 }}>
            Same lighting, same pose, every time — that's what makes photos useful.
          </div>
        </div>
      )}
    </div>
  )
}
