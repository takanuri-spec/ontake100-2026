import { useState, useEffect } from 'react'
import { doc, orderBy, setDoc } from 'firebase/firestore'
import { useCollection, useSubCollection } from '@/hooks/useFirestore'
import { db } from '@/lib/firebase'
import { parseGpx } from '@/lib/gpx'
import type { ParsedGpx } from '@/lib/gpx'
import { CourseMap } from '@/components/CourseMap'
import { RacePlanTable } from '@/components/RacePlanTable'
import type { Checkpoint } from '@/components/RacePlanTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Race {
  id: string; name: string; date: string; distanceKm: number
  elevationGainM: number; cutoffMinutes: number; type: string
  location: string
  baselineTime?: string; targetTime?: string
}
interface AidStation {
  id: string; distanceKm: number; name: string
  cutoffFromStartMin: number; hasDropBag: boolean; items: string[]
}
interface PackingItem { id: string; name: string; category: string }
interface Trip {
  id: string; raceId: string; notes?: string
  rentalCar?: { reservation: string; departure: string; shop: string }
  hotel?: { name: string; reservation: string }
  dropBagContents?: string[]
  packingList: PackingItem[]
  checkedItems?: Record<string, boolean>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GPX_URL: Record<string, string> = {
  'ontake100-2026': '/gpx/ontake100.gpx',
  'sim-toki-river': '/gpx/toki-river.gpx',
  'sim-hinohara':   '/gpx/hinohara.gpx',
}

const RACE_LABEL: Record<string, string> = {
  'ontake100-2026': 'Ontake 100',
  'sim-toki-river': 'Toki River',
  'sim-hinohara':   'Hinohara',
}

// Start offset from midnight (min). Ontake = midnight start.
const START_OFFSET: Record<string, number> = {
  'ontake100-2026': 0,
  'sim-toki-river': 0,
  'sim-hinohara':   0,
}

const CATEGORY_LABEL: Record<string, string> = {
  mandatory: '必携', nutrition: '補給', navigation: 'ナビ',
  medical: '医療', clothing: '衣類', other: 'その他',
}

// ─── Race card ────────────────────────────────────────────────────────────────

function RaceCard({ race }: { race: Race }) {
  const cutoffH = (race.cutoffMinutes / 60).toFixed(1).replace('.0', '')
  return (
    <div className={`rounded-xl p-4 border ${
      race.type === 'target'
        ? 'border-emerald-700 bg-emerald-950/40'
        : 'border-stone-700 bg-stone-900'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {race.type === 'target'
              ? <span className="text-xs bg-emerald-500 text-black font-bold px-2 py-0.5 rounded">TARGET</span>
              : <span className="text-xs bg-blue-700 text-white font-bold px-2 py-0.5 rounded">SIM</span>}
            <span className="font-semibold text-sm">{race.name}</span>
          </div>
          <p className="text-stone-400 text-xs mt-1">{race.date} | {race.location}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-emerald-400 font-bold">{race.distanceKm}km</div>
          <div className="text-stone-400 text-xs">+{race.elevationGainM.toLocaleString()}m</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-stone-700/50 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-400">
        <div>制限: <span className="text-stone-200">{cutoffH}h</span></div>
        {race.baselineTime && <div>2022実績: <span className="text-emerald-300">{race.baselineTime}</span></div>}
        {race.targetTime   && <div>目標: <span className="text-emerald-300">{race.targetTime}</span></div>}
      </div>
    </div>
  )
}

// ─── Packing list ─────────────────────────────────────────────────────────────

function TripCard({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const checked = trip.checkedItems ?? {}
  const total = trip.packingList.length
  const checkedCount = trip.packingList.filter(i => checked[i.id]).length
  const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0

  const toggle = async (itemId: string) => {
    if (toggling) return
    setToggling(itemId)
    try {
      await setDoc(doc(db, 'trips', trip.id), { checkedItems: { [itemId]: !checked[itemId] } }, { merge: true })
    } finally { setToggling(null) }
  }

  const byCategory = trip.packingList.reduce<Record<string, PackingItem[]>>((acc, item) => {
    ;(acc[item.category] ??= []).push(item)
    return acc
  }, {})

  const raceName = RACE_LABEL[trip.raceId] ?? trip.raceId

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{raceName}</div>
          {trip.notes && <div className="text-stone-500 text-xs truncate mt-0.5">{trip.notes}</div>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`text-sm font-bold ${pct === 100 ? 'text-emerald-400' : 'text-stone-300'}`}>
            {checkedCount}/{total}
          </div>
          <span className="text-stone-500 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      <div className="h-1 bg-stone-800">
        <div
          className={`h-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {open && (
        <div className="border-t border-stone-700/50 p-4 space-y-4">
          {(trip.rentalCar || trip.hotel) && (
            <div className="space-y-1.5 text-xs text-stone-400">
              {trip.rentalCar && (
                <div className="bg-stone-800 rounded-lg px-3 py-2">
                  🚗 日産レンタカー{' '}
                  <span className="text-stone-200">{trip.rentalCar.reservation}</span>
                  {' — '}
                  {new Date(trip.rentalCar.departure).toLocaleString('ja-JP', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}発
                  <span className="text-stone-500"> ({trip.rentalCar.shop})</span>
                </div>
              )}
              {trip.hotel && (
                <div className="bg-stone-800 rounded-lg px-3 py-2">
                  🏨 {trip.hotel.name}{' '}
                  <span className="text-stone-200">#{trip.hotel.reservation}</span>
                </div>
              )}
            </div>
          )}
          {trip.dropBagContents && trip.dropBagContents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-400 mb-1.5">ドロップバッグ (CP1 54km)</div>
              <div className="flex flex-wrap gap-1">
                {trip.dropBagContents.map((item, i) => (
                  <span key={i} className="text-xs bg-amber-950/40 border border-amber-800/50 text-amber-200 px-2 py-0.5 rounded">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                {CATEGORY_LABEL[cat] ?? cat}
              </div>
              <div className="space-y-1">
                {items.map(item => {
                  const isChecked = checked[item.id] === true
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      disabled={toggling === item.id}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        isChecked
                          ? 'bg-emerald-950/40 border border-emerald-800/40'
                          : 'bg-stone-800 border border-transparent hover:border-stone-600'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-stone-600 bg-stone-700'
                      }`}>
                        {isChecked && <span className="text-white text-xs leading-none">✓</span>}
                      </span>
                      <span className={`text-sm flex-1 ${isChecked ? 'text-stone-500 line-through' : 'text-stone-200'}`}>
                        {item.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Course section (GPX map + race plan) ────────────────────────────────────

interface CourseSectionProps {
  raceId: string
  aids: AidStation[]   // empty for sim races
  aidsLoading: boolean
}

function CourseSection({ raceId, aids, aidsLoading }: CourseSectionProps) {
  const [gpx, setGpx] = useState<ParsedGpx | null>(null)
  const [gpxLoading, setGpxLoading] = useState(false)
  const [gpxError, setGpxError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || gpx || gpxLoading) return
    const url = GPX_URL[raceId]
    if (!url) return
    setGpxLoading(true)
    parseGpx(url)
      .then(parsed => { setGpx(parsed); setGpxLoading(false) })
      .catch(e => { setGpxError(String(e)); setGpxLoading(false) })
  }, [open, raceId, gpx, gpxLoading])

  // Build checkpoints: Start + aid stations
  const checkpoints: Checkpoint[] = aidsLoading
    ? []
    : [
        { id: 'start', name: 'スタート', distKm: 0, cutoffFromStartMin: 0 },
        ...aids.map(a => ({
          id: a.id,
          name: a.name,
          distKm: a.distanceKm,
          cutoffFromStartMin: a.cutoffFromStartMin,
        })),
      ]

  // For sim races without Firestore aid data, use Start + Finish only
  const simCheckpoints: Checkpoint[] = gpx
    ? [
        { id: 'start', name: 'スタート', distKm: 0, cutoffFromStartMin: 0 },
        { id: 'finish', name: 'フィニッシュ', distKm: parseFloat(gpx.totalDistKm.toFixed(1)), cutoffFromStartMin: 0 },
      ]
    : []

  const effectiveCheckpoints = aids.length > 0 ? checkpoints : simCheckpoints

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-200 transition-colors py-1"
      >
        <span className="text-stone-600">{open ? '▲' : '▼'}</span>
        コース詳細 / レースプラン
      </button>

      {open && (
        <div className="mt-3 space-y-6">
          {gpxLoading && (
            <div className="text-stone-600 text-sm text-center py-6">GPX 読み込み中…</div>
          )}
          {gpxError && (
            <div className="text-red-400 text-sm text-center py-4">GPX 読み込みエラー: {gpxError}</div>
          )}

          {gpx && (
            <>
              {/* Map + elevation profile */}
              <div>
                <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                  コースマップ・高低図
                </h3>
                <CourseMap
                  gpx={gpx}
                  aids={aids.map(a => ({ distanceKm: a.distanceKm, name: a.name }))}
                />
              </div>

              {/* Race plan table */}
              {effectiveCheckpoints.length >= 2 && (
                <div>
                  <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                    レースプラン
                  </h3>
                  <RacePlanTable
                    raceId={raceId}
                    checkpoints={effectiveCheckpoints}
                    points={gpx.points}
                    startOffsetMin={START_OFFSET[raceId] ?? 0}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RaceBible() {
  const { data: races, loading: racesLoading }  = useCollection<Race>('races', orderBy('date'))
  const { data: ontakeAids, loading: aidsLoading } = useSubCollection<AidStation>(
    'races/ontake100-2026', 'aidStations', orderBy('distanceKm'),
  )
  const { data: trips, loading: tripsLoading } = useCollection<Trip>('trips', orderBy('raceId'))

  const RACE_IDS = ['ontake100-2026', 'sim-toki-river', 'sim-hinohara'] as const

  const getAids = (raceId: string) => raceId === 'ontake100-2026' ? ontakeAids : []
  const getAidsLoading = (raceId: string) => raceId === 'ontake100-2026' ? aidsLoading : false

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-emerald-400 mb-1">レース聖典</h1>
        <p className="text-stone-400 text-sm">コース・エイド・旅程・装備</p>
      </section>

      {/* Race cards + course details per race */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">3レース</h2>
        {racesLoading ? (
          <div className="text-stone-600 text-sm py-4 text-center">読み込み中…</div>
        ) : (
          races.map((r: Race) => (
            <div key={r.id} className="space-y-3">
              <RaceCard race={r} />
              {RACE_IDS.includes(r.id as typeof RACE_IDS[number]) && (
                <div className="pl-2 border-l border-stone-800">
                  <CourseSection
                    raceId={r.id}
                    aids={getAids(r.id)}
                    aidsLoading={getAidsLoading(r.id)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* Packing list */}
      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">旅程・持ち物チェック</h2>
        {tripsLoading ? (
          <div className="text-stone-600 text-sm py-4 text-center">読み込み中…</div>
        ) : (
          <div className="space-y-3">
            {trips.map((t: Trip) => <TripCard key={t.id} trip={t} />)}
          </div>
        )}
      </section>
    </div>
  )
}
