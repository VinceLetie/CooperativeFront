'use client'

import { Reservation } from '@/app/components/ListeReservations'

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface Props {
  reservations: Reservation[]
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------
export default function StatsPaiement({ reservations }: Props) {
  const total      = reservations.length
  const toutPaye   = reservations.filter(r => r.payment === 'tout payé').length
  const avecAvance = reservations.filter(r => r.payment === 'avec avance').length
  const sansAvance = reservations.filter(r => r.payment === 'sans avance').length

  const items = [
    { label: 'Total',       val: total,      color: '#0f172a' },
    { label: 'Tout payé',   val: toutPaye,   color: '#16a34a' },
    { label: 'Avec avance', val: avecAvance, color: '#d97706' },
    { label: 'Sans avance', val: sansAvance, color: '#dc2626' },
  ]

  return (
    <div className="stats-paiement-grid">
      {items.map(item => (
        <div key={item.label} className="stats-paiement-card">
          <span className="stats-paiement-num" style={{ color: item.color }}>
            {item.val}
          </span>
          <span className="stats-paiement-label">{item.label}</span>
        </div>
      ))}
    </div>
  )
}