import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const sections = [
  { to: '/races',        icon: 'terrain',        title: 'レース',           sub: '3レース — コース・プラン・持ち物・チェックリスト' },
  { to: '/training',     icon: 'calendar_month',  title: 'トレーニング',     sub: 'ランニング13週プラン・筋トレA/Bスプリット' },
  { to: '/conditioning', icon: 'monitor_heart',   title: 'コンディショニング', sub: 'プロバイオティクス・腸トレ・暑熱馴化' },
  { to: '/other',        icon: 'bar_chart',       title: 'その他',           sub: '振り返り・リンク・管理ページ' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ minHeight: '50vh' }}>
        <img
          src="/images/2026-ontake100-bg1.webp"
          alt="OSJ ONTAKE 100 background"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />

        <div className="relative z-10 px-5 pt-10 pb-10 flex flex-col h-full" style={{ minHeight: '50vh' }}>
          <div className="flex items-start justify-between mb-auto">
            {user && (
              <button onClick={signOut} title="サインアウト">
                <img src={user.photoURL ?? ''} alt="" className="w-10 h-10 rounded-full ring-2 ring-white/40" />
              </button>
            )}
          </div>
          <div>
            <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-2">Project 2026</p>
            <h1 className="text-5xl font-black text-white leading-none mb-2">
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
      </div>

      {/* ── Content ── */}
      <div className="flex-1 bg-[#F5F3EF] rounded-t-3xl -mt-5 relative z-10 px-5 pt-6 pb-8 space-y-6">

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
