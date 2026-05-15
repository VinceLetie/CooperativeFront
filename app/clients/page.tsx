'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import styles from './clients.module.css'
import FormClient from '../components/FormClient'
import '../globals.css'

// ---------------------------------------------------------------------------
// DONNÉES MOCKÉES
// ---------------------------------------------------------------------------
const VOITURES_INIT: Voiture[] = [
  { idvoit: 'V01', design: 'Toyota Hiace',       type: 'simple'  },
  { idvoit: 'V02', design: 'Mercedes Vito',       type: 'premium' },
  { idvoit: 'V03', design: 'Toyota Land Cruiser', type: 'vip'     },
]

const CLIENTS_INIT: Client[] = [
  { idcli: 1, nom: 'Rakoto Madison', numtel: '034 33 888 12' },
  { idcli: 2, nom: 'Rabe Jean',      numtel: '033 12 345 67' },
  { idcli: 3, nom: 'Rasoa Miora',    numtel: '032 55 111 22' },
  { idcli: 4, nom: 'Andry Pierre',   numtel: '034 00 222 33' },
]

const RESERVATIONS_INIT: Reservation[] = [
  { idreserv: 'R001', idvoit: 'V01', idcli: 1, place: 2, datevoyage: '2024-05-25', payment: 'avec avance',  montantAvance: 20000,  frais: 50000  },
  { idreserv: 'R002', idvoit: 'V01', idcli: 2, place: 4, datevoyage: '2024-05-26', payment: 'tout payé',    montantAvance: 50000,  frais: 50000  },
  { idreserv: 'R003', idvoit: 'V02', idcli: 3, place: 1, datevoyage: '2024-05-28', payment: 'sans avance',  montantAvance: 0,      frais: 80000  },
  { idreserv: 'R004', idvoit: 'V01', idcli: 4, place: 6, datevoyage: '2024-05-25', payment: 'avec avance',  montantAvance: 15000,  frais: 50000  },
  { idreserv: 'R005', idvoit: 'V03', idcli: 1, place: 2, datevoyage: '2024-06-01', payment: 'tout payé',    montantAvance: 120000, frais: 120000 },
]

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
export interface Client {
  idcli: number
  nom: string
  numtel: string
}

type TypeVoiture = 'simple' | 'premium' | 'vip'
type Paiement    = 'sans avance' | 'avec avance' | 'tout payé'
type FiltreAll   = Paiement | 'tous'

interface Voiture {
  idvoit: string
  design: string
  type: TypeVoiture
}

interface Reservation {
  idreserv: string
  idvoit: string
  idcli: number
  place: number
  datevoyage: string
  payment: Paiement
  montantAvance: number
  frais: number
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function labelType(t: TypeVoiture): string {
  return t === 'simple' ? 'Simple' : t === 'premium' ? 'Premium' : 'VIP'
}

const normaliser = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

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

  const [clients, setClients] = useState<Client[]>(CLIENTS_INIT)
  const [reservations]         = useState<Reservation[]>(RESERVATIONS_INIT)

  // Recherche texte
  const [recherche, setRecherche] = useState('')

  // Filtre paiement
  const [filtrePaiement, setFiltrePaiement] = useState<FiltreAll>('tous')

  // Sélection rapide voiture (redirect)
  const [voitureSelectionnee, setVoitureSelectionnee] = useState('')

  // Popup FormClient
  const [popupOuvert, setPopupOuvert]         = useState(false)
  const [clientEnEdition, setClientEnEdition] = useState<Client | null>(null)

  // Confirmation suppression
  const [idASupprimer, setIdASupprimer] = useState<number | null>(null)

  // ── IDs clients filtrés par statut paiement ─────────────────────────────
  const idsFiltresPaiement = useMemo(() => {
    if (filtrePaiement === 'tous') return null
    return new Set(
      reservations
        .filter(r => r.payment === filtrePaiement)
        .map(r => r.idcli)
    )
  }, [reservations, filtrePaiement])

  // ── Liste filtrée (recherche + paiement combinés) ────────────────────────
  const termNorm = normaliser(recherche.trim())

  const clientsFiltres = useMemo(() => {
    return clients.filter(c => {
      const matchTexte = !termNorm
        || normaliser(c.nom).includes(termNorm)
        || c.numtel.replace(/\s/g, '').includes(termNorm.replace(/\s/g, ''))
      const matchPaiement = idsFiltresPaiement === null || idsFiltresPaiement.has(c.idcli)
      return matchTexte && matchPaiement
    })
  }, [clients, termNorm, idsFiltresPaiement])

  // ── Comptage par statut (badge sur les boutons filtre) ───────────────────
  const comptages = useMemo(() => {
    const c: Record<FiltreAll, number> = { 'tous': clients.length, 'sans avance': 0, 'avec avance': 0, 'tout payé': 0 }
    // On compte les clients uniques par statut
    const seen: Record<string, Set<number>> = { 'sans avance': new Set(), 'avec avance': new Set(), 'tout payé': new Set() }
    reservations.forEach(r => { seen[r.payment]?.add(r.idcli) })
    c['sans avance'] = seen['sans avance'].size
    c['avec avance'] = seen['avec avance'].size
    c['tout payé']   = seen['tout payé'].size
    return c
  }, [clients, reservations])

  // ── Handlers FormClient ──────────────────────────────────────────────────
  function ouvrirAjout() { setClientEnEdition(null); setPopupOuvert(true) }
  function ouvrirModif(c: Client) { setClientEnEdition(c); setPopupOuvert(true) }

  function handleEnregistrer(c: Client) {
    setClients(prev =>
      clientEnEdition
        ? prev.map(x => x.idcli === c.idcli ? c : x)
        : [...prev, c]
    )
    setPopupOuvert(false)
  }

  // ── Suppression ──────────────────────────────────────────────────────────
  function confirmerSuppression() {
    if (idASupprimer === null) return
    setClients(prev => prev.filter(c => c.idcli !== idASupprimer))
    setIdASupprimer(null)
  }

  // ── Redirect vers page voiture ───────────────────────────────────────────
  function allerVersVoiture(idvoit: string) {
    if (idvoit) router.push(`/voitures/${idvoit}`)
  }

  const filtreActif = recherche.trim() || filtrePaiement !== 'tous'

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── HEADER ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.titre}>Clients</h1>
          <p className={styles.sousTitre}>
            {clients.length} client{clients.length > 1 ? 's' : ''} enregistré{clients.length > 1 ? 's' : ''}
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
          <span className={styles.rechercheIcone} aria-hidden>🔍</span>
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
          {VOITURES_INIT.map(v => (
            <option key={v.idvoit} value={v.idvoit}>
              {v.idvoit} — {v.design} ({labelType(v.type)})
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
          <button className={styles.btnReinitFiltres} onClick={() => { setRecherche(''); setFiltrePaiement('tous') }}>
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
                    >Modifier</button>
                    <button
                      className={`${styles.btnAction} ${styles.btnDanger}`}
                      onClick={() => setIdASupprimer(c.idcli)}
                    >Supprimer</button>
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
          clientsExistants={clients}
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
              >Annuler</button>
              <button
                className={`${styles.btnAction} ${styles.btnDanger}`}
                onClick={confirmerSuppression}
              >Supprimer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}