'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './voitureDetail.module.css'
import ListeReservations, { Reservation } from '../../components/ListeReservations'
import StatsPaiement from '../../components/StatsPaiement'
import {
  apiVoitures,
  apiReservations,
  apiClients,
  Voiture as ApiVoiture,
  Reservation as ApiReservation,
  Paiement,
  TypeVoiture,
} from '@/app/services/api'

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatFrais(n: number) {
  return n.toLocaleString('fr-FR') + ' Ar'
}

function labelType(t: TypeVoiture) {
  if (t === 'SIMPLE')  return 'Simple'
  if (t === 'PREMIUM') return 'Premium'
  return 'VIP'
}

function mapTypeToLocal(t: TypeVoiture): 'simple' | 'premium' | 'vip' {
  switch (t) {
    case 'SIMPLE':  return 'simple'
    case 'PREMIUM': return 'premium'
    case 'VIP':     return 'vip'
  }
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
export default function PageVoitureDetail() {
  const params = useParams()
  const router = useRouter()
  const idvoit = params.id as string

  const [voiture, setVoiture]           = useState<ApiVoiture | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [placesLibres, setPlacesLibres] = useState<number>(0)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null)

  // ── Chargement ────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const [voitureData, reservationsData, clientsData, libres] = await Promise.all([
          apiVoitures.getById(idvoit),
          apiReservations.listByVoiture(idvoit),
          apiClients.list(),
          apiVoitures.placesLibres(idvoit),
        ])

        setVoiture(voitureData)
        setPlacesLibres(libres)

        // Enrichir les réservations avec les infos client + voiture
        const clientsMap = new Map(clientsData.map(c => [c.idcli, c]))

        const enrichies: Reservation[] = reservationsData.map((r: ApiReservation) => {
          const client = clientsMap.get(r.idcli)
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
            fraisVoiture:  voitureData.frais,
            designVoiture: voitureData.design,
            typeVoiture:   mapTypeToLocal(voitureData.type),
          }
        })

        setReservations(enrichies)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        console.error('Erreur chargement voiture detail:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [idvoit])

  // ── Suppression locale ────────────────────────────────────────────────────
  function confirmerSuppression() {
    if (!idASupprimer) return
    setReservations(prev => prev.filter(r => r.idreserv !== idASupprimer))
    setIdASupprimer(null)
  }

  // ── États ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <p style={{ textAlign: 'center', padding: '40px' }}>Chargement...</p>
      </div>
    )
  }

  if (error || !voiture) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.btnRetour} onClick={() => router.push('/voitures')}>
            ← Retour
          </button>
        </div>
        <p className={styles.erreur}>{error ?? 'Voiture introuvable.'}</p>
      </div>
    )
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── HEADER ── */}
      <div className={styles.header}>
        <button className={styles.btnRetour} onClick={() => router.push('/voitures')}>
          ← Retour aux voitures
        </button>
      </div>

      {/* ── FICHE VOITURE ── */}
      <div className={styles.ficheVoiture}>
        <div className={styles.ficheGauche}>
          <div className={styles.ficheId}>{voiture.idvoit}</div>
          <div className={styles.ficheDesign}>{voiture.design}</div>
          <span className={`${styles.badge} ${styles[`badge_${mapTypeToLocal(voiture.type)}`]}`}>
            {labelType(voiture.type)}
          </span>
        </div>
        <div className={styles.ficheDroite}>
          <div className={styles.ficheStat}>
            <span className={styles.ficheStatLabel}>Places totales</span>
            <span className={styles.ficheStatVal}>{voiture.nbrplace}</span>
          </div>
          <div className={styles.ficheStat}>
            <span className={styles.ficheStatLabel}>Places disponibles</span>
            <span className={styles.ficheStatVal} style={{ color: placesLibres > 0 ? '#16a34a' : '#dc2626' }}>
              {placesLibres}
            </span>
          </div>
          <div className={styles.ficheStat}>
            <span className={styles.ficheStatLabel}>Frais</span>
            <span className={styles.ficheStatVal}>{formatFrais(voiture.frais)}</span>
          </div>
        </div>
      </div>

      {/* ── STATS PAIEMENT ── */}
      <StatsPaiement reservations={reservations} />

      {/* ── LISTE RÉSERVATIONS ── */}
      <ListeReservations
        reservations={reservations}
        masquerColonneVoiture={true}
        onSupprimer={(id) => setIdASupprimer(id)}
      />

      {/* ── CONFIRMATION SUPPRESSION ── */}
      {idASupprimer && (
        <div className={styles.overlay} onClick={() => setIdASupprimer(null)}>
          <div className={styles.popup} onClick={e => e.stopPropagation()}>
            <div className={styles.popupHeader}>
              <span className={styles.popupTitre}>Confirmer la suppression</span>
              <button className={styles.btnClose} onClick={() => setIdASupprimer(null)}>✕</button>
            </div>
            <p className={styles.popupTexte}>
              Voulez-vous vraiment supprimer la réservation <strong>{idASupprimer}</strong> ?
            </p>
            <p className={styles.popupAvertissement}>⚠️ Cette action est irréversible.</p>
            <div className={styles.actionsPopup}>
              <button
                className={`${styles.btnAction} ${styles.btnSecondaire}`}
                onClick={() => setIdASupprimer(null)}
              >
                Annuler
              </button>
              <button
                className={`${styles.btnAction} ${styles.btnDanger}`}
                onClick={confirmerSuppression}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}