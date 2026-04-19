import { useState } from 'react'
import { format } from 'date-fns'
import { doc, setDoc } from 'firebase/firestore'
import { useCollection } from '@/hooks/useFirestore'
import { db } from '@/lib/firebase'

// ─── Exercise data ────────────────────────────────────────────────────────────

interface Exercise { name: string; sets: string; keyPoint: string }

const SESSIONS: Record<'A' | 'B', { theme: string; color: string; exercises: Exercise[] }> = {
  A: {
    theme: '後面連鎖・臀部｜登り強化',
    color: 'border-blue-700/60 bg-blue-950/20',
    exercises: [
      {
        name: 'アブダクター',
        sets: '2×20',
        keyPoint: 'ウォームアップ兼。中臀筋は最重要で、疲労による膝の内倒れ（ニーイン）を防ぐ唯一の砦。シートに深く座り、動作は速く上げてゆっくり戻す（偏心2秒）。',
      },
      {
        name: '片足レッグプレス',
        sets: '3×10/脚',
        keyPoint: 'かかと全体でプラットフォームを踏む意識 → 大臀筋が優位に働く。パワーハイクに直結する最重要種目。体重の50〜70%の負荷から始め、フォームが崩れない重さを選ぶ。',
      },
      {
        name: 'レッグカール',
        sets: '3×12',
        keyPoint: '偏心フェーズ（膝を伸ばして戻す方向）を3秒かけてゆっくり。ここがノルディックカールの代替効果を生む核心。後半下り（83-109km）でのハムストリング断裂予防。',
      },
      {
        name: 'アダクター',
        sets: '2×15',
        keyPoint: '骨盤の横揺れ（側方動揺）を抑える内転筋群。アブダクターとセットで股関節を360°全方向から安定させる。軽めの負荷でコントロール重視。',
      },
      {
        name: '腹筋ローラー',
        sets: '3×10',
        keyPoint: 'マシン代替なし。体幹の抗伸展能力を鍛える最良手。腰が落ちた瞬間に即停止がルール。最初は膝コロ（膝をついた状態）でOK。50km超えたときの姿勢崩れを防ぐ。',
      },
    ],
  },
  B: {
    theme: '前面連鎖・安定性｜下り強化',
    color: 'border-amber-700/60 bg-amber-950/20',
    exercises: [
      {
        name: 'アブダクター',
        sets: '2×15',
        keyPoint: '週2回入れて中臀筋を優先強化。Aより軽め・速め。中臀筋はトレイルランナーの故障予防で最も費用対効果が高い筋肉。',
      },
      {
        name: '片足レッグプレス',
        sets: '3×12/脚',
        keyPoint: 'Aより軽め・速め（コンセントリック＝押すフェーズを速く）。スピード筋力を養う。つま先だけをプラットフォーム下端に置けば、そのままカーフレイズとしても使える。',
      },
      {
        name: 'レッグエクステンション',
        sets: '3×12',
        keyPoint: '下ろす方向（偏心）を3秒かけてゆっくり。大腿四頭筋の下り制動力を鍛える。Ontake 73-83kmの急登後に始まる大下りで、これがないと膝が終わる。',
      },
      {
        name: 'カーフレイズ（レッグプレス代用）',
        sets: '3×12/脚',
        keyPoint: '母指球だけをプラットフォームの下端に乗せ、かかとは外に出す。押し上げる → かかとを3秒かけてプラットフォームより下まで落とす。膝を伸ばしたまま → 腓腹筋優位。アキレス腱の耐久性を高め、累積30時間の着地衝撃に対抗する。',
      },
      {
        name: 'デッドバグ',
        sets: '3×8/側',
        keyPoint: '仰向けで腰を床に押しつけながら、対角の腕（天井方向）と脚（床方向）をゆっくり伸ばす。腰が浮いたら即停止。プランクより動的で、レース後半の体幹崩れ防止に直結する。',
      },
    ],
  },
}

// ─── Components ───────────────────────────────────────────────────────────────

function KeyPointPopup({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-stone-800 border border-stone-600 rounded-2xl p-5 max-w-sm w-full shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-stone-200 text-sm leading-relaxed">{text}</p>
        <button
          onClick={onClose}
          className="mt-4 text-xs text-stone-500 hover:text-stone-300"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

function ExerciseRow({ ex }: { ex: Exercise }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex items-center justify-between py-2.5 border-b border-stone-800/60 last:border-0 gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm text-stone-100 font-medium shrink-0">{ex.name}</span>
          <span className="text-xs text-stone-500 shrink-0">{ex.sets}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 w-5 h-5 rounded-full border border-stone-600 text-stone-500 hover:border-stone-400 hover:text-stone-300 flex items-center justify-center transition-colors text-xs font-bold"
          aria-label="詳細"
        >
          i
        </button>
      </div>
      {open && <KeyPointPopup text={ex.keyPoint} onClose={() => setOpen(false)} />}
    </>
  )
}

interface StrengthLog { id: string; strength?: { session: 'A' | 'B'; loggedAt: string } }

function SessionCard({ type }: { type: 'A' | 'B' }) {
  const session = SESSIONS[type]
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: logs } = useCollection<StrengthLog>('dailyLogs')
  const [logging, setLogging] = useState(false)

  const todayLog = logs.find(l => l.id === today)
  const donedToday = todayLog?.strength?.session === type

  const recentDone = logs
    .filter(l => l.strength?.session === type && l.id <= today)
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 3)
    .map(l => l.id)

  const handleLog = async () => {
    setLogging(true)
    try {
      await setDoc(
        doc(db, 'dailyLogs', today),
        { strength: { session: type, loggedAt: new Date().toISOString() } },
        { merge: true }
      )
    } finally { setLogging(false) }
  }

  return (
    <div className={`rounded-xl border ${session.color} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              type === 'A' ? 'bg-blue-700 text-blue-100' : 'bg-amber-700 text-amber-100'
            }`}>
              Session {type}
            </span>
            <span className="text-xs text-stone-400">{session.theme}</span>
          </div>
          {recentDone.length > 0 && (
            <p className="text-xs text-stone-600 mt-1">
              最近: {recentDone.map(d => d.slice(5)).join(' · ')}
            </p>
          )}
        </div>
        {donedToday ? (
          <span className="shrink-0 text-xs text-emerald-400 font-semibold">✓ 今日完了</span>
        ) : (
          <button
            onClick={handleLog}
            disabled={logging}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
              type === 'A'
                ? 'bg-blue-700 hover:bg-blue-600 text-white'
                : 'bg-amber-700 hover:bg-amber-600 text-white'
            }`}
          >
            {logging ? '記録中…' : '今日完了'}
          </button>
        )}
      </div>

      {/* Exercise list */}
      <div className="px-4 pb-3 border-t border-stone-800/60">
        {session.exercises.map(ex => (
          <ExerciseRow key={ex.name} ex={ex} />
        ))}
      </div>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function StrengthPlan() {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">筋トレ</h2>
        <span className="text-xs text-stone-600">週2回・各30分</span>
      </div>
      <SessionCard type="A" />
      <SessionCard type="B" />
    </section>
  )
}

// 週次カレンダー用に筋トレ記録済み日を返す hook
export function useStrengthLogs() {
  const { data: logs } = useCollection<StrengthLog>('dailyLogs')
  const map: Record<string, 'A' | 'B'> = {}
  for (const l of logs) {
    if (l.strength?.session) map[l.id] = l.strength.session
  }
  return map
}
