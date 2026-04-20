import { Link, useNavigate } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import { useCollection } from '@/hooks/useFirestore'

interface Race {
  id: string; name: string; date: string; distanceKm: number
  elevationGainM: number; cutoffMinutes: number; type: string
  location: string; baselineTime?: string; targetTime?: string
}

const RACE_PHOTO: Record<string, string> = {
  'ontake100-2026': '/images/2026-ontake100-sp.webp',
  'sim-toki-river': '/images/aroundtokiriver.jpg',
  'sim-hinohara':   '/images/suikajunnrei.avif',
}

// ─── Race card ────────────────────────────────────────────────────────────────

function RaceListCard({ race }: { race: Race }) {
  const navigate = useNavigate()
  const cutoffH = (race.cutoffMinutes / 60).toFixed(1).replace('.0', '')
  const photo = RACE_PHOTO[race.id]

  return (
    <button
      onClick={() => navigate(`/races/${race.id}`)}
      className="w-full rounded-3xl overflow-hidden bg-[#FAFAF8] shadow-[0_4px_20px_rgba(0,0,0,0.10)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)] text-left transition-all active:scale-[0.99]"
    >
      {/* Photo */}
      <div className="w-full h-44 relative overflow-hidden">
        {photo ? (
          <img src={photo} alt={race.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-stone-200" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {/* Badge */}
        <div className="absolute top-3 left-3">
          {race.type === 'target'
            ? <span className="text-[10px] bg-white text-stone-900 font-black px-2.5 py-1 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.20)]">TARGET</span>
            : <span className="text-[10px] bg-white text-stone-500 font-bold px-2.5 py-1 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.20)]">SIM</span>}
        </div>
        {/* Name overlay on photo */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-black text-lg text-white leading-tight drop-shadow-sm">{race.name}</h3>
          <p className="text-white/70 text-xs mt-0.5">{race.date} | {race.location}</p>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span>
              <span className="font-black text-stone-900">{race.distanceKm}</span>
              <span className="text-stone-400 text-xs font-medium"> km</span>
            </span>
            <span>
              <span className="font-black text-stone-900">+{race.elevationGainM.toLocaleString()}</span>
              <span className="text-stone-400 text-xs font-medium"> m</span>
            </span>
            <span>
              <span className="font-black text-stone-900">{cutoffH}</span>
              <span className="text-stone-400 text-xs font-medium"> h制限</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-stone-400 text-xs font-medium">
            詳細
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {(race.baselineTime || race.targetTime) && (
          <div className="mt-2.5 pt-2.5 border-t border-stone-100 flex gap-4 text-xs text-stone-400">
            {race.baselineTime && <span>2022実績 <span className="text-stone-700 font-semibold">{race.baselineTime}</span></span>}
            {race.targetTime   && <span>目標 <span className="text-stone-700 font-semibold">{race.targetTime}</span></span>}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Races() {
  const { data: races, loading } = useCollection<Race>('races', orderBy('date'))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1 text-stone-400 hover:text-stone-700 text-sm transition-colors font-medium">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          ホーム
        </Link>
        <span className="text-stone-300 text-xs">|</span>
        <h1 className="text-xl font-black text-stone-900">レース</h1>
      </div>

      <p className="text-stone-500 text-sm -mt-2">
        前哨戦2レース + 本番Ontake100。各レースのコース・プラン・持ち物・チェックリスト。
      </p>

      {loading ? (
        <div className="text-stone-400 text-sm py-8 text-center">読み込み中…</div>
      ) : (
        <div className="space-y-4">
          {races.map((race: Race) => (
            <RaceListCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </div>
  )
}
