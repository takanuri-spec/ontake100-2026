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
  'ontake100-2026': 0,
  'sim-toki-river': 0,
  'sim-hinohara':   0,
}

const TRIP_ID: Record<string, string> = {
  'ontake100-2026': 'trip-ontake',
  'sim-toki-river': 'trip-toki-river',
  'sim-hinohara':   'trip-hinohara',
}

const RACE_URLS: Record<string, { label: string; url: string }[]> = {
  'ontake100-2026': [
    { label: 'OSJ ONTAKE 100 公式', url: 'https://www.powersports.co.jp/osj/ontake/' },
    { label: 'ITRA レース情報',      url: 'https://itra.run/Races/RaceDetails/OSJ.ONTAKE100/2026' },
  ],
  'sim-toki-river': [
    { label: 'NPO-SUP 公式ページ', url: 'https://npo-sup.org/blog/event/' },
  ],
  'sim-hinohara': [
    { label: 'ひのはらトレイルレース 公式', url: 'https://hinohara-trail.jp/' },
  ],
}

const CATEGORY_LABEL: Record<string, string> = {
  mandatory: '必携', nutrition: '補給', navigation: 'ナビ',
  medical: '医療', clothing: '衣類', other: 'その他',
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

  const simCheckpoints: Checkpoint[] = gpx
    ? [
        { id: 'start',  name: 'スタート',    distKm: 0, cutoffFromStartMin: 0 },
        { id: 'finish', name: 'フィニッシュ', distKm: parseFloat(gpx.totalDistKm.toFixed(1)), cutoffFromStartMin: 0 },
      ]
    : []

  const effectiveCheckpoints = aids.length > 0 ? checkpoints : simCheckpoints

  return (
    <div className="space-y-6">
      {gpxLoading && (
        <div className="text-stone-600 text-sm text-center py-10">GPX 読み込み中…</div>
      )}
      {gpxError && (
        <div className="text-red-400 text-sm text-center py-6">GPX 読み込みエラー: {gpxError}</div>
      )}
      {gpx && (
        <>
          <div>
            <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">コースマップ・高低図</h3>
            <CourseMap
              gpx={gpx}
              aids={aids.map(a => ({ distanceKm: a.distanceKm, name: a.name }))}
            />
          </div>
          {effectiveCheckpoints.length >= 2 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">レースプラン</h3>
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
  )
}

// ─── Trip panel (旅程) ────────────────────────────────────────────────────────

function ItineraryPanel({ trip }: { trip: Trip | null }) {
  if (!trip) return (
    <div className="text-stone-500 text-sm py-8 text-center">旅程データなし</div>
  )
  return (
    <div className="space-y-3">
      {trip.rentalCar && (
        <div className="bg-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">レンタカー</div>
          <div className="text-sm text-stone-200">
            🚗 日産レンタカー <span className="font-mono text-emerald-400">{trip.rentalCar.reservation}</span>
          </div>
          <div className="text-xs text-stone-400 mt-1">
            {new Date(trip.rentalCar.departure).toLocaleString('ja-JP', {
              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}発 — {trip.rentalCar.shop}
          </div>
        </div>
      )}
      {trip.hotel && (
        <div className="bg-stone-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">宿泊</div>
          <div className="text-sm text-stone-200">
            🏨 {trip.hotel.name} <span className="font-mono text-emerald-400">#{trip.hotel.reservation}</span>
          </div>
        </div>
      )}
      {!trip.rentalCar && !trip.hotel && (
        <div className="text-stone-500 text-sm py-4 text-center">旅程情報なし</div>
      )}
      {trip.dropBagContents && trip.dropBagContents.length > 0 && (
        <div className="bg-amber-950/30 rounded-xl p-4 border border-amber-800/40">
          <div className="text-xs font-semibold text-amber-400 mb-2">ドロップバッグ (CP1 54km)</div>
          <div className="flex flex-wrap gap-1.5">
            {trip.dropBagContents.map((item, i) => (
              <span key={i} className="text-xs bg-amber-950/60 border border-amber-800/50 text-amber-200 px-2 py-0.5 rounded">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
      {trip.notes && (
        <p className="text-stone-500 text-xs px-1">{trip.notes}</p>
      )}
    </div>
  )
}

// ─── Packing panel (持ち物) ───────────────────────────────────────────────────

function PackingPanel({ trip }: { trip: Trip | null }) {
  const [toggling, setToggling] = useState<string | null>(null)

  if (!trip) return (
    <div className="text-stone-500 text-sm py-8 text-center">持ち物データなし</div>
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
      <div className="flex items-center gap-3">
        <div className={`text-sm font-bold ${pct === 100 ? 'text-emerald-400' : 'text-stone-300'}`}>
          {checkedCount}/{total}
        </div>
        <div className="flex-1 h-1.5 bg-stone-800 rounded-full">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-xs text-stone-500">{pct}%</div>
      </div>

      {/* Categories */}
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
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
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
    <div className="space-y-6">
      {/* Pre-race */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">レース前 準備チェック</h3>
          <span className={`text-xs font-bold ${prepChecked === prepTotal ? 'text-emerald-400' : 'text-stone-400'}`}>
            {prepChecked}/{prepTotal}
          </span>
        </div>
        <div className="h-1 bg-stone-800 rounded mb-3">
          <div
            className={`h-full rounded transition-all duration-300 ${prepChecked === prepTotal ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: prepTotal > 0 ? `${Math.round((prepChecked / prepTotal) * 100)}%` : '0%' }}
          />
        </div>
        <div className="space-y-2">
          {prepSections.map(t => (
            <details key={t.id} className="rounded-xl border border-stone-800 bg-stone-900 group" open>
              <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
                <span className="font-semibold text-sm">{t.label}</span>
                <span className="text-stone-500 text-xs">
                  {t.items.filter((_, i) => checkedItems[`${t.id}-${i}`]).length}/{t.items.length}
                </span>
              </summary>
              <ul className="px-3 pb-3 space-y-1 border-t border-stone-800">
                {t.items.map((item, i) => {
                  const key = `${t.id}-${i}`
                  const isChecked = checkedItems[key] === true
                  return (
                    <li key={i}>
                      <button
                        onClick={() => toggleItem(t.id, i)}
                        className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors mt-1 ${
                          isChecked ? 'opacity-60' : 'hover:bg-stone-800'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-emerald-600 border-emerald-600' : 'border-stone-600 bg-stone-800'
                        }`}>
                          {isChecked && <span className="text-white text-xs leading-none">✓</span>}
                        </span>
                        <span className={`text-sm ${isChecked ? 'line-through text-stone-500' : 'text-stone-300'}`}>
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
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">レース中 リファレンス</h3>
        {timeline.filter(t => !t.prep).map(t => (
          <details key={t.id} className="rounded-xl border border-stone-800 bg-stone-900 group">
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
              <span className={`font-semibold text-sm ${t.id === 'GI' ? 'text-red-400' : ''}`}>{t.label}</span>
              <span className="text-stone-600 text-xs group-open:hidden">{t.items.length}項目</span>
            </summary>
            <ul className="px-4 pb-3 space-y-1.5 border-t border-stone-800">
              {t.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-300 pt-2">
                  <span className="text-emerald-500 shrink-0">▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {/* Must NOT */}
      <section className="bg-red-950/30 rounded-xl p-4 border border-red-800">
        <h3 className="font-semibold text-red-400 mb-2 text-sm">絶対にやらない</h3>
        <ul className="space-y-1">
          {MUST_NOT.map((item, i) => (
            <li key={i} className="text-sm text-red-200 flex gap-2">
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
        <p className="text-stone-500 text-sm py-4 text-center">リンクなし</p>
      )}
      {links.map((l, i) => (
        <a
          key={i}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-stone-800 rounded-xl px-4 py-3 hover:bg-stone-700 transition-colors"
        >
          <span className="text-sm text-stone-200">{l.label}</span>
          <span className="text-stone-500 text-xs shrink-0">外部リンク →</span>
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
        <div className="text-stone-600 text-sm">読み込み中…</div>
      </div>
    )
  }

  if (!race) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500">レースが見つかりません</p>
        <Link to="/races" className="text-emerald-400 text-sm mt-2 inline-block">← レース一覧</Link>
      </div>
    )
  }

  const cutoffH = (race.cutoffMinutes / 60).toFixed(1).replace('.0', '')

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/races" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">← レース一覧</Link>
      </div>

      {/* Race header */}
      <div className={`rounded-2xl p-4 border mb-4 ${
        race.type === 'target'
          ? 'border-emerald-700 bg-emerald-950/40'
          : 'border-stone-700 bg-stone-900'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {race.type === 'target'
                ? <span className="text-xs bg-emerald-500 text-black font-bold px-2 py-0.5 rounded">TARGET</span>
                : <span className="text-xs bg-blue-700 text-white font-bold px-2 py-0.5 rounded">SIM</span>}
            </div>
            <h1 className="text-xl font-bold text-stone-100">{race.name}</h1>
            <p className="text-stone-400 text-xs mt-1">{race.date} | {race.location}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-emerald-400 font-bold text-lg">{race.distanceKm}km</div>
            <div className="text-stone-400 text-sm">+{race.elevationGainM.toLocaleString()}m</div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-stone-700/50 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
          <span>制限: <span className="text-stone-200">{cutoffH}h</span></span>
          {race.baselineTime && <span>2022実績: <span className="text-emerald-300">{race.baselineTime}</span></span>}
          {race.targetTime   && <span>目標: <span className="text-emerald-300">{race.targetTime}</span></span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 mb-5">
        <div className="flex gap-1 whitespace-nowrap min-w-max">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
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
  )
}
