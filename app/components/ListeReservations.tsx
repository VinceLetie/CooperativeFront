'use client'

import { useState } from 'react'
import SearchClient from '@/app/components/SearchClient'
import { Client } from '@/app/clients/page'

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
export interface Reservation {
  idreserv: string
  idvoit: string
  idcli: number
  place: number
  dateReserv: string   // AAAA-MM-JJ HH:MM:SS
  dateVoyage: string   // AAAA-MM-JJ
  payment: 'sans avance' | 'avec avance' | 'tout payé'
  montantAvance: number
  nomClient?: string
  numtel?: string
  fraisVoiture?: number
  designVoiture?: string
  typeVoiture?: string
}

interface Props {
  reservations: Reservation[]
  clients?: Client[]
  /** Masquer la colonne Voiture quand on est déjà sur une page voiture */
  masquerColonneVoiture?: boolean
  onSupprimer?: (idreserv: string) => void
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function formatDatetime(dt: string): string {
  const [date, time] = dt.split(' ')
  const [y, m, day] = date.split('-')
  const [hh, mm] = time.split(':')
  return `${day}/${m}/${y} ${hh}:${mm}`
}

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR') + ' Ar'
}

function badgePayment(p: Reservation['payment']) {
  if (p === 'tout payé')   return { label: 'Tout payé',   color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
  if (p === 'avec avance') return { label: 'Avec avance', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  return                          { label: 'Sans avance', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
}

// ---------------------------------------------------------------------------
// COMPOSANT
// ---------------------------------------------------------------------------
export default function ListeReservations({
  reservations,
  clients,
  masquerColonneVoiture = false,
  onSupprimer,
}: Props) {
  // ── Filtres internes ──
  const [filtrePaiement, setFiltrePaiement] = useState<'sans avance' | 'avec avance' | 'tout payé' | null>(null)
  const [filtreClient,   setFiltreClient]   = useState<Client | null>(null)

  // Si clients[] non fourni (ex: page voiture/id), on les reconstruit
  // depuis les données enrichies des réservations elles-mêmes
  const clientsDisponibles: Client[] = clients ?? reservations
    .filter(r => r.nomClient)
    .reduce<Client[]>((acc, r) => {
      if (!acc.find(c => c.idcli === r.idcli)) {
        acc.push({ idcli: r.idcli, nom: r.nomClient!, numtel: r.numtel ?? '' })
      }
      return acc
    }, [])

  const liste = reservations.filter(r => {
    if (filtrePaiement && r.payment !== filtrePaiement) return false
    if (filtreClient   && r.idcli   !== filtreClient.idcli) return false
    return true
  })

  // ✅ FIX : Handler "Modifier" — met à jour l'URL avec ?edit=ID
  //    puis scroll vers le haut pour que le formulaire soit visible.
  //    On utilise window.history.pushState pour ne PAS provoquer un rechargement
  //    complet de la page (ce qui viderait l'état React / les reservations en mémoire).
  //    Le useEffect dans page.tsx détecte le changement de searchParams et
  //    remplit le formulaire automatiquement.
  function handleModifier(idreserv: string) {
    // Mise à jour de l'URL sans rechargement
    const url = new URL(window.location.href)
    url.searchParams.set('edit', idreserv)
    window.history.pushState({}, '', url.toString())

    // Déclencher l'événement popstate pour que Next.js / useSearchParams
    // détecte le changement (nécessaire avec window.history.pushState manuel)
    window.dispatchEvent(new PopStateEvent('popstate'))

    // Scroll vers le formulaire en haut de page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="lr-section">

      {/* ── TITRE + FILTRES ── */}
      <div className="lr-filtres-header">
        <div className="lr-filtres-titre">Liste des réservations</div>
        <div className="lr-filtres-row">

          {/* Recherche client */}
          {clientsDisponibles.length > 0 && (
            <div className="lr-filtre-client">
              <SearchClient
                clients={clientsDisponibles}
                onSelectionner={c => setFiltreClient(c)}
                avecSelection={true}
                clientSelectionne={filtreClient}
                onChanger={() => setFiltreClient(null)}
                placeholder="Filtrer par client..."
              />
            </div>
          )}

          {/* Filtre paiement */}
          <div className="lr-filtre-paiement-btns">
            {([
              { val: null,          label: 'Tous' },
              { val: 'avec avance', label: 'Avec avance' },
              { val: 'sans avance', label: 'Sans avance' },
              { val: 'tout payé',   label: 'Tout payé' },
            ] as const).map(f => (
              <button
                key={f.val ?? 'tous'}
                type="button"
                className={`lr-filtre-btn ${filtrePaiement === f.val ? 'lr-filtre-btn--actif' : ''}`}
                onClick={() => setFiltrePaiement(f.val)}
              >
                {f.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── TABLEAU ── */}
      {liste.length === 0 ? (
        <p className="lr-vide">Aucune réservation trouvée.</p>
      ) : (
        <div className="lr-wrapper">
          <table className="lr-tableau">
            <thead>
              <tr>
                <th>N° Réserv.</th>
                {!masquerColonneVoiture && <th>Voiture</th>}
                <th>Client</th>
                <th className="lr-th-center">Place</th>
                <th>Date réserv.</th>
                <th>Date voyage</th>
                <th>Paiement</th>
                <th className="lr-th-right">Avance</th>
                <th className="lr-th-right">Reste</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {liste.map(r => {
                const badge = badgePayment(r.payment)
                const reste = r.fraisVoiture
                  ? (r.payment === 'tout payé' ? 0 : r.fraisVoiture - r.montantAvance)
                  : 0

                return (
                  <tr key={r.idreserv}>
                    <td className="lr-cell-id">{r.idreserv}</td>

                    {!masquerColonneVoiture && (
                      <td className="lr-cell-voiture">
                        <span className="lr-design">{r.designVoiture ?? r.idvoit}</span>
                        {r.typeVoiture && (
                          <span className={`lr-badge-type lr-badge-type--${r.typeVoiture}`}>
                            {r.typeVoiture}
                          </span>
                        )}
                      </td>
                    )}

                    <td>
                      <div className="lr-client-nom">{r.nomClient ?? `Client #${r.idcli}`}</div>
                      {r.numtel && <div className="lr-client-tel">{r.numtel}</div>}
                    </td>

                    <td className="lr-td-center">
                      <span className="lr-place">{r.place}</span>
                    </td>

                    <td className="lr-cell-date">{formatDatetime(r.dateReserv)}</td>
                    <td className="lr-cell-date">{formatDate(r.dateVoyage)}</td>

                    <td>
                      <span
                        className="lr-badge-payment"
                        style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td className="lr-td-right">
                      {r.montantAvance > 0
                        ? <span className="lr-montant">{formatMontant(r.montantAvance)}</span>
                        : <span className="lr-tiret">—</span>}
                    </td>

                    <td className="lr-td-right">
                      {r.payment === 'tout payé'
                        ? <span className="lr-solde">Soldé</span>
                        : <span className="lr-reste" style={{ color: reste > 0 ? '#dc2626' : '#64748b' }}>
                            {reste > 0 ? formatMontant(reste) : '—'}
                          </span>}
                    </td>

                    <td>
                      <div className="lr-actions">
                        {/* ✅ FIX : on appelle handleModifier au lieu de router.push
                            pour éviter le rechargement de page qui vidait l'état */}
                        <button
                          className="lr-btn lr-btn-secondaire"
                          onClick={() => handleModifier(r.idreserv)}
                        >
                          Modifier
                        </button>
                        {onSupprimer && (
                          <button
                            className="lr-btn lr-btn-danger"
                            onClick={() => onSupprimer(r.idreserv)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}