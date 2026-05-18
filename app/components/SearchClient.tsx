'use client'

import { useState, useRef, useEffect } from 'react'
import { Client } from '@/app/clients/page'
import { apiClients } from '@/app/services/api'

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface Props {
  clients: Client[]
  onSelectionner: (client: Client) => void
  placeholder?: string
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
  const [recherche, setRecherche]       = useState('')
  const [listeOuverte, setListeOuverte] = useState(false)
  const [resultats, setResultats]       = useState<Client[]>(clients)
  const [loading, setLoading]           = useState(false)
  const refContainer                    = useRef<HTMLDivElement>(null)
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Sync résultats avec prop clients quand pas de recherche
  useEffect(() => {
    if (!recherche.trim()) setResultats(clients)
  }, [clients, recherche])

  // Recherche backend avec debounce 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!recherche.trim()) {
      setResultats(clients)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        const data = await apiClients.search(recherche.trim())
        setResultats(data)
      } catch {
        // fallback filtrage local en cas d'erreur
        const q = recherche.toLowerCase()
        setResultats(clients.filter(c =>
          c.nom.toLowerCase().includes(q) || c.numtel.includes(q)
        ))
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [recherche, clients])

  function selectionner(client: Client) {
    onSelectionner(client)
    setRecherche('')
    setListeOuverte(false)
  }

  // ── Mode avec sélection ───────────────────────────────────────────────────
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
          {loading ? (
            <div className="search-client-vide">Recherche...</div>
          ) : resultats.length === 0 ? (
            <div className="search-client-vide">Aucun client trouvé</div>
          ) : (
            resultats.map(c => (
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