'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './clients.module.css'
import FormClient from '../components/FormClient'
import '../globals.css'
import {
  apiClients,
  apiVoitures,
  apiReservations,
  Client as ApiClient,
  Voiture as ApiVoiture,
  Reservation as ApiReservation,
  Paiement,
  TypeVoiture,
} from '@/app/services/api'

// ---------------------------------------------------------------------------
// TYPES LOCAUX
// ---------------------------------------------------------------------------
export interface Client extends ApiClient {}

type LocalPaiement = 'sans avance' | 'avec avance' | 'tout payé'
type FiltreAll     = LocalPaiement | 'tous'

interface Voiture extends ApiVoiture {
  type: TypeVoiture
}

interface Reservation extends ApiReservation {}

// ---------------------------------------------------------------------------
// CONVERSIONS API ↔ LOCAL
// ---------------------------------------------------------------------------
function mapApiPaiementToLocal(p: Paiement): LocalPaiement {
  switch (p) {
    case 'SANS_AVANCE': return 'sans avance'
    case 'AVEC_AVANCE': return 'avec avance'
    case 'TOUT_PAYE':   return 'tout payé'
  }
}

function mapLocalPaiementToApi(p: LocalPaiement): Paiement {
  switch (p) {
    case 'sans avance': return 'SANS_AVANCE'
    case 'avec avance': return 'AVEC_AVANCE'
    case 'tout payé':   return 'TOUT_PAYE'
  }
}

