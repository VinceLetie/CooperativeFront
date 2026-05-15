'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import styles from './voitures.module.css'
import FormVoiture from '../components/FormVoiture'
import GrillePlaces from '../components/GrillePlaces'

// ---------------------------------------------------------------------------
// DONNÉES MOCKÉES
// ---------------------------------------------------------------------------
const VOITURES_INIT: Voiture[] = [
  { idvoit: 'V01', design: 'Toyota Hiace',       type: 'simple',  nbrplace: 15, frais: 50000  },
  { idvoit: 'V02', design: 'Mercedes Vito',       type: 'premium', nbrplace: 12, frais: 80000  },
  { idvoit: 'V03', design: 'Toyota Land Cruiser', type: 'vip',     nbrplace:  9, frais: 120000 },
]

const RESERVATIONS_INIT: ReservationMin[] = [
  { idreserv: 'R001', idvoit: 'V01', place: 2 },
  { idreserv: 'R002', idvoit: 'V01', place: 4 },
  { idreserv: 'R003', idvoit: 'V02', place: 1 },
  { idreserv: 'R004', idvoit: 'V02', place: 3 },
  { idreserv: 'R005', idvoit: 'V03', place: 2 },
]

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
export type TypeVoiture = 'simple' | 'premium' | 'vip'

export interface Voiture {
  idvoit: string
  design: string
  type: TypeVoiture
  nbrplace: number
  frais: number
}

