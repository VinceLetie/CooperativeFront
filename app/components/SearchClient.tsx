'use client'

import { useState, useRef, useEffect } from 'react'
import { Client } from '@/app/clients/page'

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface Props {
  clients: Client[]
  onSelectionner: (client: Client) => void
  placeholder?: string
  // Mode réservation : affiche client sélectionné + bouton changer
  avecSelection?: boolean
  clientSelectionne?: Client | null
  onChanger?: () => void
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------
export default function SearchClient({
  clients,
  onSelectionner,
  placeholder = 'Rechercher un client...',
  avecSelection = false,
  clientSelectionne = null,
  onChanger,
}: Props) {
  const [recherche, setRecherche]     = useState('')
  const [listeOuverte, setListeOuverte] = useState(false)
  const refContainer                   = useRef<HTMLDivElement>(null)

  // Fermer si clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (refContainer.current && !refContainer.current.contains(e.target as Node)) {
        setListeOuverte(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const clientsFiltres = clients.filter(c => {
    if (!recherche) return true
    const q = recherche.toLowerCase()
    return c.nom.toLowerCase().includes(q) || c.numtel.includes(q)
  })

  function selectionner(client: Client) {
    onSelectionner(client)
    setRecherche('')
    setListeOuverte(false)
  }

  // ── Mode avec sélection (réservation) : affiche encadré si client choisi ──
  if (avecSelection && clientSelectionne) {
    return (
      <div className="search-client-selectionne">
        <span className="search-client-selectionne-info">
          ✓ {clientSelectionne.nom} — {clientSelectionne.numtel}
        </span>
        <button className="search-client-btn-changer" onClick={onChanger}>
          Changer
        </button>
      </div>
    )
  }

  return (
    <div className="search-client-container" ref={refContainer}>
      <input
        className="search-client-input"
        type="text"
        value={recherche}
        placeholder={placeholder}
        onChange={e => setRecherche(e.target.value)}
        onFocus={() => setListeOuverte(true)}
      />

      {listeOuverte && (
        <div className="search-client-liste">
          {clientsFiltres.length === 0 ? (
            <div className="search-client-vide">Aucun client trouvé</div>
          ) : (
            clientsFiltres.map(c => (
              <div
                key={c.idcli}
                className="search-client-item"
                onMouseDown={() => selectionner(c)}
              >
                <span className="search-client-nom">{c.nom}</span>
                <span className="search-client-tel">{c.numtel}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}