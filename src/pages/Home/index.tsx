import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const sections = [
  {
    to: '/races',
    icon: '🏔️',
    title: 'レース',
    sub: '3レース — コース・プラン・持ち物・チェックリスト',
    accent: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    arrow: 'text-emerald-500',
  },
  {
    to: '/training',
    icon: '📅',
    title: 'トレーニング',
    sub: 'ランニング13週プラン・筋トレA/Bスプリット',
    accent: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    arrow: 'text-blue-500',
  },
  {
    to: '/conditioning',
    icon: '🌡️',
    title: 'コンディショニング',
    sub: 'プロバイオティクス・腸トレ・暑熱馴化',
    accent: 'bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    arrow: 'text-amber-500',
  },
  {
    to: '/other',
    icon: '📊',
    title: 'その他',
    sub: '振り返り・リンク・管理ページ',
    accent: 'bg-stone-50 border-stone-200',
    iconBg: 'bg-stone-100 text-stone-600',
    arrow: 'text-stone-400',
  },
]

// Compact photo placeholder strip (for future photos)
function PhotoStrip() {
  const photos = [
    { label: 'Ontake 山頂付近', grad: 'from-slate-600 to-slate-400' },
    { label: 'Toki River スタート', grad: 'from-blue-700 to-teal-500' },
    { label: 'Hinohara 稜線', grad: 'from-green-800 to-green-500' },
  ]
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      {photos.map((p, i) => (
        <div key={i}
          className={`shrink-0 w-36 h-24 rounded-2xl bg-gradient-to-br ${p.grad} flex flex-col items-center justify-center gap-1 relative overflow-hidden`}
        >
          <span className="text-white/40 text-3xl">📷</span>
          <span className="text-white/60 text-[10px] font-medium px-2 text-center leading-tight">{p.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a2e1a 0%, #2d5a27 35%, #4a7c59 65%, #8db89a 100%)' }}>
        {/* Mountain silhouette bg */}
        <svg className="absolute bottom-0 w-full opacity-30" viewBox="0 0 400 120"
          preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <polygon points="0,120 80,60 160,90 240,20 320,75 400,45 400,120" fill="#0a1a0a" />
        </svg>

        {/* Top bar */}
        <div className="relative z-10 px-5 pt-10 pb-8">
          <div className="flex items-start justify-between mb-6">
            {user && (
              <button onClick={signOut} title="サインアウト">
                <img src={user.photoURL ?? ''} alt="" className="w-10 h-10 rounded-full ring-2 ring-white/30" />
              </button>
            )}
          </div>

          {/* Hero text */}
          <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-2">Project 2026</p>
          <h1 className="text-4xl font-black text-white leading-none mb-2">
            ONTAKE<br />
            <span className="text-emerald-300">100</span>
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs mb-5">
            腹を壊さず、ベストを尽くして完走する。
          </p>

          {/* Stats row */}
          <div className="flex gap-2 flex-wrap mb-1">
            {[
              { v: '109km', l: '距離' },
              { v: '+3,780m', l: 'D+' },
              { v: '2026.07.19', l: 'レース本番' },
            ].map(s => (
              <div key={s.l} className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                <div className="text-white font-bold text-sm">{s.v}</div>
                <div className="text-white/60 text-[10px]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 bg-[#F5F3EF] rounded-t-3xl -mt-4 relative z-10 px-5 pt-6 pb-8 space-y-6">

        {/* Photo strip */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">レース写真</p>
            <span className="text-xs text-stone-400">準備中</span>
          </div>
          <PhotoStrip />
        </div>

        {/* Pillars */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-emerald-500 font-bold">●</span> 本番1レース
          </span>
          <span className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-blue-500 font-bold">●</span> 前哨戦2レース
          </span>
          <span className="flex items-center gap-1.5 text-xs bg-white border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-amber-500 font-bold">●</span> 再利用可能なソリューション
          </span>
        </div>

        {/* Section cards */}
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">セクション</p>
          <div className="space-y-3">
            {sections.map(s => (
              <button
                key={s.to}
                onClick={() => navigate(s.to)}
                className={`w-full flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm hover:shadow-md transition-all active:scale-[0.98] ${s.accent}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${s.iconBg}`}>
                  {s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-stone-900">{s.title}</div>
                  <div className="text-stone-500 text-xs mt-0.5 leading-relaxed">{s.sub}</div>
                </div>
                <svg className={`w-5 h-5 shrink-0 ${s.arrow}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
