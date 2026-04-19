import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/race-bible', label: 'レース聖典', icon: '🗺️' },
  { to: '/training',   label: 'トレーニング', icon: '📅' },
  { to: '/gi-heat',    label: 'GI/暑熱',     icon: '🌡️' },
  { to: '/race-day',   label: 'レース当日',   icon: '⛰️' },
  { to: '/retro',      label: '振り返り',     icon: '📊' },
]

function LoginScreen() {
  const { signIn } = useAuth()
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">⛰️</div>
        <h1 className="text-2xl font-bold text-emerald-400">ONTAKE 100</h1>
        <p className="text-stone-400 text-sm">2026.07.19 — 109km / +3,780m</p>
      </div>
      <button
        onClick={signIn}
        className="flex items-center gap-3 bg-white text-stone-900 font-semibold px-6 py-3 rounded-xl hover:bg-stone-100 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google でサインイン
      </button>
    </div>
  )
}

export default function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-stone-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="sticky top-0 z-50 bg-stone-900/95 backdrop-blur border-b border-stone-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-emerald-400">ONTAKE 100</span>
            <span className="text-stone-500 text-sm">2026.07.19</span>
          </div>
          <button
            onClick={signOut}
            title="サインアウト"
            className="text-xs text-stone-500 hover:text-stone-300"
          >
            <img src={user.photoURL ?? ''} alt="" className="w-7 h-7 rounded-full" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 bg-stone-900/95 backdrop-blur border-t border-stone-800 safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto flex">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 px-1 text-xs gap-0.5 transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-stone-500 hover:text-stone-300'
                }`
              }
            >
              <span className="text-xl leading-none">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
