'use client'

import { useState, useEffect } from 'react'
import styles from './dashboard.module.css'
import StatsPaiement from '@/app/components/StatsPaiement'
import { Reservation } from '@/app/components/ListeReservations'
import {
  apiReservations,
  apiClients,
  apiVoitures,
  Paiement,
} from '@/app/services/api'

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatMontant(n: number) {
  return n.toLocaleString('fr-FR') + ' Ar'
}

function mapPaiementToLocal(p: Paiement): 'sans avance' | 'avec avance' | 'tout payé' {
  switch (p) {
    case 'SANS_AVANCE': return 'sans avance'
    case 'AVEC_AVANCE': return 'avec avance'
    case 'TOUT_PAYE':   return 'tout payé'
  }
}

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------
export default function PageDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [recetteTotale, setRecetteTotale] = useState(0)
  const [nbClients, setNbClients]         = useState(0)
  const [nbVoitures, setNbVoitures]       = useState(0)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [reservationsData, clientsData, voituresData, recette] = await Promise.all([
          apiReservations.list(),
          apiClients.list(),
          apiVoitures.list(),
          apiReservations.recette(),
        ])

        const clientsMap  = new Map(clientsData.map(c => [c.idcli, c]))
        const voituresMap = new Map(voituresData.map(v => [v.idvoit, v]))

        const enrichies: Reservation[] = reservationsData.map(r => {
          const client  = clientsMap.get(r.idcli)
          const voiture = voituresMap.get(r.idvoit)
          return {
            idreserv:      r.idreserv,
            idvoit:        r.idvoit,
            idcli:         r.idcli,
            place:         r.place,
            dateReserv:    r.dateReserv,
            dateVoyage:    r.dateVoyage,
            payment:       mapPaiementToLocal(r.payment),
            montantAvance: r.montantAvance,
            nomClient:     client?.nom    ?? '—',
            numtel:        client?.numtel ?? '—',
            fraisVoiture:  voiture?.frais,
            designVoiture: voiture?.design,
            typeVoiture:   voiture?.type.toLowerCase(),
          }
        })

        setReservations(enrichies)
        setRecetteTotale(recette)
        setNbClients(clientsData.length)
        setNbVoitures(voituresData.length)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const resteTotal = reservations.reduce((acc, r) => {
    if (r.payment === 'tout payé') return acc
    return acc + ((r.fraisVoiture ?? 0) - r.montantAvance)
  }, 0)

  if (loading) {
    return (
      <div className={styles.page}>
        <p style={{ textAlign: 'center', padding: '40px' }}>Chargement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '20px', borderRadius: '8px', margin: '20px' }}>
          <strong>Erreur :</strong> {error}
        </div>
      </div>
    )
  }

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
          <span className={styles.recetteMontant}>{formatMontant(recetteTotale)}</span>
          <span className={styles.recetteSous}>Montants effectivement encaissés</span>
        </div>
        <div className={styles.recetteDroite}>
          <div className={styles.recetteItem}>
            <span className={styles.recetteItemLabel}>Reste à encaisser</span>
            <span className={styles.recetteItemVal} style={{ color: '#dc2626' }}>
              {formatMontant(resteTotal)}
            </span>
          </div>
          <div className={styles.recetteSep} />
          <div className={styles.recetteItem}>
            <span className={styles.recetteItemLabel}>Total réservations</span>
            <span className={styles.recetteItemVal}>{reservations.length}</span>
          </div>
          <div className={styles.recetteSep} />
          <div className={styles.recetteItem}>
            <span className={styles.recetteItemLabel}>Clients</span>
            <span className={styles.recetteItemVal}>{nbClients}</span>
          </div>
          <div className={styles.recetteSep} />
          <div className={styles.recetteItem}>
            <span className={styles.recetteItemLabel}>Voitures</span>
            <span className={styles.recetteItemVal}>{nbVoitures}</span>
          </div>
        </div>
      </div>

      {/* ── STATS PAIEMENT ── */}
      <StatsPaiement reservations={reservations} />

    </div>
  )
}