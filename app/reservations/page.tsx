'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './reservation.module.css'

import SearchClient from '../components/SearchClient'
import GrillePlaces from '../components/GrillePlaces'
import ListeReservations from '../components/ListeReservations'
import FormClient from '../components/FormClient'
import { genererRecu } from '../components/ReservationRecu'

import { Client } from '@/app/clients/page'
import { Voiture, TypeVoiture } from '@/app/voitures/page'
import '../globals.css'

// ---------------------------------------------------------------------------
// DONNÉES MOCKÉES
// ---------------------------------------------------------------------------
const CLIENTS_INIT: Client[] = [
  { idcli: 1, nom: 'Rakoto Madison',     numtel: '034 33 888 12' },
  { idcli: 2, nom: 'Rabe Sylvie',        numtel: '033 12 456 78' },
  { idcli: 3, nom: 'Randria Jean',       numtel: '032 99 111 22' },
  { idcli: 4, nom: 'Rakotondrabe Luc',   numtel: '034 55 777 33' },
]

const VOITURES_INIT: Voiture[] = [
  { idvoit: 'V01', design: 'Toyota Hiace',        type: 'simple',  nbrplace: 15, frais: 50000  },
  { idvoit: 'V02', design: 'Mercedes Vito',        type: 'premium', nbrplace: 12, frais: 80000  },
  { idvoit: 'V03', design: 'Toyota Land Cruiser',  type: 'vip',     nbrplace:  9, frais: 120000 },
  { idvoit: 'V04', design: 'Nissan Urvan',         type: 'simple',  nbrplace: 15, frais: 45000  },
]

export interface Reservation {
  idreserv: string
  idvoit: string
  idcli: number
  place: number
  dateReserv: string
  datevoyage: string
  heure: '7h Matin' | '7h Soir'
  payment: 'sans avance' | 'avec avance' | 'tout payé'
  montantAvance: number
}

const RESERVATIONS_INIT: Reservation[] = [
  {
    idreserv: 'R001', idvoit: 'V01', idcli: 1, place: 2,
    dateReserv: '2025-05-01 08:00:00', datevoyage: '2025-05-20',
    heure: '7h Matin', payment: 'avec avance', montantAvance: 20000,
  },
  {
    idreserv: 'R002', idvoit: 'V01', idcli: 2, place: 4,
    dateReserv: '2025-05-02 09:00:00', datevoyage: '2025-05-20',
    heure: '7h Soir', payment: 'tout payé', montantAvance: 50000,
  },
  {
    idreserv: 'R003', idvoit: 'V02', idcli: 3, place: 1,
    dateReserv: '2025-05-03 10:00:00', datevoyage: '2025-05-22',
    heure: '7h Matin', payment: 'sans avance', montantAvance: 0,
  },
]

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function genId(reservations: Reservation[]): string {
  const nums = reservations.map(r => parseInt(r.idreserv.replace('R', ''), 10))
  const max  = nums.length ? Math.max(...nums) : 0
  return `R${String(max + 1).padStart(3, '0')}`
}

function formatDateAffichage(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
  return `${parseInt(d)} ${mois[parseInt(m) - 1]} ${y}`
}

/** Vérifie si une voiture est bloquée à une date donnée (fenêtre J-2 / J+2) */
function voitureBloquee(idvoit: string, datevoyage: string, reservations: Reservation[], idreservExclu?: string): boolean {
  if (!datevoyage) return false
  const cible = new Date(datevoyage).getTime()
  return reservations.some(r => {
    if (r.idvoit !== idvoit) return false
    if (idreservExclu && r.idreserv === idreservExclu) return false
    const rv = new Date(r.datevoyage).getTime()
    const diff = Math.abs(cible - rv) / (1000 * 60 * 60 * 24)
    return diff <= 2
  })
}

/** Places occupées pour une voiture à une date de voyage donnée */
function placesOccupeesVoiture(idvoit: string, datevoyage: string, reservations: Reservation[], idreservExclu?: string): number[] {
  return reservations
    .filter(r => r.idvoit === idvoit && r.datevoyage === datevoyage && r.idreserv !== idreservExclu)
    .map(r => r.place)
}

// ---------------------------------------------------------------------------
// ÉTAT FORMULAIRE
// ---------------------------------------------------------------------------
interface FormState {
  datevoyage: string
  heure: '7h Matin' | '7h Soir' | ''
  client: Client | null
  typeVoiture: TypeVoiture | ''
  voiture: Voiture | null
  place: number | null
  payment: 'sans avance' | 'avec avance' | 'tout payé' | ''
  montantAvance: number
}

