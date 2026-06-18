export default function V2Header({ fullName }) {
  return (
    <div className="v2-header">
      <div className="v2-logo-row">
        <div className="v2-logo-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
        </div>
        <div>
          <div className="v2-logo-name">{fullName || 'Dalton'}</div>
          <div className="v2-logo-sub">Physique OS</div>
        </div>
      </div>
      <div className="v2-header-badges">
        <span className="v2-badge-version">V2</span>
        <span className="v2-badge-phase">Recomp Cut</span>
      </div>
    </div>
  )
}