interface ReservationMin {
  idreserv: string
  idvoit: string
  place: number
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatFrais(n: number): string {
  return n.toLocaleString('fr-FR') + ' Ar'
}

function labelType(t: TypeVoiture): string {
  if (t === 'simple')  return 'Simple'
  if (t === 'premium') return 'Premium'
  return 'VIP'
}

function placesOccupees(reservations: ReservationMin[], idvoit: string): number[] {
  return reservations.filter(r => r.idvoit === idvoit).map(r => r.place)
}

function placesDisponibles(v: Voiture, reservations: ReservationMin[]): number {
  return v.nbrplace - placesOccupees(reservations, v.idvoit).length
}

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------
export default function PageVoitures() {
  const router = useRouter()

  const [voitures, setVoitures]                     = useState<Voiture[]>(VOITURES_INIT)
  const [reservations]                               = useState<ReservationMin[]>(RESERVATIONS_INIT)
  const [voitureOuverte, setVoitureOuverte]         = useState<string | null>(null)

  // FormVoiture
  const [popupOuvert, setPopupOuvert]               = useState(false)
  const [voitureEnEdition, setVoitureEnEdition]     = useState<Voiture | null>(null)

  // Confirmation suppression
  const [idASupprimer, setIdASupprimer]             = useState<string | null>(null)

  // ── FormVoiture ──────────────────────────────────────────────────────────
  function ouvrirAjout() {
    setVoitureEnEdition(null)
    setPopupOuvert(true)
  }

  function ouvrirModif(v: Voiture) {
    setVoitureEnEdition(v)
    setPopupOuvert(true)
  }

  function handleEnregistrer(v: Voiture) {
    if (voitureEnEdition) {
      setVoitures(voitures.map(x => x.idvoit === v.idvoit ? v : x))
    } else {
      setVoitures([...voitures, v])
    }
    setPopupOuvert(false)
  }

  // ── Suppression ──────────────────────────────────────────────────────────
  function confirmerSuppression() {
    if (!idASupprimer) return
    setVoitures(voitures.filter(v => v.idvoit !== idASupprimer))
    if (voitureOuverte === idASupprimer) setVoitureOuverte(null)
    setIdASupprimer(null)
  }

  // ── Toggle places ────────────────────────────────────────────────────────
  function togglePlaces(idvoit: string) {
    setVoitureOuverte(voitureOuverte === idvoit ? null : idvoit)
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── HEADER ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.titre}>Voitures</h1>
          <p className={styles.sousTitre}>
            {voitures.length} véhicule{voitures.length > 1 ? 's' : ''} enregistré{voitures.length > 1 ? 's' : ''}
          </p>
        </div>
        <button className={styles.btnPrincipal} onClick={ouvrirAjout}>
          + Ajouter une voiture
        </button>
      </div>

      {/* ── TABLEAU ── */}
      <div className={styles.tableauWrapper}>
        <table className={styles.tableau}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Désignation</th>
              <th>Type</th>
              <th style={{ textAlign: 'center' }}>Places dispo</th>
              <th>Frais</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {voitures.map(v => {
              const dispo    = placesDisponibles(v, reservations)
              const occupees = placesOccupees(reservations, v.idvoit)
              const ouverte  = voitureOuverte === v.idvoit

               return (
                 <Fragment key={v.idvoit}>
                   {/* ── Ligne voiture ── */}
                   <tr key={v.idvoit} className={ouverte ? styles.ligneActive : ''}>
                     <td className={styles.cellId}>{v.idvoit}</td>
                     <td className={styles.cellDesign}>{v.design}</td>
                     <td>
                       <span className={`${styles.badge} ${styles[`badge_${v.type}`]}`}>
                         {labelType(v.type)}
                       </span>
                     </td>
                     <td style={{ textAlign: 'center' }}>
                       <span style={{ fontWeight: 600, color: dispo > 0 ? '#16a34a' : '#dc2626' }}>
                         {dispo} / {v.nbrplace}
                       </span>
                     </td>
                     <td className={styles.cellFrais}>{formatFrais(v.frais)}</td>
                     <td>
                       <div className={styles.actions}>
                         <button
                           className={`${styles.btnAction} ${styles.btnSecondaire} ${ouverte ? styles.btnActif : ''}`}
                           onClick={() => togglePlaces(v.idvoit)}
                         >
                           {ouverte ? '▲ Places' : '▼ Places'}
                         </button>
                         <button
                           className={`${styles.btnAction} ${styles.btnSecondaire}`}
                           onClick={() => ouvrirModif(v)}
                         >
                           Modifier
                         </button>
                         <button
                           className={`${styles.btnAction} ${styles.btnDanger}`}
                           onClick={() => setIdASupprimer(v.idvoit)}
                         >
                           Supprimer
                         </button>
                       </div>
                     </td>
                   </tr>

                   {/* ── Ligne places minimaliste ── */}
                   {ouverte && (
                     <tr key={`places-${v.idvoit}`} className={styles.ligneBloc}>
                       <td colSpan={6}>
                         <div className={styles.blocPlaces}>
                           <div className={styles.blocPlacesHeader}>
                             <span>Places — {v.design}</span>
                             <button
                               className={`${styles.btnAction} ${styles.btnSecondaire}`}
                               onClick={() => setVoitureOuverte(null)}
                             >
                               ✕ Fermer
                             </button>
                           </div>

                           {/* Affichage minimaliste — différent de GrillePlaces */}
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '4px 0' }}>
                             {Array.from({ length: v.nbrplace }, (_, i) => {
                               const num   = i + 1
                               const libre = !occupees.includes(num)
                               return (
                                 <div
                                   key={num}
                                   style={{
                                     width: 52,
                                     height: 52,
                                     borderRadius: 8,
                                     display: 'flex',
                                     flexDirection: 'column',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     fontSize: 13,
                                     fontWeight: 600,
                                     background: libre ? '#f0fdf4' : '#fee2e2',
                                     color: libre ? '#15803d' : '#b91c1c',
                                     border: `1.5px solid ${libre ? '#bbf7d0' : '#fecaca'}`,
                                     userSelect: 'none',
                                   }}
                                 >
                                   <span style={{ fontSize: 10, fontWeight: 400, marginBottom: 2 }}>
                                     {libre ? 'Libre' : 'Occupé'}
                                   </span>
                                   {num}
                                 </div>
                               )
                             })}
                           </div>

                           {/* Bouton Détail */}
                           <div style={{ marginTop: 16 }}>
                             <button
                               className={`${styles.btnAction} ${styles.btnSecondaire}`}
                               onClick={() => router.push(`/voitures/${v.idvoit}`)}
                             >
                               Voir les réservations de cette voiture →
                             </button>
                           </div>
                         </div>
                       </td>
                     </tr>
                   )}
                 </Fragment>
               )
            })}

            {voitures.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.vide}>Aucune voiture enregistrée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── FORM VOITURE (component) ── */}
      {popupOuvert && (
        <FormVoiture
          voiture={voitureEnEdition}
          voituresExistantes={voitures.map(v => v.idvoit)}
          onEnregistrer={handleEnregistrer}
          onFermer={() => setPopupOuvert(false)}
        />
      )}

      {/* ── CONFIRMATION SUPPRESSION ── */}
      {idASupprimer && (
        <div className={styles.overlay} onClick={() => setIdASupprimer(null)}>
          <div className={styles.popup} onClick={e => e.stopPropagation()}>
            <div className={styles.popupHeader}>
              <span className={styles.popupTitre}>Confirmer la suppression</span>
              <button className={styles.btnClose} onClick={() => setIdASupprimer(null)}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 8px 0' }}>
              Voulez-vous vraiment supprimer cette voiture ?
            </p>
            <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 24px 0' }}>
              ⚠️ Cette action est irréversible.
            </p>
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