const FORM_VIDE: FormState = {
  datevoyage: '', heure: '', client: null,
  typeVoiture: '', voiture: null, place: null,
  payment: '', montantAvance: 0,
}

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------
export default function PageReservation() {
  const searchParams = useSearchParams()

  const [clients,      setClients]      = useState<Client[]>(CLIENTS_INIT)
  const [reservations, setReservations] = useState<Reservation[]>(RESERVATIONS_INIT)

  // Formulaire
  const [form,         setForm]         = useState<FormState>(FORM_VIDE)
  const [enEdition,    setEnEdition]    = useState<string | null>(null)
  const [erreur,       setErreur]       = useState<string>('')

  // Popup ajout client rapide
  const [popupClient,  setPopupClient]  = useState(false)

  // Filtre liste
  const [filtrePaiement, setFiltrePaiement] = useState<'sans avance' | 'avec avance' | 'tout payé' | null>(null)
  const [filtreClient,   setFiltreClient]   = useState<Client | null>(null)

  // Voitures disponibles selon date + type + fenêtre J-2/J+2
  const voituresDispo = useMemo<Voiture[]>(() => {
    if (!form.datevoyage || !form.typeVoiture) return []

    const duBonType = VOITURES_INIT.filter(v => v.type === form.typeVoiture)

    // Chercher si une voiture est déjà reservée à cette date exacte (même datevoyage)
    const voitureDejaReserveeDate = reservations.find(
      r => r.datevoyage === form.datevoyage && r.idreserv !== enEdition
    )

    if (voitureDejaReserveeDate) {
      // On force cette voiture si elle est du bon type
      const forcee = duBonType.find(v => v.idvoit === voitureDejaReserveeDate.idvoit)
      return forcee ? [forcee] : []
    }

    // Sinon, exclure les voitures bloquées par la fenêtre J-2/J+2
    return duBonType.filter(v => !voitureBloquee(v.idvoit, form.datevoyage, reservations, enEdition ?? undefined))
  }, [form.datevoyage, form.typeVoiture, reservations, enEdition])

  // Places occupées de la voiture choisie à cette date
  const occupees = useMemo<number[]>(() => {
    if (!form.voiture || !form.datevoyage) return []
    return placesOccupeesVoiture(form.voiture.idvoit, form.datevoyage, reservations, enEdition ?? undefined)
  }, [form.voiture, form.datevoyage, reservations, enEdition])

  // Frais affiché
  const frais = form.voiture?.frais ?? 0
  const reste = frais - form.montantAvance

  // ---------------------------------------------------------------------------
  // CHARGER EN ÉDITION (via ?edit=R001)
  // ---------------------------------------------------------------------------
  useMemo(() => {
    const editId = searchParams.get('edit')
    if (!editId || enEdition === editId) return
    const r = reservations.find(x => x.idreserv === editId)
    if (!r) return
    const client  = clients.find(c => c.idcli === r.idcli) ?? null
    const voiture = VOITURES_INIT.find(v => v.idvoit === r.idvoit) ?? null
    setEnEdition(editId)
    setForm({
      datevoyage:    r.datevoyage,
      heure:         r.heure,
      client,
      typeVoiture:   voiture?.type ?? '',
      voiture,
      place:         r.place,
      payment:       r.payment,
      montantAvance: r.montantAvance,
    })
  }, [searchParams]) // eslint-disable-line

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
  // ENREGISTRER
  // ---------------------------------------------------------------------------
  function handleEnregistrer() {
    if (!form.datevoyage)  return setErreur('Choisissez une date de voyage.')
    if (!form.heure)       return setErreur('Choisissez une heure (7h Matin ou 7h Soir).')
    if (!form.client)      return setErreur('Sélectionnez un client.')
    if (!form.typeVoiture) return setErreur('Choisissez un type de voiture.')
    if (!form.voiture)     return setErreur('Choisissez une voiture.')
    if (!form.place)       return setErreur('Choisissez une place.')
    if (!form.payment)     return setErreur('Choisissez un mode de paiement.')
    if (form.payment === 'avec avance' && form.montantAvance <= 0)
      return setErreur('Entrez le montant de l\'avance.')

    const now = new Date()
    const dateReserv = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`

    const nouvelleReserv: Reservation = {
      idreserv:      enEdition ?? genId(reservations),
      idvoit:        form.voiture.idvoit,
      idcli:         form.client.idcli,
      place:         form.place,
      dateReserv,
      datevoyage:    form.datevoyage,
      heure:         form.heure as '7h Matin' | '7h Soir',
      payment:       form.payment as Reservation['payment'],
      montantAvance: form.montantAvance,
    }

    if (enEdition) {
      setReservations(rs => rs.map(r => r.idreserv === enEdition ? nouvelleReserv : r))
    } else {
      setReservations(rs => [...rs, nouvelleReserv])
    }

    // Générer le PDF
    genererRecu(
      {
        idreserv:      nouvelleReserv.idreserv,
        idvoit:        nouvelleReserv.idvoit,
        idcli:         nouvelleReserv.idcli,
        place:         nouvelleReserv.place,
        dateReserv:    nouvelleReserv.dateReserv,
        datevoyage:    nouvelleReserv.datevoyage,
        payment:       nouvelleReserv.payment,
        montantAvance: nouvelleReserv.montantAvance,
      },
      { nom: form.client.nom, numtel: form.client.numtel },
      { frais: form.voiture.frais, type: form.voiture.type },
    )

    // Reset
    setForm(FORM_VIDE)
    setEnEdition(null)
    setErreur('')
  }

  function handleAnnulerEdition() {
    setForm(FORM_VIDE)
    setEnEdition(null)
    setErreur('')
    window.history.replaceState({}, '', '/reservation')
  }

  function handleSupprimerReservation(idreserv: string) {
    setReservations(rs => rs.filter(r => r.idreserv !== idreserv))
  }

  // Ajout client rapide
  function handleAjoutClientRapide(client: Client) {
    setClients(cs => [...cs, client])
    setChamp('client', client)
    setPopupClient(false)
  }

  // Filtre liste + enrichissement pour ListeReservations (champs dénormalisés)
  const reservationsFiltrees = useMemo(() => {
    return reservations
      .filter(r => {
        if (filtrePaiement && r.payment !== filtrePaiement) return false
        if (filtreClient   && r.idcli   !== filtreClient.idcli) return false
        return true
      })
      .map(r => {
        const client  = clients.find(c => c.idcli  === r.idcli)
        const voiture = VOITURES_INIT.find(v => v.idvoit === r.idvoit)
        return {
          ...r,
          dateVoyage:    r.datevoyage,   // ListeReservations attend dateVoyage (camelCase)
          nomClient:     client?.nom,
          numtel:        client?.numtel,
          fraisVoiture:  voiture?.frais,
          designVoiture: voiture?.design,
          typeVoiture:   voiture?.type,
        }
      })
  }, [reservations, filtrePaiement, filtreClient, clients])

  // ---------------------------------------------------------------------------
  // RENDU
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.page}>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.titre}>Réservations</h1>
          <p className={styles.sousTitre}>
            {reservations.length} réservation{reservations.length > 1 ? 's' : ''} enregistrée{reservations.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOC FORMULAIRE + GRILLE CÔTE À CÔTE
      ══════════════════════════════════════════════════════════════════════ */}
      <div className={styles.blocs}>

        {/* ── FORMULAIRE ── */}
        <div className={styles.formulaire}>
          <div className={styles.formulaireTitre}>
            {enEdition ? `Modifier — ${enEdition}` : 'Nouvelle réservation'}
          </div>

          {/* ── 1. DATE ── */}
          <div className={styles.champ}>
            <label className={styles.label}>Date du voyage</label>
            <input
              type="date"
              className={styles.input}
              value={form.datevoyage}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => {
                setForm(f => ({ ...f, datevoyage: e.target.value, voiture: null, place: null }))
                setErreur('')
              }}
            />
          </div>

          {/* ── 2. HEURE ── */}
          <div className={styles.champ}>
            <label className={styles.label}>Heure de départ</label>
            <div className={styles.heureButtons}>
              {(['7h Matin', '7h Soir'] as const).map(h => (
                <button
                  key={h}
                  type="button"
                  className={`${styles.heureBtn} ${form.heure === h ? styles.heureBtnActif : ''}`}
                  onClick={() => setChamp('heure', h)}
                >
                  {h === '7h Matin' ? '🌅 7h Matin' : '🌆 7h Soir'}
                </button>
              ))}
            </div>
          </div>

          {/* ── 3. CLIENT ── */}
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

          {/* ── 4. TYPE VOITURE ── */}
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

          {/* ── 5. VOITURE ── */}
          {form.typeVoiture && (
            <div className={styles.champ}>
              <label className={styles.label}>
                Voiture
                {!form.datevoyage && <span className={styles.labelHint}> — choisissez d'abord une date</span>}
              </label>
              {form.datevoyage ? (
                voituresDispo.length === 0 ? (
                  <div className={styles.alerteBloc}>
                    Aucune voiture disponible pour ce type et cette date (fenêtre J-2/J+2).
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

          {/* ── 6. PAIEMENT ── */}
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

          {/* ── ERREUR ── */}
          {erreur && <div className={styles.erreur}>{erreur}</div>}

          {/* ── ACTIONS ── */}
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
            >
              {enEdition ? '💾 Enregistrer les modifications' : '✓ Enregistrer + Générer reçu PDF'}
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

      

      {/* ══════════════════════════════════════════════════════════════════════
          LISTE RÉSERVATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      <ListeReservations
        reservations={reservationsFiltrees}
        clients={clients}
        onSupprimer={handleSupprimerReservation}
      />

      {/* ══════════════════════════════════════════════════════════════════════
          POPUP AJOUT CLIENT RAPIDE
      ══════════════════════════════════════════════════════════════════════ */}
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