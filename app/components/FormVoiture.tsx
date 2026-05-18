'use client'

import { useState, useEffect } from 'react'
import styles from '@/app/voitures/voitures.module.css'
import { Voiture, TypeVoiture } from '@/app/voitures/page'

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface Props {
  voiture: Voiture | null
  voituresExistantes: string[]
  onEnregistrer: (v: Voiture) => void
  onFermer: () => void
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------
export default function FormVoiture({ voiture, voituresExistantes, onEnregistrer, onFermer }: Props) {
  const modeModif = voiture !== null

  const [formDesign,   setFormDesign]   = useState('')
  const [formType,     setFormType]     = useState<TypeVoiture>('simple')
  const [formNbrplace, setFormNbrplace] = useState<number>(15)
  const [formFrais,    setFormFrais]    = useState<number>(0)
  const [erreur,       setErreur]       = useState('')

  useEffect(() => {
    if (voiture) {
      setFormDesign(voiture.design)
      setFormType(voiture.type)
      setFormNbrplace(voiture.nbrplace)
      setFormFrais(voiture.frais)
    } else {
      setFormDesign('')
      setFormType('simple')
      setFormNbrplace(15)
      setFormFrais(0)
    }
    setErreur('')
  }, [voiture])

  function enregistrer() {
    if (!formDesign.trim()) {
      setErreur('La désignation est obligatoire.')
      return
    }
    if (formNbrplace < 1) {
      setErreur('Le nombre de places doit être au moins 1.')
      return
    }

    const v: Voiture = {
      // En mode création, idvoit est assigné par le backend
      idvoit:   modeModif ? voiture!.idvoit : '',
      design:   formDesign.trim(),
      type:     formType,
      nbrplace: formNbrplace,
      frais:    formFrais,
    }
    onEnregistrer(v)
  }

  return (
    <div className={styles.overlay} onClick={onFermer}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.popupHeader}>
          <span className={styles.popupTitre}>
            {modeModif ? `Modifier — ${voiture!.design}` : 'Nouvelle voiture'}
          </span>
          <button className={styles.btnClose} onClick={onFermer}>✕</button>
        </div>

        {/* Identifiant — affiché en lecture seule uniquement en modification */}
        {modeModif && (
          <div className={styles.champ}>
            <label className={styles.label}>Identifiant</label>
            <input
              className={styles.input}
              type="text"
              value={voiture!.idvoit}
              disabled
              style={{ background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }}
            />
          </div>
        )}

        {/* Désignation */}
        <div className={styles.champ}>
          <label className={styles.label}>Désignation *</label>
          <input
            className={styles.input}
            type="text"
            value={formDesign}
            onChange={e => setFormDesign(e.target.value)}
            placeholder="Ex : Toyota Hiace"
          />
        </div>

        {/* Type */}
        <div className={styles.champ}>
          <label className={styles.label}>Type *</label>
          <select
            className={styles.input}
            value={formType}
            onChange={e => setFormType(e.target.value as TypeVoiture)}
          >
            <option value="simple">Simple</option>
            <option value="premium">Premium</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        {/* Nombre de places */}
        <div className={styles.champ}>
          <label className={styles.label}>Nombre de places *</label>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={formNbrplace}
            onChange={e => setFormNbrplace(Number(e.target.value))}
          />
        </div>

        {/* Frais */}
        <div className={styles.champ}>
          <label className={styles.label}>Frais (Ar) *</label>
          <input
            className={styles.input}
            type="number"
            min={0}
            value={formFrais}
            onChange={e => setFormFrais(Number(e.target.value))}
          />
        </div>

        {/* Erreur */}
        {erreur && (
          <p style={{ fontSize: 13, color: '#ef4444', margin: '-8px 0 12px 0' }}>
            {erreur}
          </p>
        )}

        {/* Actions */}
        <div className={styles.actionsPopup}>
          <button className={`${styles.btnAction} ${styles.btnSecondaire}`} onClick={onFermer}>
            Annuler
          </button>
          <button className={`${styles.btnAction} ${styles.btnPrincipal}`} onClick={enregistrer}>
            Enregistrer
          </button>
        </div>

      </div>
    </div>
  )
}