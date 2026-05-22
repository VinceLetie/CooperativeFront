'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './reservation.module.css'

import SearchClient from '../components/SearchClient'
import GrillePlaces from '../components/GrillePlaces'
import ListeReservations from '../components/ListeReservations'
import FormClient from '../components/FormClient'

import { Client } from '@/app/clients/page'
import { Voiture, TypeVoiture } from '@/app/voitures/page'
import '../globals.css'

import {
  apiClients,
  apiVoitures,
  apiReservations,
  apiPlaces,
  Reservation as ApiReservation,
  Paiement,
  TypeVoiture as ApiTypeVoiture,
  CreateReservationData,
  UpdateReservationData,
} from '@/app/services/api'

// ---------------------------------------------------------------------------
// TYPES LOCAUX
// ---------------------------------------------------------------------------
export interface Reservation {
  idreserv: string
  idvoit: string
  idcli: string        // string (API retourne "C001")
  place: number
  dateReserv: string
  dateVoyage: string
  payment: 'sans avance' | 'avec avance' | 'tout payé'
  montantAvance: number
}

// ---------------------------------------------------------------------------
// CONVERSIONS
// ---------------------------------------------------------------------------
function mapPaiementToLocal(p: Paiement): 'sans avance' | 'avec avance' | 'tout payé' {
  switch (p) {
    case 'SANS_AVANCE': return 'sans avance'
    case 'AVEC_AVANCE': return 'avec avance'
    case 'TOUT_PAYE':   return 'tout payé'
  }
}

function mapPaiementToApi(p: 'sans avance' | 'avec avance' | 'tout payé'): Paiement {
  switch (p) {
    case 'sans avance': return 'SANS_AVANCE'
    case 'avec avance': return 'AVEC_AVANCE'
    case 'tout payé':   return 'TOUT_PAYE'
  }
}

function mapTypeToApi(t: TypeVoiture): ApiTypeVoiture {
  switch (t) {
    case 'simple':  return 'SIMPLE'
    case 'premium': return 'PREMIUM'
    case 'vip':     return 'VIP'
  }
}

function mapTypeToLocal(t: ApiTypeVoiture): TypeVoiture {
  switch (t) {
    case 'SIMPLE':  return 'simple'
    case 'PREMIUM': return 'premium'
    case 'VIP':     return 'vip'
  }
}