function mapApiTypeToLocal(t: TypeVoiture): 'simple' | 'premium' | 'vip' {
  switch (t) {
    case 'SIMPLE':  return 'simple'
    case 'PREMIUM': return 'premium'
    case 'VIP':     return 'vip'
  }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function labelType(t: 'simple' | 'premium' | 'vip'): string {
  return t === 'simple' ? 'Simple' : t === 'premium' ? 'Premium' : 'VIP'
}

function segmenter(texte: string, terme: string): { t: string; s: boolean }[] {
  if (!terme.trim()) return [{ t: texte, s: false }]
  const regex = new RegExp(`(${terme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return texte.split(regex).map(part => ({ t: part, s: regex.test(part) }))
}

function Surligne({ texte, terme }: { texte: string; terme: string }) {
  return (
    <>
      {segmenter(texte, terme).map((seg, i) =>
        seg.s
          ? <mark key={i} className={styles.surligne}>{seg.t}</mark>
          : <span key={i}>{seg.t}</span>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------
export default function PageClients() {
  const router = useRouter()

  const [clients, setClients]           = useState<Client[]>([])
  const [allClients, setAllClients]     = useState<Client[]>([]) // liste complète non filtrée
  const [voitures, setVoitures]         = useState<Voiture[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading]           = useState(true)
  const [rechercheLoading, setRechercheLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const [recherche, setRecherche]                     = useState('')
  const [filtrePaiement, setFiltrePaiement]           = useState<FiltreAll>('tous')
  const [voitureSelectionnee, setVoitureSelectionnee] = useState('')
  const [popupOuvert, setPopupOuvert]                 = useState(false)
  const [clientEnEdition, setClientEnEdition]         = useState<Client | null>(null)
  const [idASupprimer, setIdASupprimer]               = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [clientsData, voituresData, reservationsData] = await Promise.all([
          apiClients.list(),
          apiVoitures.list(),
          apiReservations.list(),
        ])
        setClients(clientsData)
        setAllClients(clientsData)
        setVoitures(voituresData as Voiture[])
        setReservations(reservationsData)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        console.error('Erreur chargement données:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Recherche backend avec debounce 300ms ─────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!recherche.trim()) {
      setClients(allClients)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setRechercheLoading(true)
        const results = await apiClients.search(recherche.trim())
        setClients(results)
      } catch (err) {
        console.error('Erreur recherche clients:', err)
      } finally {
        setRechercheLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [recherche, allClients])

  // ── IDs clients filtrés par paiement ─────────────────────────────────────
  const idsFiltresPaiement = useMemo(() => {
    if (filtrePaiement === 'tous') return null
    const apiPaiement = mapLocalPaiementToApi(filtrePaiement as LocalPaiement)
    return new Set(
      reservations
        .filter(r => r.payment === apiPaiement)
        .map(r => r.idcli)
    )
  }, [reservations, filtrePaiement])

  // ── Liste filtrée (paiement seulement — recherche gérée par le backend) ──
  const clientsFiltres = useMemo(() => {
    if (idsFiltresPaiement === null) return clients
    return clients.filter(c => idsFiltresPaiement.has(c.idcli))
  }, [clients, idsFiltresPaiement])

  // ── Comptages par statut paiement ─────────────────────────────────────────
  const comptages = useMemo(() => {
    const c: Record<FiltreAll, number> = {
      'tous': allClients.length,
      'sans avance': 0,
      'avec avance': 0,
      'tout payé': 0,
    }
    const seen: Record<LocalPaiement, Set<string>> = {
      'sans avance': new Set(),
      'avec avance': new Set(),
      'tout payé':   new Set(),
    }
    reservations.forEach(r => {
      const local = mapApiPaiementToLocal(r.payment)
      seen[local].add(r.idcli)
    })
    c['sans avance'] = seen['sans avance'].size
    c['avec avance'] = seen['avec avance'].size
    c['tout payé']   = seen['tout payé'].size
    return c
  }, [allClients, reservations])

  // ── Handlers FormClient ───────────────────────────────────────────────────
  function ouvrirAjout() { setClientEnEdition(null); setPopupOuvert(true) }
  function ouvrirModif(c: Client) { setClientEnEdition(c); setPopupOuvert(true) }

  async function handleEnregistrer(c: Client) {
    try {
      if (clientEnEdition) {
        const updated = await apiClients.update(c.idcli, {
          nom: c.nom,
          numtel: c.numtel,
        })
        setClients(prev => prev.map(x => x.idcli === c.idcli ? updated : x))
        setAllClients(prev => prev.map(x => x.idcli === c.idcli ? updated : x))
      } else {
        const created = await apiClients.create({
          nom: c.nom,
          numtel: c.numtel,
        })
        setClients(prev => [...prev, created])
        setAllClients(prev => [...prev, created])
      }
      setPopupOuvert(false)
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du client:", err)
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  // ── Suppression (local uniquement — pas d'endpoint DELETE dans l'API) ─────
  function confirmerSuppression() {
    if (idASupprimer === null) return
    setClients(prev => prev.filter(c => c.idcli !== idASupprimer))
    setAllClients(prev => prev.filter(c => c.idcli !== idASupprimer))
    setIdASupprimer(null)
  }

  // ── Navigation vers page voiture ──────────────────────────────────────────
  function allerVersVoiture(idvoit: string) {
    if (idvoit) router.push(`/voitures/${idvoit}`)
  }

  const filtreActif = recherche.trim() || filtrePaiement !== 'tous'

  // ── États loading / erreur ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <p style={{ textAlign: 'center', padding: '40px' }}>Chargement des clients...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '20px',
          borderRadius: '8px',
          margin: '20px',
        }}>
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
          <h1 className={styles.titre}>Clients</h1>
          <p className={styles.sousTitre}>
            {allClients.length} client{allClients.length > 1 ? 's' : ''} enregistré{allClients.length > 1 ? 's' : ''}
          </p>
        </div>
        <button className={styles.btnPrincipal} onClick={ouvrirAjout}>
          + Ajouter un client
        </button>
      </div>

      {/* ── BARRE OUTILS ── */}
      <div className={styles.barreOutils}>

        {/* Recherche */}
        <div className={styles.rechercheWrapper}>
          <span className={styles.rechercheIcone} aria-hidden>
            {rechercheLoading ? '⏳' : '🔍'}
          </span>
          <input
            className={styles.inputRecherche}
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par nom ou téléphone..."
            autoComplete="off"
            spellCheck={false}
          />
          {recherche && (
            <button className={styles.btnEffacer} onClick={() => setRecherche('')} aria-label="Effacer">
              ✕
            </button>
          )}
        </div>

        {/* Filtres paiement */}
        <div className={styles.filtresPaiement}>
          {(['tous', 'sans avance', 'avec avance', 'tout payé'] as FiltreAll[]).map(p => (
            <button
              key={p}
              className={`${styles.btnFiltre} ${filtrePaiement === p ? styles.btnFiltreActif : ''}`}
              onClick={() => setFiltrePaiement(p)}
            >
              {p === 'tous' ? 'Tous' : p.charAt(0).toUpperCase() + p.slice(1)}
              <span className={styles.badgeComptage}>{comptages[p]}</span>
            </button>
          ))}
        </div>

        {/* Sélection voiture → /voitures/[idvoit] */}
        <select
          className={styles.selectVoiture}
          value={voitureSelectionnee}
          onChange={e => {
            setVoitureSelectionnee(e.target.value)
            allerVersVoiture(e.target.value)
          }}
        >
          <option value="">🚐 Voir par voiture...</option>
          {voitures.map(v => (
            <option key={v.idvoit} value={v.idvoit}>
              {v.idvoit} — {v.design} ({labelType(mapApiTypeToLocal(v.type))})
            </option>
          ))}
        </select>

      </div>

      {/* Résumé filtre actif */}
      {filtreActif && (
        <p className={styles.rechercheInfo}>
          <span className={styles.rechercheInfoSurligne}>{clientsFiltres.length}</span>
          {' '}client{clientsFiltres.length !== 1 ? 's' : ''}
          {recherche.trim() && <> pour «&nbsp;<strong>{recherche.trim()}</strong>&nbsp;»</>}
          {filtrePaiement !== 'tous' && <> · {filtrePaiement}</>}
          <button
            className={styles.btnReinitFiltres}
            onClick={() => { setRecherche(''); setFiltrePaiement('tous') }}
          >
            Réinitialiser
          </button>
        </p>
      )}

      {/* ── TABLEAU CLIENTS ── */}
      <div className={styles.tableauWrapper}>
        <table className={styles.tableau}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clientsFiltres.map(c => (
              <tr key={c.idcli}>
                <td className={styles.cellId}>{c.idcli}</td>
                <td className={styles.cellNom}>
                  <Surligne texte={c.nom} terme={recherche.trim()} />
                </td>
                <td className={styles.cellTel}>
                  <Surligne texte={c.numtel} terme={recherche.trim()} />
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.btnAction} ${styles.btnSecondaire}`}
                      onClick={() => ouvrirModif(c)}
                    >
                      Modifier
                    </button>
                    <button
                      className={`${styles.btnAction} ${styles.btnDanger}`}
                      onClick={() => setIdASupprimer(c.idcli)}
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clientsFiltres.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.vide}>
                  {filtreActif
                    ? 'Aucun client ne correspond à ces critères.'
                    : 'Aucun client enregistré.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── FORM CLIENT ── */}
      {popupOuvert && (
        <FormClient
          client={clientEnEdition}
          clientsExistants={allClients}
          onEnregistrer={handleEnregistrer}
          onFermer={() => setPopupOuvert(false)}
        />
      )}

      {/* ── CONFIRMATION SUPPRESSION ── */}
      {idASupprimer !== null && (
        <div className={styles.overlay} onClick={() => setIdASupprimer(null)}>
          <div className={styles.popup} onClick={e => e.stopPropagation()}>
            <div className={styles.popupHeader}>
              <span className={styles.popupTitre}>Confirmer la suppression</span>
              <button className={styles.btnClose} onClick={() => setIdASupprimer(null)}>✕</button>
            </div>
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 8px 0' }}>
              Voulez-vous vraiment supprimer ce client ?
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