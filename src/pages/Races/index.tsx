import { Link, useNavigate } from 'react-router-dom'
import { orderBy } from 'firebase/firestore'
import { useCollection } from '@/hooks/useFirestore'

interface Race {
  id: string; name: string; date: string; distanceKm: number
  elevationGainM: number; cutoffMinutes: number; type: string
  location: string; baselineTime?: string; targetTime?: string
}

// ─── Race-specific SVG illustrations ─────────────────────────────────────────

function OntakeSvg() {
  return (
    <svg viewBox="0 0 240 100" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="ontake-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c0a09" />
          <stop offset="100%" stopColor="#1c1917" />
        </linearGradient>
      </defs>
      <rect width="240" height="100" fill="url(#ontake-sky)" />
      {/* Stars */}
      <circle cx="30" cy="15" r="1" fill="#d6d3d1" opacity="0.7" />
      <circle cx="80" cy="8" r="0.8" fill="#d6d3d1" opacity="0.5" />
      <circle cx="160" cy="12" r="1" fill="#d6d3d1" opacity="0.6" />
      <circle cx="210" cy="6" r="0.8" fill="#d6d3d1" opacity="0.4" />
      <circle cx="50" cy="30" r="0.6" fill="#d6d3d1" opacity="0.4" />
      <circle cx="190" cy="25" r="0.7" fill="#d6d3d1" opacity="0.5" />
      {/* Far ridgeline */}
      <polygon points="0,100 20,70 50,80 100,50 150,65 200,45 240,55 240,100" fill="#292524" />
      {/* Main mountain — 3 peaks, center tallest */}
      <polygon points="0,100 40,80 120,8 200,80 240,65 240,100" fill="#1c1917" />
      {/* Left ridge highlight */}
      <polyline points="120,8 80,45 50,70" fill="none" stroke="#34d399" strokeWidth="1.2" strokeOpacity="0.5" />
      {/* Right ridge highlight */}
      <polyline points="120,8 160,45 190,70" fill="none" stroke="#34d399" strokeWidth="1.2" strokeOpacity="0.5" />
      {/* Summit cross */}
      <line x1="120" y1="2" x2="120" y2="16" stroke="#34d399" strokeWidth="2" />
      <line x1="113" y1="8" x2="127" y2="8" stroke="#34d399" strokeWidth="2" />
      {/* Snow patches */}
      <ellipse cx="100" cy="22" rx="8" ry="3" fill="#e7e5e4" opacity="0.3" />
      <ellipse cx="138" cy="25" rx="6" ry="2.5" fill="#e7e5e4" opacity="0.25" />
    </svg>
  )
}

function TokiRiverSvg() {
  return (
    <svg viewBox="0 0 240 100" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="toki-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e3a5f" />
        </linearGradient>
        <linearGradient id="toki-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="240" height="100" fill="url(#toki-sky)" />
      {/* Hills */}
      <polygon points="0,100 0,55 40,35 90,50 140,30 190,45 240,28 240,100" fill="#14532d" />
      <polygon points="0,100 0,65 60,50 120,60 180,45 240,55 240,100" fill="#166534" />
      {/* River winding through valley */}
      <path d="M0,82 Q30,78 60,85 Q100,92 140,80 Q180,70 220,78 L240,80 L240,100 L0,100 Z" fill="url(#toki-water)" />
      {/* River reflection shimmer */}
      <path d="M20,84 Q50,80 80,87" fill="none" stroke="#7dd3fc" strokeWidth="0.8" strokeOpacity="0.5" />
      <path d="M100,82 Q140,76 170,82" fill="none" stroke="#7dd3fc" strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Morning mist */}
      <ellipse cx="60" cy="65" rx="50" ry="8" fill="#e0f2fe" opacity="0.08" />
      <ellipse cx="180" cy="60" rx="45" ry="6" fill="#e0f2fe" opacity="0.06" />
    </svg>
  )
}

