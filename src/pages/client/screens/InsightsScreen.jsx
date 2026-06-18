import { DEMO_INSIGHTS } from '../demoData'
import DemoBadge from '../components/DemoBadge'

const STATUS_LABEL = {
  ok: '✓ On Track',
  critical: '⚠ Critical',
  info: 'ℹ Info',
}

export default function InsightsScreen() {
  return (
    <div>
      <div className="v2-page-title">Insights</div>
      <div className="v2-page-sub">AI-powered coaching based on your data</div>
      <DemoBadge label="Demo data — insights engine not yet connected to your real history" />

      {DEMO_INSIGHTS.map((ins, i) => (
        <div className="card" key={i}>
          <span className={`v2-status-pill ${ins.status}`}>{STATUS_LABEL[ins.status]}</span>
          <div className="v2-insight-headline">{ins.headline}</div>
          <div className="v2-insight-body">{ins.body}</div>
        </div>
      ))}
    </div>
  )
}
