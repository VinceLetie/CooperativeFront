'use client'

import { useMemo } from 'react'
import styles from './dashboard.module.css'
import { Reservation } from '@/app/components/ListeReservations'
import StatsPaiement from '@/app/components/StatsPaiement'

// ---------------------------------------------------------------------------
// DONNÉES MOCKÉES (à remplacer par appels API)
// ---------------------------------------------------------------------------
const RESERVATIONS_MOCK: Reservation[] = [
  {
    idreserv: 'R001', idvoit: 'V01', idcli: 1, place: 2,
    dateReserv: '2025-05-01 08:00:00', dateVoyage: '2025-05-20',
    payment: 'avec avance', montantAvance: 20000,
    nomClient: 'Rakoto Madison', numtel: '034 33 888 12',
    fraisVoiture: 50000, designVoiture: 'Toyota Hiace', typeVoiture: 'simple',
  },
  {
    idreserv: 'R002', idvoit: 'V01', idcli: 2, place: 4,
    dateReserv: '2025-05-02 09:00:00', dateVoyage: '2025-05-20',
    payment: 'tout payé', montantAvance: 50000,
    nomClient: 'Rabe Sylvie', numtel: '033 12 456 78',
    fraisVoiture: 50000, designVoiture: 'Toyota Hiace', typeVoiture: 'simple',
  },
  {
    idreserv: 'R003', idvoit: 'V02', idcli: 3, place: 1,
    dateReserv: '2025-05-03 10:00:00', dateVoyage: '2025-05-22',
    payment: 'sans avance', montantAvance: 0,
    nomClient: 'Randria Jean', numtel: '032 99 111 22',
    fraisVoiture: 80000, designVoiture: 'Mercedes Vito', typeVoiture: 'premium',
  },
  {
    idreserv: 'R004', idvoit: 'V03', idcli: 4, place: 2,
    dateReserv: '2025-05-04 07:00:00', dateVoyage: '2025-05-23',
    payment: 'tout payé', montantAvance: 120000,
    nomClient: 'Rakotondrabe Luc', numtel: '034 55 777 33',
    fraisVoiture: 120000, designVoiture: 'Toyota Land Cruiser', typeVoiture: 'vip',
  },
]

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatMontant(n: number) {
  return n.toLocaleString('fr-FR') + ' Ar'
}

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------
export default function PageDashboard() {

  const recette = useMemo(() => {
    const toutPaye   = RESERVATIONS_MOCK.filter(r => r.payment === 'tout payé')
    const avecAvance = RESERVATIONS_MOCK.filter(r => r.payment === 'avec avance')
    const sansAvance = RESERVATIONS_MOCK.filter(r => r.payment === 'sans avance')

    const recetteTotale =
      toutPaye.reduce((acc, r)   => acc + (r.fraisVoiture ?? 0), 0) +
      avecAvance.reduce((acc, r) => acc + r.montantAvance, 0)

    const resteTotal =
      avecAvance.reduce((acc, r) => acc + ((r.fraisVoiture ?? 0) - r.montantAvance), 0) +
      sansAvance.reduce((acc, r) => acc + (r.fraisVoiture ?? 0), 0)

    return { recetteTotale, resteTotal }
  }, [])

  return (
    <div className={styles.page}>

      {/* ── HEADER ── */}
      <div className={styles.header}>
        <h1 className={styles.titre}>Dashboard</h1>
        <p className={styles.sousTitre}>Vue d'ensemble de la coopérative</p>
      </div>

      {/* ── RECETTE TOTALE ── */}
      <div className={styles.recetteCard}>
        <div className={styles.recetteGauche}>
          <span className={styles.recetteLabel}>Recette totale accumulée</span>
          <span className={styles.recetteMontant}>{formatMontant(recette.recetteTotale)}</span>
          <span className={styles.recetteSous}>Montants effectivement encaissés</span>
        </div>
        <div className={styles.recetteDroite}>
          <div className={styles.recetteItem}>
            <span className={styles.recetteItemLabel}>Reste à encaisser</span>
            <span className={styles.recetteItemVal} style={{ color: '#dc2626' }}>
              {formatMontant(recette.resteTotal)}
            </span>
          </div>
          <div className={styles.recetteSep} />
          <div className={styles.recetteItem}>
            <span className={styles.recetteItemLabel}>Total réservations</span>
            <span className={styles.recetteItemVal}>{RESERVATIONS_MOCK.length}</span>
          </div>
        </div>
      </div>

      {/* ── STATS PAIEMENT (component) ── */}
      <StatsPaiement reservations={RESERVATIONS_MOCK} />

    </div>
  )
}