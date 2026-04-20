import { Link, useNavigate } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import { useCollection } from '@/hooks/useFirestore'

interface Race {
  id: string; name: string; date: string; distanceKm: number
  elevationGainM: number; cutoffMinutes: number; type: string
  location: string; baselineTime?: string; targetTime?: string
}

// ─── Photo placeholder gradients per race ────────────────────────────────────

const RACE_PHOTO: Record<string, { style: React.CSSProperties; label: string }> = {
  'ontake100-2026': {
    style: { background: 'linear-gradient(160deg, #0c1a0c 0%, #1a3a1a 40%, #2d5a27 70%, #4a7c59 100%)' },
    label: 'Ontake 山頂 / 夜間スタート',
  },
  'sim-toki-river': {
    style: { background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 45%, #1d4ed8 75%, #38bdf8 100%)' },
    label: 'Toki River / 川沿いコース',
  },
  'sim-hinohara': {
    style: { background: 'linear-gradient(160deg, #052e16 0%, #14532d 40%, #166534 70%, #4ade80 100%)' },
    label: 'Hinohara / 深緑の森',
  },
}

// SVG mountain silhouettes overlaid on gradient
function RaceHeroPlaceholder({ raceId }: { raceId: string }) {
  const photo = RACE_PHOTO[raceId]
  return (
    <div className="w-full h-44 relative overflow-hidden" style={photo?.style ?? { background: '#d6d3d1' }}>
      {raceId === 'ontake100-2026' && (
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <polygon points="0,100 70,55 150,80 200,15 250,75 330,45 400,60 400,100" fill="#0a1a0a" opacity="0.7" />
          <line x1="200" y1="5" x2="200" y2="22" stroke="#34d399" strokeWidth="2" />
          <line x1="193" y1="13" x2="207" y2="13" stroke="#34d399" strokeWidth="2" />
        </svg>
      )}
      {raceId === 'sim-toki-river' && (
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <polygon points="0,100 0,60 50,45 120,65 200,35 280,55 360,30 400,45 400,100" fill="#14532d" opacity="0.7" />
          <path d="M0,88 Q80,80 160,88 Q240,96 320,84 L400,88 L400,100 L0,100Z" fill="#1d4ed8" opacity="0.6" />
        </svg>
      )}
      {raceId === 'sim-hinohara' && (
        <svg className="absolute bottom-0 w-full" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <polygon points="0,100 0,55 30,40 60,55 90,35 120,50 150,25 180,42 210,18 240,38 270,22 300,40 330,28 360,45 400,32 400,100" fill="#052e16" opacity="0.8" />
          <polygon points="0,100 0,68 40,55 80,68 120,50 160,62 200,45 240,60 280,46 320,62 360,50 400,60 400,100" fill="#065f46" opacity="0.7" />
        </svg>
      )}
      {/* Photo placeholder indicator */}
      <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
        <span className="text-white/60 text-xs">📷</span>
        <span className="text-white/60 text-[10px]">写真準備中</span>
      </div>
      {photo && (
        <div className="absolute bottom-3 left-3">
          <p className="text-white/70 text-xs">{photo.label}</p>
        </div>
      )}
    </div>
  )
}

// ─── Race card ────────────────────────────────────────────────────────────────

function RaceListCard({ race }: { race: Race }) {
  const navigate = useNavigate()
  const cutoffH = (race.cutoffMinutes / 60).toFixed(1).replace('.0', '')

  return (
    <button
      onClick={() => navigate(`/races/${race.id}`)}
      className="w-full rounded-3xl overflow-hidden bg-white shadow-md hover:shadow-lg text-left transition-all active:scale-[0.99] border border-stone-100"
    >
      {/* Photo placeholder */}
      <RaceHeroPlaceholder raceId={race.id} />

      {/* Card body */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {race.type === 'target'
                ? <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full">TARGET</span>
                : <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">SIM</span>}
            </div>
            <h3 className="font-black text-lg text-stone-900 leading-tight">{race.name}</h3>
            <p className="text-stone-400 text-xs mt-0.5">{race.date} | {race.location}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-stone-900">{race.distanceKm}<span className="text-sm font-bold text-stone-400">km</span></div>
            <div className="text-amber-500 text-sm font-bold">+{race.elevationGainM.toLocaleString()}m</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-400">
          <span>制限 <span className="text-stone-700 font-semibold">{cutoffH}h</span></span>
          {race.baselineTime && <span>2022実績 <span className="text-emerald-600 font-semibold">{race.baselineTime}</span></span>}
          {race.targetTime   && <span>目標 <span className="text-emerald-600 font-semibold">{race.targetTime}</span></span>}
          <span className="flex items-center gap-1 text-stone-400 font-medium">
            詳細
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
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
        <div className="space-y-5">
          {races.map((race: Race) => (
            <RaceListCard key={race.id} race={race} />
          ))}
        </div>
      )}
    </div>
  )
}
