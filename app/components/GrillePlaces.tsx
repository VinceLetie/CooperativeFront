'use client'

import { TypeVoiture, Voiture } from '@/app/voitures/page'

// ---------------------------------------------------------------------------
// CONSTANTES
// ---------------------------------------------------------------------------
const PLACES_PAR_RANGEE: Record<TypeVoiture, number> = {
  simple:  5,
  premium: 4,
  vip:     3,
}

const LABEL_TYPE: Record<TypeVoiture, string> = {
  simple:  'Simple',
  premium: 'Premium',
  vip:     'VIP',
}

// ---------------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------------
interface Props {
  voiture: Voiture
  placesOccupees: number[]
  placeChoisie?: number | null
  onChoisirPlace?: (num: number) => void
  onFermer?: () => void
  /** Mode compact pour la page voiture (lecture seule, pas de sélection) */
  modeCompact?: boolean
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------
export default function GrillePlaces({
  voiture,
  placesOccupees,
  placeChoisie = null,
  onChoisirPlace,
  onFermer,
  modeCompact = false,
}: Props) {
  const placesParRangee = PLACES_PAR_RANGEE[voiture.type]
  const rangees: number[][] = []

  for (let i = 1; i <= voiture.nbrplace; i += placesParRangee) {
    rangees.push(
      Array.from(
        { length: Math.min(placesParRangee, voiture.nbrplace - i + 1) },
        (_, k) => i + k
      )
    )
  }

  const nbLibres   = voiture.nbrplace - placesOccupees.length
  const nbOccupees = placesOccupees.length

  function classePlace(num: number): string {
    const base = modeCompact ? 'gp-place gp-place--compact' : 'gp-place'
    if (placesOccupees.includes(num)) return `${base} gp-place--occupee`
    if (placeChoisie === num)          return `${base} gp-place--selectionnee`
    return `${base} gp-place--libre`
  }

  return (
    <div className={modeCompact ? 'gp-root gp-root--compact' : 'gp-root'}>

      {/* ── HEADER ── */}
      <div className="gp-header">
        <div className="gp-header-gauche">
          <span className="gp-voiture-nom">{voiture.design}</span>
          <span className={`gp-badge-type gp-badge-type--${voiture.type}`}>
            {LABEL_TYPE[voiture.type]}
          </span>
          <span className="gp-sep">·</span>
          <span className="gp-info-places">
            <span className="gp-places-libre">{nbLibres} libre{nbLibres !== 1 ? 's' : ''}</span>
            <span className="gp-places-sep">/</span>
            <span className="gp-places-total">{voiture.nbrplace} places</span>
          </span>
        </div>
        {onFermer && (
          <button className="gp-btn-fermer" onClick={onFermer}>✕</button>
        )}
      </div>

      {/* ── LÉGENDE DU COULOIR (avant/arrière) ── */}
      {!modeCompact && (
        <div className="gp-couloir">
          <div className="gp-couloir-etiquette gp-couloir-etiquette--avant">
            <span>⬆ Avant</span>
          </div>
          <div className="gp-couloir-ligne" />
          <div className="gp-couloir-etiquette gp-couloir-etiquette--arriere">
            <span>Arrière ⬇</span>
          </div>
        </div>
      )}

      {/* ── GRILLE RANGÉES ── */}
      <div className="gp-grille">
        {rangees.map((rangee, ri) => (
          <div key={ri} className="gp-rangee">
            {/* Numéro de rangée */}
            <span className="gp-rangee-num">R{ri + 1}</span>

            {/* Places */}
            <div className="gp-rangee-places">
              {rangee.map(num => {
                const occupee = placesOccupees.includes(num)
                const selectionnee = placeChoisie === num
                return (
                  <button
                    key={num}
                    className={classePlace(num)}
                    disabled={occupee}
                    onClick={() => !occupee && onChoisirPlace?.(num)}
                    title={
                      occupee       ? `Place ${num} — Occupée` :
                      selectionnee  ? `Place ${num} — Sélectionnée` :
                                      `Place ${num} — Cliquer pour sélectionner`
                    }
                  >
                    <span className="gp-place-icone">
                      {occupee ? '✕' : selectionnee ? '✓' : ''}
                    </span>
                    <span className="gp-place-num">{num}</span>
                    {!modeCompact && (
                      <span className="gp-place-statut">
                        {occupee ? 'Occupée' : selectionnee ? 'Choisie' : 'Libre'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Séparateur entre rangées */}
            {ri < rangees.length - 1 && (
              <div className="gp-rangee-sep" />
            )}
          </div>
        ))}
      </div>

      {/* ── LÉGENDE ── */}
      <div className="gp-legende">
        <div className="gp-legende-item">
          <span className="gp-legende-dot gp-legende-dot--libre" />
          <span>Libre ({nbLibres})</span>
        </div>
        <div className="gp-legende-item">
          <span className="gp-legende-dot gp-legende-dot--occupee" />
          <span>Occupée ({nbOccupees})</span>
        </div>
        {onChoisirPlace && (
          <div className="gp-legende-item">
            <span className="gp-legende-dot gp-legende-dot--selectionnee" />
            <span>Sélectionnée</span>
          </div>
        )}
        {placeChoisie && (
          <div className="gp-legende-choix">
            Place choisie : <strong>{placeChoisie}</strong>
          </div>
        )}
      </div>

    </div>
  )
}