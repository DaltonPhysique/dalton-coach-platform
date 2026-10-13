import { useState } from 'react'

const ANGLES = ['front', 'side', 'back']

export default function BodyScreen({ photos, photoBusy, photoError, onPhotoUpload }) {
  const [tab, setTab] = useState('scorecard')

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
          <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Rebuild Score</div>
          <div className="empty-state">
            <div className="icon">📊</div>
            Your Rebuild Score unlocks once you've logged two full weeks.
            It blends nutrition adherence, training consistency, recovery,
            and momentum into one number.
          </div>
        </div>
      )}

      {tab === 'bodyfat' && (
        <div className="card">
          <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Body Fat %</div>
          <div className="empty-state">
            No body-fat entries yet. Log it with your coach during check-ins
            and your history will build here.
          </div>
        </div>
      )}

      {tab === 'measurements' && (
        <div className="card">
          <div className="v2-card-eyebrow" style={{ marginBottom: 14 }}>Measurements</div>
          <div className="empty-state">
            No measurements yet. Waist, chest, and arm readings from your
            check-ins will appear here.
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
