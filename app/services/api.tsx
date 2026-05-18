// ============================================================
// api.ts — Service API pour le backend Spring Boot
// Base URL : http://localhost:8080
// ============================================================

const BASE_URL = 'http://localhost:8080'

// ============================================================
// TYPES
// ============================================================

export type TypeVoiture = 'SIMPLE' | 'PREMIUM' | 'VIP'
export type Paiement = 'SANS_AVANCE' | 'AVEC_AVANCE' | 'TOUT_PAYE'

export interface Voiture {
  idvoit: string
  design: string
  type: TypeVoiture
  nbrplace: number
  frais: number
}

export interface Client {
  idcli: string
  nom: string
  numtel: string
}

export interface Place {
  id: {
    idvoit: string
    place: number
  }
  voiture: Voiture
  occupation: boolean
}

export interface Reservation {
  idreserv: string
  idvoit: string
  idcli: string
  place: number
  dateReserv: string
  dateVoyage: string
  payment: Paiement
  montantAvance: number
}

export interface ApiError {
  timestamp: string
  status: number
  error: string
  message: string
}

// ============================================================
// HELPER
// ============================================================

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error: ApiError = await response.json()
    throw new Error(error.message || `Erreur ${response.status}`)
  }

  return response.json()
}

// ============================================================
// VOITURES
// ============================================================

export const apiVoitures = {

  list: (): Promise<Voiture[]> =>
    fetchApi('/api/voitures'),

  getById: (id: string): Promise<Voiture> =>
    fetchApi(`/api/voitures/${id}`),

  create: (data: Omit<Voiture, 'idvoit'>): Promise<Voiture> =>
    fetchApi('/api/voitures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Omit<Voiture, 'idvoit'>): Promise<Voiture> =>
    fetchApi(`/api/voitures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  placesLibres: (id: string): Promise<number> =>
    fetchApi(`/api/voitures/${id}/places-libres`),
}

// ============================================================
// CLIENTS
// ============================================================

export const apiClients = {

  list: (): Promise<Client[]> =>
    fetchApi('/api/clients'),

  getById: (id: string): Promise<Client> =>
    fetchApi(`/api/clients/${id}`),

  create: (data: Omit<Client, 'idcli'>): Promise<Client> =>
    fetchApi('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Omit<Client, 'idcli'>): Promise<Client> =>
    fetchApi(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  search: (q: string): Promise<Client[]> =>
    fetchApi(`/api/clients/recherche?q=${encodeURIComponent(q)}`),
}

// ============================================================
// PLACES
// ============================================================

export const apiPlaces = {

  list: (): Promise<Place[]> =>
    fetchApi('/api/places'),

  listByVoiture: (idvoit: string): Promise<Place[]> =>
    fetchApi(`/api/places/${idvoit}`),

  listLibres: (): Promise<Place[]> =>
    fetchApi('/api/places/libres'),

  listOccupees: (): Promise<Place[]> =>
    fetchApi('/api/places/occupees'),

  occuper: (idvoit: string, numeroPlace: number): Promise<Place> =>
    fetchApi(`/api/places/${idvoit}/${numeroPlace}/occuper`, {
      method: 'PUT',
    }),

  liberer: (idvoit: string, numeroPlace: number): Promise<Place> =>
    fetchApi(`/api/places/${idvoit}/${numeroPlace}/liberer`, {
      method: 'PUT',
    }),
}

// ============================================================
// RESERVATIONS
// ============================================================

export interface CreateReservationData {
  idvoit: string
  idcli: string
  place: number
  dateVoyage: string
  payment: Paiement
  montantAvance: number
}

export interface UpdateReservationData {
  place: number
  dateVoyage: string
  payment: Paiement
  montantAvance: number
}

export const apiReservations = {

  list: (): Promise<Reservation[]> =>
    fetchApi('/api/reservations'),

  getById: (id: string): Promise<Reservation> =>
    fetchApi(`/api/reservations/${id}`),

  create: (data: CreateReservationData): Promise<Reservation> =>
    fetchApi('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateReservationData): Promise<Reservation> =>
    fetchApi(`/api/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  listByVoiture: (idvoit: string): Promise<Reservation[]> =>
    fetchApi(`/api/reservations/voiture/${idvoit}`),

  listByPayment: (payment: Paiement): Promise<Reservation[]> =>
    fetchApi(`/api/reservations/payment/${payment}`),

  listByVoitureAndPayment: (idvoit: string, payment: Paiement): Promise<Reservation[]> =>
    fetchApi(`/api/reservations/voiture/${idvoit}/payment/${payment}`),

  countByVoitureAndPayment: (idvoit: string, payment: Paiement): Promise<number> =>
    fetchApi(`/api/reservations/voiture/${idvoit}/payment/${payment}/count`),

  recette: (): Promise<number> =>
    fetchApi('/api/reservations/recette'),

  recuPdfUrl: (id: string): string =>
    `${BASE_URL}/api/pdf/recu/${id}`,
}