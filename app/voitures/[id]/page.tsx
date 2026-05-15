'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from './voitureDetail.module.css'
import ListeReservations, { Reservation } from '../../components/ListeReservations'
import StatsPaiement from '../../components/StatsPaiement'

// ---------------------------------------------------------------------------
// DONNÉES MOCKÉES  (à remplacer par appels API)
// ---------------------------------------------------------------------------
const VOITURES_MOCK = [
  { idvoit: 'V01', design: 'Toyota Hiace',       type: 'simple'  as const, nbrplace: 15, frais: 50000  },
  { idvoit: 'V02', design: 'Mercedes Vito',       type: 'premium' as const, nbrplace: 12, frais: 80000  },
  { idvoit: 'V03', design: 'Toyota Land Cruiser', type: 'vip'     as const, nbrplace:  9, frais: 120000 },
]

const RESERVATIONS_MOCK: Reservation[] = [
  {
    idreserv: 'R001', idvoit: 'V01', idcli: 1, place: 2,
    dateReserv: '2024-05-20 07:00:00', dateVoyage: '2024-05-25',
    payment: 'avec avance', montantAvance: 20000,
    nomClient: 'Rakoto Madison', numtel: '034 33 888 12',
    fraisVoiture: 50000, designVoiture: 'Toyota Hiace', typeVoiture: 'simple',
  },
  {
    idreserv: 'R002', idvoit: 'V01', idcli: 2, place: 4,
    dateReserv: '2024-05-20 07:00:00', dateVoyage: '2024-05-25',
    payment: 'tout payé', montantAvance: 50000,
    nomClient: 'Rabe Hery', numtel: '033 12 345 67',
    fraisVoiture: 50000, designVoiture: 'Toyota Hiace', typeVoiture: 'simple',
  },
  {
    idreserv: 'R003', idvoit: 'V01', idcli: 3, place: 7,
    dateReserv: '2024-05-21 19:00:00', dateVoyage: '2024-05-26',
    payment: 'sans avance', montantAvance: 0,
    nomClient: 'Rasoa Miora', numtel: '032 98 765 43',
    fraisVoiture: 50000, designVoiture: 'Toyota Hiace', typeVoiture: 'simple',
  },
  {
    idreserv: 'R004', idvoit: 'V02', idcli: 4, place: 1,
    dateReserv: '2024-05-19 07:00:00', dateVoyage: '2024-05-24',
    payment: 'avec avance', montantAvance: 40000,
    nomClient: 'Andry Tsiry', numtel: '034 56 789 01',
    fraisVoiture: 80000, designVoiture: 'Mercedes Vito', typeVoiture: 'premium',
  },
  {
    idreserv: 'R005', idvoit: 'V03', idcli: 5, place: 2,
    dateReserv: '2024-05-18 07:00:00', dateVoyage: '2024-05-23',
    payment: 'tout payé', montantAvance: 120000,
    nomClient: 'Rakoto Aina', numtel: '033 44 555 66',
    fraisVoiture: 120000, designVoiture: 'Toyota Land Cruiser', typeVoiture: 'vip',
  },
]

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatFrais(n: number) {
  return n.toLocaleString('fr-FR') + ' Ar'
}

function labelType(t: string) {
  if (t === 'simple')  return 'Simple'
  if (t === 'premium') return 'Premium'
  return 'VIP'
}

// ---------------------------------------------------------------------------
// PAGE
// ---------------------------------------------------------------------------
export default function PageVoitureDetail() {
  const params = useParams()
  const router = useRouter()
  const idvoit = params.id as string

  const voiture = VOITURES_MOCK.find(v => v.idvoit === idvoit)
  const toutesReservations = RESERVATIONS_MOCK.filter(r => r.idvoit === idvoit)

  const [idASupprimer, setIdASupprimer] = useState<string | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>(toutesReservations)

  const placesDisponibles = voiture ? voiture.nbrplace - reservations.length : 0

  // ── Suppression ───────────────────────────────────────────────────────────
  function confirmerSuppression() {
    if (!idASupprimer) return
    setReservations(prev => prev.filter(r => r.idreserv !== idASupprimer))
    setIdASupprimer(null)
  }

  // ── Voiture introuvable ───────────────────────────────────────────────────
  if (!voiture) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.btnRetour} onClick={() => router.push('/voitures')}>
            ← Retour
          </button>
        </div>
        <p className={styles.erreur}>Voiture introuvable.</p>
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
          <span className={`${styles.badge} ${styles[`badge_${voiture.type}`]}`}>
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
            <span className={styles.ficheStatVal} style={{ color: placesDisponibles > 0 ? '#16a34a' : '#dc2626' }}>
              {placesDisponibles}
            </span>
          </div>
          <div className={styles.ficheStat}>
            <span className={styles.ficheStatLabel}>Frais</span>
            <span className={styles.ficheStatVal}>{formatFrais(voiture.frais)}</span>
          </div>
        </div>
      </div>

      {/* ── STATS PAIEMENT (seulement cette voiture) ── */}
      <StatsPaiement reservations={reservations} />

      {/* ── LISTE RÉSERVATIONS (filtres + titre gérés en interne) ── */}
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