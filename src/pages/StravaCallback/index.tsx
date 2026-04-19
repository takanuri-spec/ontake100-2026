import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { exchangeCode } from '@/lib/strava'
import { useAuth } from '@/contexts/AuthContext'

export default function StravaCallback() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'waiting' | 'exchanging' | 'done' | 'error'>('waiting')
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)  // StrictMode double-invoke guard

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/'); return }
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err = params.get('error')

    if (err || !code) {
      setError(err ?? 'コードが取得できませんでした')
      setStatus('error')
      return
    }

    setStatus('exchanging')
    exchangeCode(code)
      .then(async tokens => {
        await setDoc(doc(db, 'stravaAuth', 'main'), {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          athlete_id: tokens.athlete?.id ?? 0,
          connectedAt: new Date().toISOString(),
        })
        setStatus('done')
        setTimeout(() => navigate('/training'), 800)
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : '接続失敗')
        setStatus('error')
      })
  }, [authLoading, user, navigate])

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 p-8">
      {status === 'error' ? (
        <>
          <div className="text-3xl">❌</div>
          <p className="text-red-400 font-semibold">Strava接続エラー</p>
          <p className="text-stone-500 text-sm">{error}</p>
          <button
            onClick={() => navigate('/training')}
            className="mt-4 text-sm text-stone-400 underline"
          >
            トレーニングに戻る
          </button>
        </>
      ) : status === 'done' ? (
        <>
          <div className="text-3xl">✅</div>
          <p className="text-emerald-400 font-semibold">Strava接続完了</p>
          <p className="text-stone-500 text-sm">リダイレクト中…</p>
        </>
      ) : (
        <>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-400 text-sm">
            {status === 'exchanging' ? 'Stravaと接続中…' : '認証確認中…'}
          </p>
        </>
      )}
    </div>
  )
}
