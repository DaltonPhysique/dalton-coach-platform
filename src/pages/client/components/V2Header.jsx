export default function V2Header({ fullName, phase }) {
  return (
    <div className="v2-header">
      <div className="v2-logo-row">
        <div className="v2-logo-icon">
          <img src="/rebuild-logo.png" alt="The Rebuild" />
        </div>
        <div>
          {/* Never fall back to the coach's name — a failed profile load
              must not render as someone else's account. */}
          <div className="v2-logo-name">{fullName || 'Athlete'}</div>
          <div className="v2-logo-sub">The Rebuild</div>
        </div>
      </div>
      <div className="v2-header-badges">
        {phase ? <span className="v2-badge-phase">{phase}</span> : null}
      </div>
    </div>
  )
}
