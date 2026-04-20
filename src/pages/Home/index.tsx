import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const sections = [
  {
    to: '/races',
    icon: '🏔️',
    title: 'レース',
    sub: '3レース — コース・プラン・持ち物・チェックリスト',
    accent: 'border-emerald-700 hover:border-emerald-500 hover:bg-emerald-950/30',
    iconBg: 'bg-emerald-950 text-emerald-400',
  },
  {
    to: '/training',
    icon: '📅',
    title: 'トレーニング',
    sub: 'ランニング13週プラン・筋トレA/Bスプリット',
    accent: 'border-blue-800 hover:border-blue-600 hover:bg-blue-950/30',
    iconBg: 'bg-blue-950 text-blue-400',
  },
  {
    to: '/conditioning',
    icon: '🌡️',
    title: 'コンディショニング',
    sub: 'プロバイオティクス・腸トレ・暑熱馴化',
    accent: 'border-amber-800 hover:border-amber-600 hover:bg-amber-950/30',
    iconBg: 'bg-amber-950 text-amber-400',
  },
  {
    to: '/other',
    icon: '📊',
    title: 'その他',
    sub: '振り返り・リンク・管理ページ',
    accent: 'border-stone-700 hover:border-stone-500 hover:bg-stone-800/50',
    iconBg: 'bg-stone-800 text-stone-400',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 pt-safe">
        {/* Mountain SVG background */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Far range */}
          <polygon points="0,220 60,120 120,160 180,80 240,140 300,60 360,110 400,70 400,220" fill="#292524" />
          {/* Main mountain */}
          <polygon points="0,220 80,160 200,30 320,160 400,110 400,220" fill="#1c1917" />
          {/* Summit cross */}
          <line x1="200" y1="10" x2="200" y2="40" stroke="#34d399" strokeWidth="2" />
          <line x1="192" y1="22" x2="208" y2="22" stroke="#34d399" strokeWidth="2" />
          {/* Ridge lines */}
          <polyline points="200,30 160,90 120,120 80,160" fill="none" stroke="#34d399" strokeWidth="0.8" strokeOpacity="0.6" />
          <polyline points="200,30 240,90 280,120 320,160" fill="none" stroke="#34d399" strokeWidth="0.8" strokeOpacity="0.6" />
        </svg>

        <div className="relative z-10 max-w-4xl mx-auto px-5 pt-10 pb-8">
          {/* Sign-out button */}
          {user && (
            <button
              onClick={signOut}
              title="サインアウト"
              className="absolute top-4 right-5"
            >
              <img src={user.photoURL ?? ''} alt="" className="w-8 h-8 rounded-full ring-2 ring-stone-700" />
            </button>
          )}

          {/* Title */}
          <div className="mb-6">
            <p className="text-xs text-emerald-500 font-semibold tracking-widest uppercase mb-2">Project 2026</p>
            <h1 className="text-4xl font-black tracking-tight text-white leading-none mb-3">
              ONTAKE<br />
              <span className="text-emerald-400">100</span>
            </h1>
            <p className="text-stone-300 text-base leading-relaxed max-w-xs">
              腹を壊さず、ベストを尽くして完走する。
            </p>
          </div>

          {/* 3 pillars */}
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="flex items-center gap-1.5 text-xs bg-emerald-950 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-full">
              <span>🏔️</span> 本番1レース (109km)
            </span>
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-700 text-stone-300 px-3 py-1.5 rounded-full">
              <span>🏃</span> 前哨戦2レース
            </span>
            <span className="flex items-center gap-1.5 text-xs bg-stone-900 border border-stone-700 text-stone-300 px-3 py-1.5 rounded-full">
              <span>⚡</span> 再利用可能なソリューション
            </span>
          </div>

          {/* Key stats */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { value: '109km', label: '距離' },
              { value: '+3,780m', label: '累積D+' },
              { value: '2026.07.19', label: 'レース本番' },
            ].map(s => (
              <div key={s.label} className="bg-stone-900/60 rounded-xl p-3 text-center border border-stone-800/60">
                <div className="text-emerald-400 font-bold text-sm">{s.value}</div>
                <div className="text-stone-500 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section cards ── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-3 pb-safe">
        <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-4">セクション</p>
        {sections.map(s => (
          <button
            key={s.to}
            onClick={() => navigate(s.to)}
            className={`w-full flex items-center gap-4 rounded-2xl border bg-stone-900 p-4 text-left transition-all active:scale-[0.98] ${s.accent}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${s.iconBg}`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-stone-100">{s.title}</div>
              <div className="text-stone-500 text-xs mt-0.5 leading-relaxed">{s.sub}</div>
            </div>
            <span className="text-stone-600 text-sm shrink-0">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
