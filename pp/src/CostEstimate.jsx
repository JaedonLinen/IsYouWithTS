import { estimateTotal } from './destinations.js'
import './CostEstimate.css'

const usd = (n) => `$${n.toLocaleString('en-US')}`

// Per-person trip cost breakdown for one destination
export default function CostEstimate({ destination, className = '' }) {
  return (
    <section className={`estimate ${className}`} aria-label={`${destination.short} trip estimate`}>
      <h3>Per-person estimate</h3>
      <dl>
        {destination.estimate.map((item) => (
          <div key={item.label} className="estimate-row">
            <dt>{item.label}</dt>
            <dd>{item.max ? `up to ${usd(item.amount)}` : `~${usd(item.amount)}`}</dd>
          </div>
        ))}
        <div className="estimate-row estimate-total">
          <dt>Total</dt>
          <dd>~{usd(estimateTotal(destination))}</dd>
        </div>
      </dl>
    </section>
  )
}
