import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { orderBy } from 'firebase/firestore'
import { useDoc, useCollection, useSubCollection } from '@/hooks/useFirestore'
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
  location: string; baselineTime?: string; targetTime?: string
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
interface ChecklistDoc { id: string; checkedItems?: Record<string, boolean> }

// ─── Constants ────────────────────────────────────────────────────────────────

const GPX_URL: Record<string, string> = {
  'ontake100-2026': '/gpx/ontake100.gpx',
  'sim-toki-river': '/gpx/toki-river.gpx',
  'sim-hinohara':   '/gpx/hinohara.gpx',
}

const START_OFFSET: Record<string, number> = {
  'ontake100-2026': 0,      // 00:00 start
  'sim-toki-river': 495,    // 08:15 start = 495min from midnight
  'sim-hinohara':   420,    // 07:00 start = 420min from midnight
}

const TRIP_ID: Record<string, string> = {
  'ontake100-2026': 'trip-ontake',
  'sim-toki-river': 'trip-toki-river',
  'sim-hinohara':   'trip-hinohara',
}

const RACE_URLS: Record<string, { label: string; url: string }[]> = {
  'ontake100-2026': [
    { label: 'OSJ ONTAKE 100 公式', url: 'https://www.outdoorsportsjapan.com/trail/ontake100/race-ontake100/' },
    { label: 'ITRA レース情報',      url: 'https://itra.run/Races/RaceDetails/OSJ.ONTAKE100/2026' },
  ],
  'sim-toki-river': [
    { label: 'Around Toki River 公式', url: 'https://npo-sup.org/blog/event/atr_vol04/' },
  ],
  'sim-hinohara': [
    { label: '翠夏巡嶺（ひのはら50） 公式', url: 'https://carbuncletl.wixsite.com/hinohara50/%E5%A4%A7%E4%BC%9A%E6%A6%82%E8%A6%81' },
  ],
}

const CATEGORY_LABEL: Record<string, string> = {
  mandatory: '必携', nutrition: '補給', navigation: 'ナビ',
  medical: '医療', clothing: '衣類', other: 'その他',
}

const RACE_HERO_IMG: Record<string, string> = {
  'ontake100-2026': '/images/2026-ontake100-sp.webp',
  'sim-toki-river': '/images/aroundtokiriver.jpg',
  'sim-hinohara':   '/images/suikajunnrei.avif',
}

// ─── Checklist data ───────────────────────────────────────────────────────────

const ONTAKE_TIMELINE = [
  { id: 'T-7d',  label: 'T-7日前',          prep: true,  items: ['低残渣食開始（-48h前から厳格化）', 'NSAID完全停止', 'プロバイオ継続（4週目）', '装備最終チェック（氷用バンダナ・塩タブ・ジェル・生姜）'] },
  { id: 'T-24h', label: 'T-24時間前',        prep: true,  items: ['尿比重1.010以下', '夕食: 餅・うどん・白身魚（食物繊維<10g）', 'カフェインは夕方まで'] },
  { id: 'T-90m', label: 'T-90分（22:30）',   prep: true,  items: ['お粥/餅+味噌汁（CHO 100-150g、Na 500mg）', '水500mL（Na含有）', 'アイススラリー準備'] },
  { id: 'T-30m', label: 'T-30分（23:30）',   prep: true,  items: ['プリクーリング: アイススラリー摂取', 'カフェイン 100-200mg + ジェル1本'] },
  { id: '0:00',  label: '00:00 スタート',    prep: false, items: ['最初の30分は水のみ', 'Fenix + Pixel確認', 'ポール準備'] },
  { id: 'ev20',  label: '毎20分',            prep: false, items: ['糖質 22-25g（ジェル or Drink Mix）'] },
  { id: 'ev1h',  label: '毎1時間',           prep: false, items: ['Na 800-1500mg（塩タブ確認）', '水 400-700mL（渇きベース）', '尿色・体感チェック'] },
  { id: 'climb', label: '登り入口',          prep: false, items: ['ペース-5bpm維持（即パワーハイク: 勾配10%超 or Z3上限）', '固形→液体シフト（脂質・タンパク質ゼロ）'] },
  { id: 'aid',   label: 'エイド',            prep: false, items: ['氷: キャップ・バンダナ・首へ', '濡れアームスリーブ', '塩タブ補充', 'CP1(54km): ドロップバッグ取出し・着替え確認'] },
  { id: 'late',  label: '後半（80km〜）',    prep: false, items: ['EAA/ホエイ少量 10-15g/h', 'カフェイン追加 50-100mg（眠気対策）', 'CP2(83km)関門まで1h以上あるか確認'] },
  { id: 'GI',    label: '⚠️ GI警告',        prep: false, items: ['げっぷ・膨満 → 即ハイク、固形停止、生姜', '嘔吐/下痢/冷や汗 → 5-10分休止+冷却+ORS。30分改善なし → DNF判断'] },
]

