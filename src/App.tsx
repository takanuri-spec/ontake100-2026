import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

function LoginScreen() {
  const { signIn } = useAuth()
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero photo */}
      <div className="flex-1 relative overflow-hidden min-h-[58vh]">
        <img
          src="/images/2026-ontake100-bg1.webp"
          alt="OSJ ONTAKE 100"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/65" />
        <div className="absolute bottom-10 left-6 text-white">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-60 mb-1">Trail Running</p>
          <p className="text-2xl font-black leading-tight">Let's conquer<br />the mountain!</p>
        </div>
      </div>

      {/* White bottom card */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 px-6 pt-8 pb-10 shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
        <h1 className="text-2xl font-black text-stone-900 mb-1">ONTAKE 100</h1>
        <p className="text-stone-400 text-sm mb-7">2026.07.19 — 109km / +3,780m</p>

        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white font-bold py-4 rounded-2xl hover:bg-stone-800 transition-colors shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
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
    </div>
  )
}

export default function App() {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()
  const isHome = location.pathname === '/'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center">
        <div className="text-stone-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-stone-900 flex flex-col">
      {!isHome && (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-100 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1 text-stone-500 hover:text-stone-800 text-sm transition-colors font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ホーム
              </Link>
              <span className="text-stone-200 text-xs">|</span>
              <span className="text-sm font-bold tracking-tight text-stone-800">ONTAKE 100</span>
            </div>
            <button
              onClick={signOut}
              title="サインアウト"
            >
              <img src={user.photoURL ?? ''} alt="" className="w-8 h-8 rounded-full ring-2 ring-stone-200" />
            </button>
          </div>
        </header>
      )}

      <main className={isHome ? 'flex-1' : 'flex-1 max-w-4xl mx-auto w-full px-4 py-6'}>
        <Outlet />
      </main>
    </div>
  )
}
