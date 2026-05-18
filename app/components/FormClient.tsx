'use client'

import { useState, useEffect } from 'react'
import { Client } from '@/app/clients/page'
import '../globals.css'

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface Props {
  client: Client | null
  clientsExistants: Client[]
  onEnregistrer: (c: Client) => void
  onFermer: () => void
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------
export default function FormClient({ client, clientsExistants, onEnregistrer, onFermer }: Props) {
  const modeModif = client !== null

  const [formNom,    setFormNom]    = useState('')
  const [formNumtel, setFormNumtel] = useState('')
  const [erreur,     setErreur]     = useState('')

  useEffect(() => {
    if (client) {
      setFormNom(client.nom)
      setFormNumtel(client.numtel)
    } else {
      setFormNom('')
      setFormNumtel('')
    }
    setErreur('')
  }, [client])

  function enregistrer() {
    if (!formNom.trim()) {
      setErreur('Le nom est obligatoire.')
      return
    }
    if (!formNumtel.trim()) {
      setErreur('Le numéro de téléphone est obligatoire.')
      return
    }
    const chiffres = formNumtel.replace(/\s/g, '')
    if (chiffres.length !== 10 || !/^\d+$/.test(chiffres)) {
      setErreur('Le numéro de téléphone doit contenir exactement 10 chiffres.')
      return
    }

    const c: Client = {
      // En mode création, idcli est assigné par le backend — on passe une string vide
      idcli:  modeModif ? client!.idcli : '',
      nom:    formNom.trim(),
      numtel: formNumtel.trim(),
    }
    onEnregistrer(c)
  }

  return (
    <div className="form-client-overlay" onClick={onFermer}>
      <div className="form-client-popup" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="form-client-header">
          <span className="form-client-titre">
            {modeModif ? `Modifier — ${client!.nom}` : 'Nouveau client'}
          </span>
          <button className="form-client-btn-close" onClick={onFermer}>✕</button>
        </div>

        {/* Nom */}
        <div className="form-client-champ">
          <label className="form-client-label">Nom complet *</label>
          <input
            className="form-client-input"
            type="text"
            value={formNom}
            onChange={e => setFormNom(e.target.value)}
            placeholder="Ex : Rakoto Madison"
          />
        </div>

        {/* Téléphone */}
        <div className="form-client-champ">
          <label className="form-client-label">Numéro de téléphone *</label>
          <input
            className="form-client-input"
            type="text"
            value={formNumtel}
            onChange={e => setFormNumtel(e.target.value)}
            placeholder="Ex : 034 33 888 12"
          />
        </div>

        {/* Erreur */}
        {erreur && (
          <p className="form-client-erreur">{erreur}</p>
        )}

        {/* Actions */}
        <div className="form-client-actions">
          <button className="form-client-btn-annuler" onClick={onFermer}>
            Annuler
          </button>
          <button className="form-client-btn-enregistrer" onClick={enregistrer}>
            Enregistrer
          </button>
        </div>

      </div>
    </div>
  )
}