const SIM_TIMELINE = [
  { id: 'T-24h', label: 'T-24時間前',      prep: true,  items: ['低残渣食・消化の良い食事', 'NSAID完全停止', '装備チェック'] },
  { id: 'T-90m', label: 'T-90分',          prep: true,  items: ['糖質中心の食事（CHO 80-120g）', '水500mL'] },
  { id: 'T-30m', label: 'T-30分',          prep: true,  items: ['ジェル1本 + カフェイン 100mg'] },
  { id: 'ev20',  label: '毎20分',          prep: false, items: ['糖質 22-25g（ジェル or Drink Mix）'] },
  { id: 'ev1h',  label: '毎1時間',         prep: false, items: ['Na 800-1200mg', '水 400-600mL'] },
  { id: 'GI',    label: '⚠️ GI警告',      prep: false, items: ['げっぷ・膨満 → 即ハイク、固形停止', '嘔吐/下痢 → 5-10分休止+ORS'] },
]

const MUST_NOT = [
  'NSAID（イブプロフェン等）✗',
  '登りで脂質・プロテイン ✗',
  '濃いスポドリ大量 ✗',
  'のどが渇いていない時の大量飲水 ✗',
]

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'コース' | '旅程' | '持ち物' | 'チェックリスト' | 'リンク'
const TABS: Tab[] = ['コース', '旅程', '持ち物', 'チェックリスト', 'リンク']

// ─── Course tab ───────────────────────────────────────────────────────────────

interface CoursePanelProps {
  raceId: string
  aids: AidStation[]
  aidsLoading: boolean
}

