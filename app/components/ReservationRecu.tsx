import jsPDF from 'jspdf'

interface ReservationData {
  idreserv: string
  idvoit: string
  idcli: number
  place: number
  dateReserv: string
  datevoyage: string
  payment: string
  montantAvance: number
}

interface ClientData {
  nom: string
  numtel: string
}

interface VoitureData {
  frais: number
  type: string
}

export function genererRecu(
  r: ReservationData,
  client: ClientData,
  voiture: VoitureData,
) {
  const reste = voiture.frais - r.montantAvance
  const doc = new jsPDF()
  let y = 20
  const ligne = (t: string) => {
    doc.text(t, 20, y)
    y += 9
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  ligne(`Reçu N°${r.idreserv}`)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  y += 4
  ligne(`Date de réservation : ${r.dateReserv}`)
  ligne(`Date du voyage      : ${r.datevoyage}`)
  y += 4
  ligne(`Nom du Client : ${client.nom} / Contact : ${client.numtel}`)
  ligne(`Voiture N°${r.idvoit} / Type : ${voiture.type} / Place : ${r.place}`)
  y += 4
  ligne(`Frais          : ${voiture.frais.toLocaleString()} Ar`)
  ligne(`Paiement       : ${r.payment}`)
  ligne(`Montant Avance : ${r.montantAvance.toLocaleString()} Ar / Reste : ${reste.toLocaleString()} Ar`)
  doc.save(`recu-${r.idreserv}.pdf`)
}