function HinoharaSvg() {
  return (
    <svg viewBox="0 0 240 100" className="w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="hino-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#052e16" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
      </defs>
      <rect width="240" height="100" fill="url(#hino-sky)" />
      {/* Dense forest ridge — multiple jagged peaks */}
      <polygon points="0,100 0,60 15,50 25,55 40,38 55,45 70,32 85,40 100,25 115,35 130,20 145,32 160,22 175,38 190,28 205,42 220,30 235,45 240,40 240,100" fill="#064e3b" />
      {/* Forest tree line texture */}
      <polygon points="0,100 0,68 20,58 35,63 50,52 65,60 80,48 95,55 110,42 125,50 140,38 155,48 170,40 185,52 200,42 215,55 230,45 240,50 240,100" fill="#065f46" />
      {/* Tree silhouettes */}
      {[12, 35, 58, 82, 105, 128, 152, 175, 198, 222].map((x, i) => (
        <g key={i} transform={`translate(${x},${[60,52,55,47,50,44,48,52,45,54][i]})`}>
          <polygon points="0,-14 -5,0 5,0" fill="#022c22" />
          <polygon points="0,-10 -4,0 4,0" fill="#065f46" />
        </g>
      ))}
      {/* Sunlight streak */}
      <line x1="220" y1="0" x2="160" y2="40" stroke="#fde68a" strokeWidth="0.5" strokeOpacity="0.2" />
      <line x1="230" y1="0" x2="185" y2="35" stroke="#fde68a" strokeWidth="0.4" strokeOpacity="0.15" />
    </svg>
  )
}

const RACE_SVG: Record<string, React.FC> = {
  'ontake100-2026': OntakeSvg,
  'sim-toki-river': TokiRiverSvg,
  'sim-hinohara':   HinoharaSvg,
}

// ─── Race card ────────────────────────────────────────────────────────────────

function RaceListCard({ race }: { race: Race }) {
  const navigate = useNavigate()
  const Illustration = RACE_SVG[race.id]
  const cutoffH = (race.cutoffMinutes / 60).toFixed(1).replace('.0', '')

  return (
    <button
      onClick={() => navigate(`/races/${race.id}`)}
      className={`w-full rounded-2xl overflow-hidden border text-left transition-all active:scale-[0.99] ${
        race.type === 'target'
          ? 'border-emerald-700 hover:border-emerald-500'
          : 'border-stone-700 hover:border-stone-500'
      }`}
    >
      {/* SVG illustration */}
      <div className="w-full h-24 overflow-hidden bg-stone-950">
        {Illustration ? <Illustration /> : <div className="w-full h-full bg-stone-900" />}
      </div>

      {/* Card body */}
      <div className={`px-4 py-3 ${race.type === 'target' ? 'bg-emerald-950/40' : 'bg-stone-900'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {race.type === 'target'
                ? <span className="text-xs bg-emerald-500 text-black font-bold px-2 py-0.5 rounded">TARGET</span>
                : <span className="text-xs bg-blue-700 text-white font-bold px-2 py-0.5 rounded">SIM</span>}
              <span className="font-bold text-sm text-stone-100">{race.name}</span>
            </div>
            <p className="text-stone-400 text-xs mt-1">{race.date} | {race.location}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-emerald-400 font-bold">{race.distanceKm}km</div>
            <div className="text-stone-400 text-xs">+{race.elevationGainM.toLocaleString()}m</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-stone-700/40 flex items-center justify-between text-xs text-stone-500">
          <span>制限 {cutoffH}h</span>
          {race.baselineTime && <span>2022: <span className="text-emerald-400">{race.baselineTime}</span></span>}
          {race.targetTime   && <span>目標: <span className="text-emerald-400">{race.targetTime}</span></span>}
          <span className="text-stone-500">詳細を見る →</span>
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
        <Link to="/" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">← ホーム</Link>
        <span className="text-stone-700">|</span>
        <h1 className="text-xl font-bold text-emerald-400">レース</h1>
      </div>

      <p className="text-stone-400 text-sm -mt-2">
        前哨戦2レース + 本番Ontake100。各レースのコース・プラン・持ち物・チェックリスト。
      </p>

      {loading ? (
        <div className="text-stone-600 text-sm py-8 text-center">読み込み中…</div>
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
