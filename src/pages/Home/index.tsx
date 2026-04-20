import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const sections = [
  { to: '/races',        icon: 'terrain',        title: 'レース',           sub: '3レース — コース・プラン・持ち物・チェックリスト' },
  { to: '/training',     icon: 'calendar_month',  title: 'トレーニング',     sub: 'ランニング13週プラン・筋トレA/Bスプリット' },
  { to: '/conditioning', icon: 'monitor_heart',   title: 'コンディショニング', sub: 'プロバイオティクス・腸トレ・暑熱馴化' },
  { to: '/other',        icon: 'bar_chart',       title: 'その他',           sub: '振り返り・リンク・管理ページ' },
]

const racePhotos = [
  { raceId: 'ontake100-2026', src: '/images/2026-ontake100-sp.webp', label: 'OSJ ONTAKE 100' },
  { raceId: 'sim-toki-river', src: '/images/aroundtokiriver.jpg',     label: 'Around Toki River' },
  { raceId: 'sim-hinohara',   src: '/images/suikajunnrei.avif',       label: '翠夏巡嶺' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 240 }}>
        <img
          src="/images/2026-ontake100-bg1.webp"
          alt="OSJ ONTAKE 100 background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/65" />

        <div className="relative z-10 px-5 pt-10 pb-8">
          <div className="flex items-start justify-between mb-6">
            {user && (
              <button onClick={signOut} title="サインアウト">
                <img src={user.photoURL ?? ''} alt="" className="w-10 h-10 rounded-full ring-2 ring-white/40" />
              </button>
            )}
          </div>
          <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-2">Project 2026</p>
          <h1 className="text-4xl font-black text-white leading-none mb-2">
            ONTAKE<br />
            <span className="text-emerald-300">100</span>
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs mb-5">
            腹を壊さず、ベストを尽くして完走する。
          </p>
          <div className="flex gap-2 flex-wrap">
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
      <div className="flex-1 bg-[#F5F3EF] rounded-t-3xl -mt-5 relative z-10 px-5 pt-6 pb-8 space-y-6">

        {/* Race photos */}
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {racePhotos.map(p => (
            <button
              key={p.raceId}
              onClick={() => navigate(`/races/${p.raceId}`)}
              className="shrink-0 w-40 h-24 rounded-2xl overflow-hidden relative shadow-[0_6px_20px_rgba(0,0,0,0.18)] active:scale-[0.97] transition-transform"
            >
              <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-3 text-white text-[11px] font-bold leading-tight drop-shadow">
                {p.label}
              </span>
            </button>
          ))}
        </div>

        {/* Section cards */}
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">セクション</p>
          <div className="space-y-2.5">
            {sections.map(s => (
              <button
                key={s.to}
                onClick={() => navigate(s.to)}
                className="w-full flex items-center gap-4 rounded-2xl bg-[#FAFAF8] p-4 text-left shadow-[0_4px_16px_rgba(0,0,0,0.10)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.14)] transition-shadow active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-rounded text-stone-600" style={{ fontSize: 22 }}>{s.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-stone-900">{s.title}</div>
                  <div className="text-stone-400 text-xs mt-0.5 leading-relaxed">{s.sub}</div>
                </div>
                <span className="material-symbols-rounded text-stone-300 shrink-0" style={{ fontSize: 20 }}>chevron_right</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