function mapApiReservation(r: ApiReservation): Reservation {
  return {
    idreserv:      r.idreserv,
    idvoit:        r.idvoit,
    idcli:         r.idcli,
    place:         r.place,
    dateReserv:    r.dateReserv,
    dateVoyage:    r.dateVoyage,
    payment:       mapPaiementToLocal(r.payment),
    montantAvance: r.montantAvance,
  }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function formatDateAffichage(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  return `${parseInt(d)} ${mois[parseInt(m) - 1]} ${y}`
}

function placesOccupeesVoiture(
  idvoit: string,
  dateVoyage: string,
  reservations: Reservation[],
  idreservExclu?: string
): number[] {
  return reservations
    .filter(r => r.idvoit === idvoit && r.dateVoyage === dateVoyage && r.idreserv !== idreservExclu)
    .map(r => r.place)
}

// ---------------------------------------------------------------------------
// ÉTAT FORMULAIRE
// ---------------------------------------------------------------------------
interface FormState {
  dateVoyage: string
  client: Client | null
  typeVoiture: TypeVoiture | ''
  voiture: Voiture | null
  place: number | null
  payment: 'sans avance' | 'avec avance' | 'tout payé' | ''
  montantAvance: number
}

const FORM_VIDE: FormState = {
  dateVoyage: '', client: null,
  typeVoiture: '', voiture: null, place: null,
  payment: '', montantAvance: 0,
}

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------
export default function PageReservation() {
  const searchParams = useSearchParams()

  const [clients,      setClients]      = useState<Client[]>([])
  const [voitures,     setVoitures]     = useState<Voiture[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  // Places occupées par voiture (depuis l'API /places)
  const [placesOccupeesApi, setPlacesOccupeesApi] = useState<Record<string, number[]>>({})

  const [form,         setForm]         = useState<FormState>(FORM_VIDE)
  const [enEdition,    setEnEdition]    = useState<string | null>(null)
  const [erreur,       setErreur]       = useState<string>('')
  const [saving,       setSaving]       = useState(false)

  const [popupClient,  setPopupClient]  = useState(false)

  const [filtrePaiement, setFiltrePaiement] = useState<'sans avance' | 'avec avance' | 'tout payé' | null>(null)
  const [filtreClient,   setFiltreClient]   = useState<Client | null>(null)

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
        setVoitures(voituresData.map(v => ({ ...v, type: mapTypeToLocal(v.type) })))
        setReservations(reservationsData.map(mapApiReservation))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Chargement places occupées quand une voiture est sélectionnée ─────────
  useEffect(() => {
    if (!form.voiture) return
    const idvoit = form.voiture.idvoit
    apiPlaces.listByVoiture(idvoit).then(places => {
      const occupees = places.filter(p => p.occupation).map(p => p.id.place)
      setPlacesOccupeesApi(prev => ({ ...prev, [idvoit]: occupees }))
    }).catch(console.error)
  }, [form.voiture])

  // ── Pré-remplissage en mode édition via ?edit= ────────────────────────────
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId || enEdition === editId) return

    const r = reservations.find(x => x.idreserv === editId)
    if (!r) return

    const client  = clients.find(c => c.idcli === r.idcli) ?? null
    const voiture = voitures.find(v => v.idvoit === r.idvoit) ?? null

    setEnEdition(editId)
    setForm({
      dateVoyage:    r.dateVoyage,
      client,
      typeVoiture:   voiture?.type ?? '',
      voiture,
      place:         r.place,
      payment:       r.payment,
      montantAvance: r.montantAvance,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [searchParams, reservations, clients, voitures, enEdition])

  // ── Voitures disponibles selon type + date ────────────────────────────────
  const voituresDispo = useMemo<Voiture[]>(() => {
    if (!form.dateVoyage || !form.typeVoiture) return []
    return voitures.filter(v => v.type === form.typeVoiture)
  }, [form.dateVoyage, form.typeVoiture, voitures])

  // ── Places occupées pour la grille ───────────────────────────────────────
  const occupees = useMemo<number[]>(() => {
    if (!form.voiture) return []
    // Priorité : données fraîches de l'API places
    return placesOccupeesApi[form.voiture.idvoit]
      ?? placesOccupeesVoiture(form.voiture.idvoit, form.dateVoyage, reservations, enEdition ?? undefined)
  }, [form.voiture, form.dateVoyage, reservations, enEdition, placesOccupeesApi])

  const frais = form.voiture?.frais ?? 0
  const reste = frais - form.montantAvance

  // ---------------------------------------------------------------------------
  // HANDLERS FORMULAIRE
  // ---------------------------------------------------------------------------
  function setChamp<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }))
    setErreur('')
  }

  function handleTypeVoiture(t: TypeVoiture) {
    setForm(f => ({ ...f, typeVoiture: t, voiture: null, place: null }))
  }

  function handleVoiture(v: Voiture) {
    setForm(f => ({ ...f, voiture: v, place: null }))
  }

  function handlePaiement(p: 'sans avance' | 'avec avance' | 'tout payé') {
    setForm(f => ({
      ...f,
      payment: p,
      montantAvance: p === 'sans avance' ? 0 : p === 'tout payé' ? f.voiture?.frais ?? 0 : f.montantAvance,
    }))
  }

  // ---------------------------------------------------------------------------
  // ENREGISTRER → API
  // ---------------------------------------------------------------------------
  async function handleEnregistrer() {
    if (!form.dateVoyage)  return setErreur('Choisissez une date de voyage.')
    if (!form.client)      return setErreur('Sélectionnez un client.')
    if (!form.typeVoiture) return setErreur('Choisissez un type de voiture.')
    if (!form.voiture)     return setErreur('Choisissez une voiture.')
    if (!form.place)       return setErreur('Choisissez une place.')
    if (!form.payment)     return setErreur('Choisissez un mode de paiement.')
    if (form.payment === 'avec avance' && form.montantAvance <= 0)
      return setErreur("Entrez le montant de l'avance.")

    try {
      setSaving(true)

      if (enEdition) {
        const payload: UpdateReservationData = {
          place:         form.place,
          dateVoyage:    form.dateVoyage,
          payment:       mapPaiementToApi(form.payment as 'sans avance' | 'avec avance' | 'tout payé'),
          montantAvance: form.montantAvance,
        }
        const updated = await apiReservations.update(enEdition, payload)
        setReservations(rs => rs.map(r => r.idreserv === enEdition ? mapApiReservation(updated) : r))
      } else {
        const payload: CreateReservationData = {
          idvoit:        form.voiture.idvoit,
          idcli:         form.client.idcli,
          place:         form.place,
          dateVoyage:    form.dateVoyage,
          payment:       mapPaiementToApi(form.payment as 'sans avance' | 'avec avance' | 'tout payé'),
          montantAvance: form.montantAvance,
        }
        const created = await apiReservations.create(payload)
        setReservations(rs => [...rs, mapApiReservation(created)])

        // Rafraîchir les places de la voiture après réservation
        const places = await apiPlaces.listByVoiture(form.voiture.idvoit)
        const occ = places.filter(p => p.occupation).map(p => p.id.place)
        setPlacesOccupeesApi(prev => ({ ...prev, [form.voiture!.idvoit]: occ }))

        // Ouvrir le PDF reçu dans un nouvel onglet
        window.open(apiReservations.recuPdfUrl(created.idreserv), '_blank')
      }

      setForm(FORM_VIDE)
      setEnEdition(null)
      setErreur('')
      window.history.replaceState({}, '', '/reservation')
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  function handleAnnulerEdition() {
    setForm(FORM_VIDE)
    setEnEdition(null)
    setErreur('')
    window.history.replaceState({}, '', '/reservation')
  }

  function handleGenererPdf(idreserv: string) {
    window.open(apiReservations.recuPdfUrl(idreserv), '_blank')
  }

  async function handleAjoutClientRapide(client: Client) {
    try {
      const created = await apiClients.create({ nom: client.nom, numtel: client.numtel })
      setClients(cs => [...cs, created])
      setChamp('client', created)
      setPopupClient(false)
    } catch (err) {
      console.error('Erreur ajout client rapide:', err)
    }
  }

  // ── Enrichissement pour ListeReservations ────────────────────────────────
  const reservationsFiltrees = useMemo(() => {
    return reservations
      .filter(r => {
        if (filtrePaiement && r.payment !== filtrePaiement) return false
        if (filtreClient   && r.idcli   !== filtreClient.idcli) return false
        return true
      })
      .map(r => {
        const client  = clients.find(c => c.idcli  === r.idcli)
        const voiture = voitures.find(v => v.idvoit === r.idvoit)
        return {
          ...r,
          nomClient:     client?.nom     ?? '—',
          numtel:        client?.numtel  ?? '—',
          fraisVoiture:  voiture?.frais,
          designVoiture: voiture?.design,
          typeVoiture:   voiture?.type,
        }
      })
  }, [reservations, filtrePaiement, filtreClient, clients, voitures])

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className={styles.page}>
        <p style={{ textAlign: 'center', padding: '40px' }}>Chargement...</p>
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

  return (
    <div className={styles.page}>

      {/* ── HEADER ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.titre}>Réservations</h1>
          <p className={styles.sousTitre}>
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''} enregistrée{reservations.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── FORMULAIRE + GRILLE ── */}
      <div className={styles.blocs}>

        {/* ── FORMULAIRE ── */}
        <div className={styles.formulaire}>
          <div className={styles.formulaireTitre}>
            {enEdition ? `✏️ Modifier — ${enEdition}` : 'Nouvelle réservation'}
          </div>

          {/* 1. DATE */}
          <div className={styles.champ}>
            <label className={styles.label}>Date du voyage</label>
            <input
              type="date"
              className={styles.input}
              value={form.dateVoyage}
              min={enEdition ? undefined : new Date().toISOString().split('T')[0]}
              onChange={e => {
                setForm(f => ({ ...f, dateVoyage: e.target.value, voiture: null, place: null }))
                setErreur('')
              }}
            />
          </div>

          {/* 2. CLIENT */}
          <div className={styles.champ}>
            <label className={styles.label}>Client</label>
            <div className={styles.clientRow}>
              <div className={styles.clientSearch}>
                <SearchClient
                  clients={clients}
                  onSelectionner={c => setChamp('client', c)}
                  avecSelection={true}
                  clientSelectionne={form.client}
                  onChanger={() => setChamp('client', null)}
                  placeholder="Rechercher un client..."
                />
              </div>
              <button
                type="button"
                className={styles.btnAjoutRapide}
                onClick={() => setPopupClient(true)}
                title="Ajouter un nouveau client"
              >
                + Client
              </button>
            </div>
          </div>

          {/* 3. TYPE VOITURE */}
          <div className={styles.champ}>
            <label className={styles.label}>Type de voiture</label>
            <div className={styles.typeButtons}>
              {(['simple', 'premium', 'vip'] as TypeVoiture[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.typeBtn} ${styles[`typeBtn_${t}`]} ${form.typeVoiture === t ? styles.typeBtnActif : ''}`}
                  onClick={() => handleTypeVoiture(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* 4. VOITURE */}
          {form.typeVoiture && (
            <div className={styles.champ}>
              <label className={styles.label}>
                Voiture
                {!form.dateVoyage && <span className={styles.labelHint}> — choisissez d'abord une date</span>}
              </label>
              {form.dateVoyage ? (
                voituresDispo.length === 0 ? (
                  <div className={styles.alerteBloc}>
                    Aucune voiture disponible pour ce type.
                  </div>
                ) : (
                  <div className={styles.voituresList}>
                    {voituresDispo.map(v => (
                      <button
                        key={v.idvoit}
                        type="button"
                        className={`${styles.voitureBtn} ${form.voiture?.idvoit === v.idvoit ? styles.voitureBtnActif : ''}`}
                        onClick={() => handleVoiture(v)}
                      >
                        <span className={styles.voitureBtnId}>{v.idvoit}</span>
                        <span className={styles.voitureBtnNom}>{v.design}</span>
                        <span className={styles.voitureBtnFrais}>{v.frais.toLocaleString('fr-FR')} Ar</span>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className={styles.inputDisabled}>Sélectionnez d'abord une date</div>
              )}
            </div>
          )}

          {/* 5. PAIEMENT */}
          {form.voiture && form.place && (
            <div className={styles.champ}>
              <label className={styles.label}>
                Paiement
                <span className={styles.labelFrais}> — Frais : {frais.toLocaleString('fr-FR')} Ar</span>
              </label>
              <div className={styles.paiementButtons}>
                {(['sans avance', 'avec avance', 'tout payé'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.paiementBtn} ${form.payment === p ? styles.paiementBtnActif : ''}`}
                    onClick={() => handlePaiement(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              {form.payment === 'avec avance' && (
                <div className={styles.avanceRow}>
                  <div className={styles.champInline}>
                    <label className={styles.label}>Montant avance (Ar)</label>
                    <input
                      type="number"
                      className={styles.input}
                      min={0}
                      max={frais}
                      value={form.montantAvance || ''}
                      onChange={e => setChamp('montantAvance', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div className={styles.resteInfo}>
                    Reste : <strong>{reste > 0 ? reste.toLocaleString('fr-FR') : 0} Ar</strong>
                  </div>
                </div>
              )}

              {form.payment === 'tout payé' && (
                <div className={styles.toutPayeInfo}>
                  Montant total : <strong>{frais.toLocaleString('fr-FR')} Ar</strong>
                </div>
              )}
            </div>
          )}

          {/* ERREUR */}
          {erreur && <div className={styles.erreur}>{erreur}</div>}

          {/* ACTIONS */}
          <div className={styles.actionsForm}>
            {enEdition && (
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnSecondaire}`}
                onClick={handleAnnulerEdition}
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              className={styles.btnPrincipal}
              onClick={handleEnregistrer}
              disabled={saving}
            >
              {saving
                ? 'Enregistrement...'
                : enEdition
                  ? '💾 Enregistrer les modifications'
                  : '✓ Enregistrer + Générer reçu PDF'}
            </button>
          </div>
        </div>

        {/* ── GRILLE PLACES ── */}
        <div className={styles.grilleWrapper}>
          {form.voiture ? (
            <GrillePlaces
              voiture={form.voiture}
              placesOccupees={occupees}
              placeChoisie={form.place}
              onChoisirPlace={num => setChamp('place', num)}
            />
          ) : (
            <div className={styles.grillePlaceholder}>
              <div className={styles.grillePlaceholderIcone}>🪑</div>
              <p>Sélectionnez une voiture<br />pour voir les places disponibles</p>
            </div>
          )}
        </div>

      </div>

      {/* ── LISTE RÉSERVATIONS ── */}
      <ListeReservations
        reservations={reservationsFiltrees}
        clients={clients}
        onGenererPdf={handleGenererPdf}
      />

      {/* ── POPUP AJOUT CLIENT RAPIDE ── */}
      {popupClient && (
        <FormClient
          client={null}
          clientsExistants={clients}
          onEnregistrer={handleAjoutClientRapide}
          onFermer={() => setPopupClient(false)}
        />
      )}

    </div>
  )
}