function CoursePanel({ raceId, aids, aidsLoading }: CoursePanelProps) {
  const [gpx, setGpx] = useState<ParsedGpx | null>(null)
  const [gpxLoading, setGpxLoading] = useState(false)
  const [gpxError, setGpxError] = useState<string | null>(null)

  useEffect(() => {
    if (gpx || gpxLoading) return
    const url = GPX_URL[raceId]
    if (!url) return
    setGpxLoading(true)
    parseGpx(url)
      .then(parsed => { setGpx(parsed); setGpxLoading(false) })
      .catch(e => { setGpxError(String(e)); setGpxLoading(false) })
  }, [raceId, gpx, gpxLoading])

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

  // For sim races: build checkpoints from GPX waypoints if present, else Start+Finish only
  const simCheckpoints: Checkpoint[] = gpx
    ? gpx.waypoints.length > 0
      ? [
          { id: 'start', name: 'スタート', distKm: 0, cutoffFromStartMin: 0 },
          ...gpx.waypoints.map(w => ({
            id: w.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: w.name,
            distKm: parseFloat(
              (gpx.points.reduce((b, p) =>
                Math.abs(p.lat - w.lat) + Math.abs(p.lon - w.lon) <
                Math.abs(b.lat - w.lat) + Math.abs(b.lon - w.lon) ? p : b
              ).cumDist).toFixed(1)
            ),
            cutoffFromStartMin: w.cutoffMin,
          })),
        ]
      : [
          { id: 'start',  name: 'スタート',    distKm: 0, cutoffFromStartMin: 0 },
          { id: 'finish', name: 'フィニッシュ', distKm: parseFloat(gpx.totalDistKm.toFixed(1)), cutoffFromStartMin: 0 },
        ]
    : []

  const effectiveCheckpoints = aids.length > 0 ? checkpoints : simCheckpoints

  return (
    <div className="space-y-5">
      {gpxLoading && (
        <div className="text-stone-400 text-sm text-center py-10">GPX 読み込み中…</div>
      )}
      {gpxError && (
        <div className="text-red-500 text-sm text-center py-6">GPX 読み込みエラー: {gpxError}</div>
      )}
      {gpx && (
        <>
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">コースマップ・高低図</h3>
            <div className="rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
              <CourseMap
                gpx={gpx}
                aids={
                  aids.length > 0
                    ? aids.map(a => ({ distanceKm: a.distanceKm, name: a.name }))
                    : gpx.waypoints.map(w => ({
                        distanceKm: parseFloat(
                          (gpx.points.reduce((b, p) =>
                            Math.abs(p.lat - w.lat) + Math.abs(p.lon - w.lon) <
                            Math.abs(b.lat - w.lat) + Math.abs(b.lon - w.lon) ? p : b
                          ).cumDist).toFixed(1)
                        ),
                        name: w.name,
                      }))
                }
              />
            </div>
          </div>
          {effectiveCheckpoints.length >= 2 && (
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">レースプラン</h3>
              <div className="rounded-2xl overflow-hidden border border-stone-100 shadow-sm bg-white">
                <RacePlanTable
                  raceId={raceId}
                  checkpoints={effectiveCheckpoints}
                  points={gpx.points}
                  startOffsetMin={START_OFFSET[raceId] ?? 0}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Trip panel (旅程) ────────────────────────────────────────────────────────

function ItineraryPanel({ trip }: { trip: Trip | null }) {
  if (!trip) return (
    <div className="text-stone-400 text-sm py-8 text-center">旅程データなし</div>
  )
  return (
    <div className="space-y-4">
      {/* Timeline */}
      {trip.schedule && trip.schedule.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">タイムスケジュール</h4>
          <div className="space-y-2">
            {trip.schedule.map((event, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-stone-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-emerald-600 font-bold">{event.timing}</div>
                    <div className="text-sm text-stone-800 mt-1">{event.description}</div>
                    {event.mapUrl && (
                      <a href={event.mapUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                        📍 Google Maps を開く
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rental car */}
      {trip.rentalCar && (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">レンタカー</h4>
          <div className="space-y-2.5">
            <div>
              <div className="text-sm text-stone-900 font-bold">
                🚗 {trip.rentalCar.company}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                予約番号: <span className="font-mono text-emerald-600 font-bold">{trip.rentalCar.reservation}</span>
              </div>
            </div>
            <div className="text-xs text-stone-600">
              <div>📍 ピックアップ: {trip.rentalCar.pickupLocation}</div>
              {trip.rentalCar.returnLocation && trip.rentalCar.returnLocation !== trip.rentalCar.pickupLocation && (
                <div>📍 返却: {trip.rentalCar.returnLocation}</div>
              )}
            </div>
            {trip.rentalCar.phone && (
              <div className="text-xs">
                <a href={`tel:${trip.rentalCar.phone.replace(/[^0-9]/g, '')}`} className="text-blue-600 hover:underline">
                  📞 {trip.rentalCar.phone}
                </a>
              </div>
            )}
            {trip.rentalCar.mapUrl && (
              <div>
                <a href={trip.rentalCar.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">
                  📍 Google Maps を開く
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hotel */}
      {trip.hotel && (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">宿泊</h4>
          <div className="space-y-2.5">
            <div>
              <div className="text-sm text-stone-900 font-bold">
                🏨 {trip.hotel.name}
              </div>
              <div className="text-xs text-stone-400 mt-1">
                予約番号: <span className="font-mono text-emerald-600 font-bold">{trip.hotel.reservation}</span>
              </div>
            </div>
            <div className="text-xs text-stone-600">
              <div>📅 チェックイン: {trip.hotel.checkIn}</div>
              <div>📅 チェックアウト: {trip.hotel.checkOut}</div>
            </div>
            {trip.hotel.address && (
              <div className="text-xs text-stone-600">
                📍 {trip.hotel.address}
              </div>
            )}
            {trip.hotel.phone && (
              <div className="text-xs">
                <a href={`tel:${trip.hotel.phone.replace(/[^0-9]/g, '')}`} className="text-blue-600 hover:underline">
                  📞 {trip.hotel.phone}
                </a>
              </div>
            )}
            {trip.hotel.mapUrl && (
              <div>
                <a href={trip.hotel.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">
                  📍 Google Maps を開く
                </a>
              </div>
            )}
            {trip.hotel.notes && (
              <div className="text-xs text-stone-600 italic border-t border-stone-100 pt-2 mt-2">
                {trip.hotel.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drop bag */}
      {trip.dropBagContents && trip.dropBagContents.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <h4 className="text-xs font-bold text-amber-600 mb-3">ドロップバッグ (CP1 54km)</h4>
          <div className="flex flex-wrap gap-1.5">
            {trip.dropBagContents.map((item, i) => (
              <span key={i} className="text-xs bg-amber-100 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {trip.notes && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <div className="text-xs text-blue-600 font-bold mb-2">📝 メモ</div>
          <p className="text-sm text-blue-700">{trip.notes}</p>
        </div>
      )}
    </div>
  )
}

// ─── Packing panel (持ち物) ───────────────────────────────────────────────────

function PackingPanel({ trip }: { trip: Trip | null }) {
  const [toggling, setToggling] = useState<string | null>(null)

  if (!trip) return (
    <div className="text-stone-400 text-sm py-8 text-center">持ち物データなし</div>
  )

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

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-stone-700">パッキング完了</span>
            <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-stone-500'}`}>{pct}%</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className={`text-lg font-black ${pct === 100 ? 'text-emerald-600' : 'text-stone-700'}`}>
          {checkedCount}<span className="text-stone-300 font-normal text-sm">/{total}</span>
        </div>
      </div>

      {/* Categories */}
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat}>
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">
            {CATEGORY_LABEL[cat] ?? cat}
          </div>
          <div className="space-y-1.5">
            {items.map(item => {
              const isChecked = checked[item.id] === true
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  disabled={toggling === item.id}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                    isChecked
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-white border border-stone-100 hover:border-stone-200 shadow-sm'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300 bg-white'
                  }`}>
                    {isChecked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm flex-1 ${isChecked ? 'text-stone-400 line-through' : 'text-stone-800 font-medium'}`}>
                    {item.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Checklist panel ──────────────────────────────────────────────────────────

function ChecklistPanel({ raceId }: { raceId: string }) {
  const { data: checklistDoc } = useDoc<ChecklistDoc>(`raceChecklist/${raceId}`)
  const checkedItems = checklistDoc?.checkedItems ?? {}

  const timeline = raceId === 'ontake100-2026' ? ONTAKE_TIMELINE : SIM_TIMELINE
  const prepSections = timeline.filter(t => t.prep)
  const prepTotal = prepSections.reduce((acc, t) => acc + t.items.length, 0)
  const prepChecked = prepSections.reduce(
    (acc, t) => acc + t.items.filter((_, i) => checkedItems[`${t.id}-${i}`]).length, 0
  )

  const toggleItem = async (timelineId: string, idx: number) => {
    const key = `${timelineId}-${idx}`
    await setDoc(
      doc(db, 'raceChecklist', raceId),
      { checkedItems: { [key]: !checkedItems[key] } },
      { merge: true }
    )
  }

  return (
    <div className="space-y-5">
      {/* Pre-race */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">レース前 準備チェック</h3>
          <span className={`text-sm font-bold ${prepChecked === prepTotal ? 'text-emerald-600' : 'text-stone-500'}`}>
            {prepChecked}/{prepTotal}
          </span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full mb-4">
          <div
            className={`h-full rounded-full transition-all duration-300 ${prepChecked === prepTotal ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: prepTotal > 0 ? `${Math.round((prepChecked / prepTotal) * 100)}%` : '0%' }}
          />
        </div>
        <div className="space-y-2">
          {prepSections.map(t => (
            <details key={t.id} className="rounded-2xl border border-stone-100 bg-white shadow-sm group" open>
              <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
                <span className="font-bold text-sm text-stone-900">{t.label}</span>
                <span className="text-stone-400 text-xs">
                  {t.items.filter((_, i) => checkedItems[`${t.id}-${i}`]).length}/{t.items.length}
                </span>
              </summary>
              <ul className="px-3 pb-3 space-y-1 border-t border-stone-100">
                {t.items.map((item, i) => {
                  const key = `${t.id}-${i}`
                  const isChecked = checkedItems[key] === true
                  return (
                    <li key={i}>
                      <button
                        onClick={() => toggleItem(t.id, i)}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors mt-1 ${
                          isChecked ? 'opacity-60' : 'hover:bg-stone-50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-stone-300 bg-white'
                        }`}>
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span className={`text-sm ${isChecked ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                          {item}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          ))}
        </div>
      </section>

      {/* In-race reference */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">レース中 リファレンス</h3>
        {timeline.filter(t => !t.prep).map(t => (
          <details key={t.id} className={`rounded-2xl border shadow-sm group ${t.id === 'GI' ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-white'}`}>
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
              <span className={`font-bold text-sm ${t.id === 'GI' ? 'text-red-600' : 'text-stone-900'}`}>{t.label}</span>
              <span className="text-stone-400 text-xs group-open:hidden">{t.items.length}項目</span>
            </summary>
            <ul className="px-4 pb-3 space-y-1.5 border-t border-stone-100">
              {t.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-600 pt-2">
                  <span className="text-emerald-500 shrink-0">▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {/* Must NOT */}
      <section className="bg-red-50 rounded-2xl p-4 border border-red-200">
        <h3 className="font-bold text-red-600 mb-2 text-sm">絶対にやらない</h3>
        <ul className="space-y-1">
          {MUST_NOT.map((item, i) => (
            <li key={i} className="text-sm text-red-700 flex gap-2">
              <span>✗</span>{item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// ─── Links panel ──────────────────────────────────────────────────────────────

function LinksPanel({ raceId }: { raceId: string }) {
  const links = RACE_URLS[raceId] ?? []
  return (
    <div className="space-y-3">
      {links.length === 0 && (
        <p className="text-stone-400 text-sm py-4 text-center">リンクなし</p>
      )}
      {links.map((l, i) => (
        <a
          key={i}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-white rounded-2xl px-4 py-4 border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200 transition-all"
        >
          <span className="text-sm font-medium text-stone-800">{l.label}</span>
          <svg className="w-4 h-4 text-stone-400 shrink-0" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RaceDetail() {
  const { raceId = 'ontake100-2026' } = useParams<{ raceId: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('コース')

  const { data: race, loading: raceLoading } = useDoc<Race>(`races/${raceId}`)
  const { data: ontakeAids, loading: aidsLoading } = useSubCollection<AidStation>(
    'races/ontake100-2026', 'aidStations', orderBy('distanceKm'),
  )
  const tripId = TRIP_ID[raceId]
  const { data: trips } = useCollection<Trip>('trips', orderBy('raceId'))
  const trip = trips.find(t => t.id === tripId) ?? null

  const aids = raceId === 'ontake100-2026' ? ontakeAids : []
  const effectiveAidsLoading = raceId === 'ontake100-2026' ? aidsLoading : false

  if (raceLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-stone-400 text-sm">読み込み中…</div>
      </div>
    )
  }

  if (!race) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-400">レースが見つかりません</p>
        <Link to="/races" className="text-emerald-600 text-sm mt-2 inline-block">← レース一覧</Link>
      </div>
    )
  }

  const cutoffH = (race.cutoffMinutes / 60).toFixed(1).replace('.0', '')
  const heroImg = RACE_HERO_IMG[raceId]

  return (
    <div className="-mx-4 -mt-6">
      {/* Full-bleed photo hero */}
      <div className="relative w-full h-56 overflow-hidden bg-stone-300">
        {heroImg && (
          <img src={heroImg} alt={race.name} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60" />
        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <Link to="/races"
            className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4 text-stone-800" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
        {/* Race name overlay */}
        <div className="absolute bottom-4 left-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            {race.type === 'target'
              ? <span className="text-[10px] bg-white text-stone-900 font-black px-2.5 py-0.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.20)]">TARGET</span>
              : <span className="text-[10px] bg-white text-stone-500 font-bold px-2.5 py-0.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.20)]">SIM</span>}
          </div>
          <h1 className="text-2xl font-black text-white leading-tight drop-shadow-sm">{race.name}</h1>
          <p className="text-white/70 text-xs">{race.date} | {race.location}</p>
        </div>
      </div>

      {/* White card slides over photo */}
      <div className="bg-[#F5F3EF] rounded-t-3xl -mt-4 relative z-10 px-4 pt-5">
        {/* Race stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { v: `${race.distanceKm}`, u: 'km' },
            { v: `+${race.elevationGainM.toLocaleString()}`, u: 'm' },
            { v: `${cutoffH}h`, u: '制限' },
            { v: race.baselineTime ?? race.targetTime ?? '—', u: race.baselineTime ? '2022実績' : '目標' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 text-center border border-stone-100 shadow-sm">
              <div className="text-stone-900 font-black text-base leading-none">{s.v}</div>
              <div className="text-stone-400 text-[10px] mt-1">{s.u}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 mb-5">
          <div className="flex gap-2 whitespace-nowrap min-w-max">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-500 border border-stone-100 hover:border-stone-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="pb-8">
          {activeTab === 'コース' && (
            <CoursePanel raceId={raceId} aids={aids} aidsLoading={effectiveAidsLoading} />
          )}
          {activeTab === '旅程' && (
            <ItineraryPanel trip={trip} />
          )}
          {activeTab === '持ち物' && (
            <PackingPanel trip={trip} />
          )}
          {activeTab === 'チェックリスト' && (
            <ChecklistPanel raceId={raceId} />
          )}
          {activeTab === 'リンク' && (
            <LinksPanel raceId={raceId} />
          )}
        </div>
      </div>
    </div>
  )
}
