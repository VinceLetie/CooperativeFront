'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import styles from './voitures.module.css'
import FormVoiture from '../components/FormVoiture'
import {
  apiVoitures,
  apiPlaces,
  Voiture as ApiVoiture,
  Place as ApiPlace,
  TypeVoiture as ApiTypeVoiture,
} from '@/app/services/api'

// ---------------------------------------------------------------------------
// TYPES LOCAUX
// ---------------------------------------------------------------------------
export type TypeVoiture = 'simple' | 'premium' | 'vip'

export interface Voiture {
  idvoit: string
  design: string
  type: TypeVoiture
  nbrplace: number
  frais: number
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

function mapTypeToLocal(t: ApiTypeVoiture): TypeVoiture {
  switch (t) {
    case 'SIMPLE':  return 'simple'
    case 'PREMIUM': return 'premium'
    case 'VIP':     return 'vip'
  }
}

function mapTypeToApi(t: TypeVoiture): ApiTypeVoiture {
  switch (t) {
    case 'simple':  return 'SIMPLE'
    case 'premium': return 'PREMIUM'
    case 'vip':     return 'VIP'
  }
}

function mapApiVoitureToLocal(v: ApiVoiture): Voiture {
  return { ...v, type: mapTypeToLocal(v.type) }
}

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------
export default function PageVoitures() {
  const router = useRouter()

  const [voitures, setVoitures]                 = useState<Voiture[]>([])
  const [placesParVoiture, setPlacesParVoiture] = useState<Record<string, ApiPlace[]>>({})
  const [loading, setLoading]                   = useState(true)
  const [error, setError]                       = useState<string | null>(null)

  const [voitureOuverte, setVoitureOuverte]     = useState<string | null>(null)
  const [popupOuvert, setPopupOuvert]           = useState(false)
  const [voitureEnEdition, setVoitureEnEdition] = useState<Voiture | null>(null)
  const [idASupprimer, setIdASupprimer]         = useState<string | null>(null)
  const [formError, setFormError]               = useState<string | null>(null)

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [voituresData, placesData] = await Promise.all([
          apiVoitures.list(),
          apiPlaces.list(),
        ])
        setVoitures(voituresData.map(mapApiVoitureToLocal))

        // Grouper les places par idvoit
        const grouped: Record<string, ApiPlace[]> = {}
        placesData.forEach(p => {
          const id = p.id.idvoit
          if (!grouped[id]) grouped[id] = []
          grouped[id].push(p)
        })
        setPlacesParVoiture(grouped)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Toggle places — recharge depuis l'API à chaque ouverture ────────────
  async function togglePlaces(idvoit: string) {
    if (voitureOuverte === idvoit) {
      setVoitureOuverte(null)
      return
    }
    try {
      const places = await apiPlaces.listByVoiture(idvoit)
      setPlacesParVoiture(prev => ({ ...prev, [idvoit]: places }))
    } catch (err) {
      console.error('Erreur chargement places:', err)
    }
    setVoitureOuverte(idvoit)
  }

  // ── Recharger les places de la voiture ouverte ────────────────────────────
  async function rechargerPlaces(idvoit: string) {
    try {
      const places = await apiPlaces.listByVoiture(idvoit)
      setPlacesParVoiture(prev => ({ ...prev, [idvoit]: places }))
    } catch (err) {
      console.error('Erreur rechargement places:', err)
    }
  }

  // ── FormVoiture ───────────────────────────────────────────────────────────
  function ouvrirAjout() { setVoitureEnEdition(null); setFormError(null); setPopupOuvert(true) }
  function ouvrirModif(v: Voiture) { setVoitureEnEdition(v); setFormError(null); setPopupOuvert(true) }

  async function handleEnregistrer(v: Voiture) {
    try {
      const payload = {
        design:   v.design,
        type:     mapTypeToApi(v.type),
        nbrplace: v.nbrplace,
        frais:    v.frais,
      }
      if (voitureEnEdition) {
        const updated = await apiVoitures.update(v.idvoit, payload)
        setVoitures(prev => prev.map(x => x.idvoit === v.idvoit ? mapApiVoitureToLocal(updated) : x))
        // Recharger les places car nbrplace a pu changer
        await rechargerPlaces(v.idvoit)
        // Si la grille était ouverte sur cette voiture, la rouvrir pour forcer le re-render
        if (voitureOuverte === v.idvoit) {
          setVoitureOuverte(null)
          setTimeout(() => setVoitureOuverte(v.idvoit), 0)
        }
      } else {
        const created = await apiVoitures.create(payload)
        setVoitures(prev => [...prev, mapApiVoitureToLocal(created)])
        // Les places sont créées automatiquement par le backend
        const places = await apiPlaces.listByVoiture(created.idvoit)
        setPlacesParVoiture(prev => ({ ...prev, [created.idvoit]: places }))
      }
      setPopupOuvert(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    }
  }

  // ── Suppression (locale — pas d'endpoint DELETE dans l'API) ──────────────
  function confirmerSuppression() {
    if (!idASupprimer) return
    setVoitures(prev => prev.filter(v => v.idvoit !== idASupprimer))
    if (voitureOuverte === idASupprimer) setVoitureOuverte(null)
    setIdASupprimer(null)
  }

  // ── États ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <p style={{ textAlign: 'center', padding: '40px' }}>Chargement des voitures...</p>
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

  // ── Rendu ─────────────────────────────────────────────────────────────────
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
              const places  = placesParVoiture[v.idvoit] ?? []
              const libres  = places.filter(p => !p.occupation).length
              const ouverte = voitureOuverte === v.idvoit

              return (
                <Fragment key={v.idvoit}>
                  {/* ── Ligne voiture ── */}
                  <tr className={ouverte ? styles.ligneActive : ''}>
                    <td className={styles.cellId}>{v.idvoit}</td>
                    <td className={styles.cellDesign}>{v.design}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge_${v.type}`]}`}>
                        {labelType(v.type)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: libres > 0 ? '#16a34a' : '#dc2626' }}>
                        {libres} / {v.nbrplace}
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

                  {/* ── Ligne places ── */}
                  {ouverte && (
                    <tr className={styles.ligneBloc}>
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

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '4px 0' }}>
                            {places
                              .sort((a, b) => a.id.place - b.id.place)
                              .map(p => {
                                const libre = !p.occupation
                                return (
                                  <div
                                    key={p.id.place}
                                    style={{
                                      width: 52, height: 52, borderRadius: 8,
                                      display: 'flex', flexDirection: 'column',
                                      alignItems: 'center', justifyContent: 'center',
                                      fontSize: 13, fontWeight: 600,
                                      background: libre ? '#f0fdf4' : '#fee2e2',
                                      color: libre ? '#15803d' : '#b91c1c',
                                      border: `1.5px solid ${libre ? '#bbf7d0' : '#fecaca'}`,
                                      userSelect: 'none',
                                    }}
                                  >
                                    <span style={{ fontSize: 10, fontWeight: 400, marginBottom: 2 }}>
                                      {libre ? 'Libre' : 'Occupé'}
                                    </span>
                                    {p.id.place}
                                  </div>
                                )
                              })}
                          </div>

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

      {/* ── FORM VOITURE ── */}
      {popupOuvert && (
        <FormVoiture
          voiture={voitureEnEdition}
          voituresExistantes={voitures.map(v => v.idvoit)}
          onEnregistrer={handleEnregistrer}
          onFermer={() => { setPopupOuvert(false); setFormError(null) }}
          erreurExterne={formError}
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