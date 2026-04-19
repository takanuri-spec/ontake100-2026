// ─── Course / Race ───────────────────────────────────────────────────────────

export interface Race {
  id: string
  name: string
  nameJa: string
  date: string            // ISO date
  startTime: string       // "00:00"
  distanceKm: number
  elevationGainM: number
  elevationLossM: number
  cutoffMinutes: number   // total race cutoff in minutes
  location: string
  type: 'sim' | 'target'
  aidStations: AidStation[]
  segments: Segment[]
  gpxUrl?: string
}

export interface AidStation {
  id: string
  name: string
  distanceKm: number
  cutoffFromStartMin?: number
  hasDropBag: boolean
  items: string[]         // 食料・飲料リスト
  notes?: string
}

export interface Segment {
  id: string
  fromKm: number
  toKm: number
  distanceKm: number
  elevationGainM: number
  elevationLossM: number
  avgGradePct: number
  terrainType: 'road' | 'trail' | 'technical'
  sunExposure: 'shade' | 'mixed' | 'exposed'
  plannedPaceMinPerKm?: number   // Minetti GAP-adjusted
  plannedFuelGPerHour?: number
  plannedWaterMlPerHour?: number
}

// ─── Training ─────────────────────────────────────────────────────────────────

export interface TrainingDay {
  date: string            // YYYY-MM-DD
  type: 'easy' | 'long' | 'hill' | 'threshold' | 'b2b' | 'night' | 'rest' | 'race'
  plannedDistanceKm: number
  plannedElevationM: number
  plannedDurationMin: number
  plannedFuelGPerHour?: number
  notes?: string
  raceId?: string         // sim race reference
  actuals?: ActivitySummary
}

export interface ActivitySummary {
  stravaId?: string
  distanceKm: number
  elevationGainM: number
  movingTimeMin: number
  avgHR?: number
  tss?: number
  perceivedEffort?: 1 | 2 | 3 | 4 | 5
  fueling?: FuelingLog
  giSymptoms?: GISymptom[]
}

// ─── Training Load ────────────────────────────────────────────────────────────

export interface TrainingLoad {
  date: string
  ctl: number             // 42-day EWMA of TSS
  atl: number             // 7-day EWMA
  tsb: number             // CTL - ATL
  weeklyKm: number
  weeklyElevM: number
}

// ─── GI / Heat ────────────────────────────────────────────────────────────────

export interface FuelingLog {
  carbGPerHour: number
  sodiumMgPerHour: number
  waterMlPerHour: number
  products: string[]
  giSymptoms: GISymptom[]
}

export interface GISymptom {
  timestamp: number       // minutes from start
  severity: 1 | 2 | 3    // 1=mild, 2=moderate, 3=severe
  type: 'nausea' | 'bloating' | 'vomiting' | 'diarrhea' | 'cramps' | 'other'
  notes?: string
}

// ─── Travel ───────────────────────────────────────────────────────────────────

export interface Trip {
  id: string
  raceId: string
  rentalCarReservation: string    // confirmation number
  departureDateTime: string       // ISO
  returnDateTime: string
  pickupLocation: string
  hotel?: {
    name: string
    reservationNumber: string
    checkIn: string
    checkOut: string
    notes?: string
  }
  packingList: PackingItem[]
  dropBagContents?: string[]
}

export interface PackingItem {
  id: string
  name: string
  category: 'mandatory' | 'navigation' | 'clothing' | 'nutrition' | 'medical' | 'other'
  checked: boolean
  notes?: string
}

// ─── Race Day ─────────────────────────────────────────────────────────────────

export interface RaceDayChecklistItem {
  id: string
  timing: 'T-7d' | 'T-24h' | 'T-90m' | 'T-30m' | 'start' | 'every-20min' | 'every-1h' | 'climb' | 'aid' | 'late-race' | 'GI-warning'
  text: string
  checked: boolean
  critical: boolean
}
