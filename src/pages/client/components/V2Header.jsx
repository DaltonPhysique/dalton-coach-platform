export default function V2Header({ fullName }) {
  return (
    <div className="v2-header">
      <div className="v2-logo-row">
        <div className="v2-logo-icon">
          <img src="/rebuild-logo.png" alt="The Rebuild" />
        </div>
        <div>
          <div className="v2-logo-name">{fullName || 'Dalton'}</div>
          <div className="v2-logo-sub">The Rebuild</div>
        </div>
      </div>
      <div className="v2-header-badges">
        <span className="v2-badge-version">V2</span>
        <span className="v2-badge-phase">Recomp Cut</span>
      </div>
    </div>
  )
}
