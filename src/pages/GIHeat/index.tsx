import { useState } from 'react'
import { differenceInDays, format, parseISO, startOfWeek, subDays } from 'date-fns'
import { doc, setDoc } from 'firebase/firestore'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, ScatterChart, Scatter, ZAxis,
} from 'recharts'
import { useDoc, useCollection } from '@/hooks/useFirestore'
import { db } from '@/lib/firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GutRampStep { weekRange: string; targetGPerHour: number }
interface GIHeatPlan {
  id: string
  probioticStartDate: string; probioticProduct: string; probioticNotes: string
  gutTrainingRamp: GutRampStep[]
  heatAcclimation: { startDate: string; protocol: string }
  inRaceNutrition: {
    carbGMin: number; carbGMax: number
    sodiumMgMin: number; sodiumMgMax: number
    waterMlMin: number; waterMlMax: number
  }
}
interface DailyLog {
  id: string
  workout?: { km: number; fuelGPerHour: number | null; giLevel: string }
  probioticTaken?: boolean
}
interface WeeklyHealth {
  id: string; weekStart: string
  weight?: number; heatScore?: number; loggedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAN_START = '2026-04-19'

const MILESTONES = [
  { day: 28, date: '2026-05-16', label: '効果発現域', color: 'text-blue-600' },
  { day: 57, date: '2026-06-14', label: 'Toki River', color: 'text-amber-600' },
  { day: 92, date: '2026-07-19', label: 'ONTAKE',     color: 'text-emerald-600' },
]

function getCurrentTarget(allLogs?: DailyLog[]): number {
  void allLogs
  const week = Math.ceil(differenceInDays(new Date(), parseISO(PLAN_START)) / 7) + 1
  if (week <= 2) return 40
  if (week <= 4) return 60
  if (week <= 7) return 75
  if (week <= 10) return 90
  return 75
}

const GI_COLOR: Record<string, string> = {
  'なし': '#10b981',
  '軽度（膨満・げっぷ）': '#f59e0b',
  '中度（悪心・胃痛）': '#f97316',
  '重度（嘔吐・下痢）': '#ef4444',
}

const GI_WARNINGS = [
  {
    level: '軽度 — 続けてOK',
    signs: 'げっぷ・軽い膨満感',
    action: '量を増やさず今日はキープ。これが腸トレ。慣れるサイン。',
    color: 'border-blue-200 bg-blue-50',
    text: 'text-blue-700',
  },
  {
    level: '中度 — 増量しない',
    signs: '胃もたれ・悪心・食欲消失',
    action: '今日はその量で打ち止め。翌週も同量で維持し、その翌週に再挑戦。',
    color: 'border-amber-200 bg-amber-50',
    text: 'text-amber-700',
  },
  {
    level: '重度 — 即停止',
    signs: '嘔吐・下痢・腹痛',
    action: '今日は中止。1週間回復後、2段階戻して再開。製品変更も検討。',
    color: 'border-red-200 bg-red-50',
    text: 'text-red-700',
  },
]

const PROTOCOL_STEPS = [
  { timing: '〜5月末', items: ['40→60 g/h へ段階増量（glucose:fructose 1:0.8）', '週末ロングで本番製品を必ず試す（Maurten / Mag-on）'] },
  { timing: '6月 (Peak)', items: ['70〜90 g/h 到達 — Toki River (6/14) で本番リハーサル', 'サウナ暑熱順化開始（6/21〜: 90°C × 15-20分 × 週5回）'] },
  { timing: 'T-48h (7/17〜)', items: ['低残渣食: 食物繊維 <10g/日', '白米・餅・うどん・バナナ中心。カフェインは夕方まで'] },
  { timing: 'T-90分 (22:30)', items: ['餅＋味噌汁（CHO 150g、Na 500mg）', 'アイススラリー準備'] },
  { timing: 'T-30分 (23:30)', items: ['アイススラリー摂取（プリクーリング）', 'カフェイン 100〜200mg ＋ ジェル1本'] },
]

// ─── Probiotic Tracker ────────────────────────────────────────────────────────

function ProbioticTracker({
  startDate, allLogs,
}: { startDate: string; allLogs: DailyLog[] }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const probioDay = differenceInDays(new Date(), parseISO(startDate)) + 1
  const [saving, setSaving] = useState(false)

  const past14 = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const taken = allLogs.find(l => l.id === d)?.probioticTaken === true
    return { date: d, taken, label: d.slice(5) }
  })

  let streak = 0
  for (let i = 0; i < 92; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    if (allLogs.find(l => l.id === d)?.probioticTaken === true) streak++
    else break
  }

  const daysSinceStart = Math.min(probioDay, 92)
  const takenCount = allLogs.filter(l => {
    try { return l.probioticTaken === true && l.id >= startDate && l.id <= today }
    catch { return false }
  }).length
  const compliance = Math.round((takenCount / daysSinceStart) * 100)

  const toggle = async (date: string, current: boolean) => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'dailyLogs', date), { probioticTaken: !current }, { merge: true })
    } finally { setSaving(false) }
  }

  const progressPct = Math.min(probioDay / 92 * 100, 100)

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-0.5">プロバイオティクス</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-stone-900">Day {probioDay}</span>
            <span className="text-stone-400 text-sm">/ 92</span>
          </div>
          <div className="flex gap-3 mt-1 text-xs text-stone-400">
            <span>服用率 <span className="text-stone-700 font-bold">{compliance}%</span></span>
            <span>連続 <span className="text-stone-700 font-bold">{streak}日</span></span>
          </div>
        </div>
        {/* Progress arc */}
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f5f3ef" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
              strokeDasharray={`${progressPct} 100`}
              strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-stone-600">
            {Math.round(progressPct)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-1.5 bg-stone-100 rounded-full">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Milestones */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {MILESTONES.map(m => {
          const reached = probioDay >= m.day
          const daysLeft = m.day - probioDay
          return (
            <div key={m.day} className={`shrink-0 rounded-xl px-3 py-2 text-center border ${
              reached ? 'border-stone-200 bg-white shadow-sm' : 'border-stone-100 bg-stone-50'
            }`}>
              <div className={`text-xs font-bold ${reached ? m.color : 'text-stone-400'}`}>
                Day {m.day}
              </div>
              <div className={`text-xs ${reached ? 'text-stone-600' : 'text-stone-400'}`}>{m.label}</div>
              {!reached && <div className="text-xs text-stone-300">あと{daysLeft}日</div>}
              {reached && <div className="text-xs text-emerald-500 font-bold">✓</div>}
            </div>
          )
        })}
      </div>

      {/* 14-day calendar */}
      <div className="px-4 pb-4 border-t border-stone-100 pt-3">
        <div className="text-xs text-stone-400 mb-2">直近14日（タップで遡及記録）</div>
        <div className="grid grid-cols-7 gap-1">
          {past14.map(({ date, taken, label }) => (
            <button
              key={date}
              onClick={() => toggle(date, taken)}
              disabled={saving}
              className={`rounded-xl py-1.5 text-center text-xs transition-colors ${
                taken
                  ? 'bg-emerald-100 text-emerald-700 font-bold border border-emerald-200'
                  : date === today
                  ? 'bg-stone-200 text-stone-700 border border-stone-300'
                  : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
              }`}
            >
              <div>{label}</div>
              <div>{taken ? '○' : '×'}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Gut Training ─────────────────────────────────────────────────────────────

function GutTrainingSection({ allLogs }: { allLogs: DailyLog[] }) {
  const currentTarget = getCurrentTarget()
  const [showGuide, setShowGuide] = useState(false)

  const longRuns = allLogs
    .filter(l => (l.workout?.km ?? 0) >= 15 && l.workout?.fuelGPerHour != null)
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(-10)
    .map(l => ({
      date: l.id.slice(5),
      fuel: l.workout!.fuelGPerHour as number,
      gi: l.workout!.giLevel,
      km: l.workout!.km,
      fill: GI_COLOR[l.workout!.giLevel] ?? '#10b981',
    }))

  const recentAvg = longRuns.length > 0
    ? Math.round(longRuns.slice(-6).reduce((s, r) => s + r.fuel, 0) / Math.min(longRuns.length, 6))
    : null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">腸トレーニング</h2>
        <button onClick={() => setShowGuide(v => !v)}
          className="text-xs text-stone-400 hover:text-stone-700 font-medium underline">
          {showGuide ? 'ガイドを閉じる' : 'ガイドを見る'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
          <div className="text-xs text-stone-400 mb-1 font-medium">今週の目標</div>
          <div className="text-3xl font-black text-emerald-600">{currentTarget}</div>
          <div className="text-stone-400 text-xs">g/h</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-center">
          <div className="text-xs text-stone-400 mb-1 font-medium">直近6回 平均</div>
          <div className="text-3xl font-black text-stone-800">{recentAvg ?? '—'}</div>
          <div className="text-stone-400 text-xs">g/h</div>
        </div>
      </div>

      {longRuns.length > 0 ? (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <p className="text-xs text-stone-400 mb-3">ロングラン（15km以上）の補給ログ — 点の色はGI症状</p>
          <ResponsiveContainer width="100%" height={150}>
            <ScatterChart margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f3ef" />
              <XAxis dataKey="date" tick={{ fill: '#a8a29e', fontSize: 10 }} />
              <YAxis dataKey="fuel" tick={{ fill: '#a8a29e', fontSize: 10 }} domain={[0, 100]} />
              <ZAxis range={[40, 40]} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 12, fontSize: 12 }}
                formatter={(v, n) => [n === 'fuel' ? `${v} g/h` : `${v} km`, n === 'fuel' ? '補給' : '距離']}
              />
              <ReferenceLine y={currentTarget} stroke="#10b981" strokeDasharray="4 2"
                label={{ value: `目標${currentTarget}`, fill: '#10b981', fontSize: 10 }} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Scatter data={longRuns} shape={((props: any) => (
                <circle cx={props.cx ?? 0} cy={props.cy ?? 0} r={6}
                  fill={longRuns.find(r => r.date === props.date)?.fill ?? '#10b981'}
                  opacity={0.9} />
              )) as any} />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 text-xs justify-center">
            {Object.entries(GI_COLOR).map(([label, color]) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                <span className="text-stone-400">{label.slice(0, 2)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm text-center text-stone-400 text-sm">
          ロングラン（15km以上）のログを追加すると表示されます
        </div>
      )}

      {showGuide && (
        <div className="space-y-2">
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm text-sm space-y-2">
            <p className="font-bold text-stone-800">基本ルール</p>
            <ul className="space-y-1.5 text-stone-500 text-xs">
              <li>▸ <span className="text-stone-800 font-medium">対象はロングラン（60分以上）のみ</span>。短時間では腸への刺激が不十分</li>
              <li>▸ <span className="text-stone-800 font-medium">最初の30分は水のみ</span>。その後20分ごとにジェル1本（25g CHO）</li>
              <li>▸ <span className="text-stone-800 font-medium">デュアルソース必須</span>: glucose系＋fructose系を1:0.8で。Maurtenは設計済み</li>
              <li>▸ <span className="text-stone-800 font-medium">本番製品で練習</span>。レース当日に初めて使う製品は厳禁</li>
              <li>▸ <span className="text-stone-800 font-medium">5〜10g/hずつ増量</span>。急な増量は必ず症状を引き起こす</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-stone-400 font-medium px-1">GI症状の対処</p>
            {GI_WARNINGS.map((w, i) => (
              <div key={i} className={`rounded-2xl p-3 border ${w.color}`}>
                <p className={`text-xs font-bold mb-1 ${w.text}`}>{w.level} — {w.signs}</p>
                <p className="text-xs text-stone-600">→ {w.action}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
            <p className="font-bold text-stone-800 text-sm mb-2">主な製品・食材</p>
            <table className="w-full text-xs">
              <thead><tr className="text-stone-400">
                <th className="text-left pb-1">製品</th><th className="text-right pb-1">CHO/個</th><th className="text-right pb-1">デュアル</th>
              </tr></thead>
              <tbody className="text-stone-700">
                {[
                  ['Maurten Gel 100', '25g', '✓'],
                  ['Maurten Drink Mix 160', '40g/400ml', '✓'],
                  ['Mag-on', '21g', '−'],
                  ['アスリチューン', '22〜29g', '−'],
                  ['バナナ', '〜25g', '✓'],
                  ['おにぎり（白米）', '〜30g', '−'],
                ].map(([name, cho, dual]) => (
                  <tr key={name} className="border-t border-stone-100">
                    <td className="py-1">{name}</td>
                    <td className="text-right">{cho}</td>
                    <td className={`text-right font-bold ${dual === '✓' ? 'text-emerald-600' : 'text-stone-300'}`}>{dual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Weekly Health Log ────────────────────────────────────────────────────────

function WeeklyHealthSection() {
  const { data: entries } = useCollection<WeeklyHealth>('weeklyHealth')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { data: thisWeek } = useDoc<WeeklyHealth>(`weeklyHealth/${weekStart}`)
  const [weight, setWeight] = useState('')
  const [heat, setHeat] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!weight && !heat) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'weeklyHealth', weekStart), {
        weekStart,
        ...(weight ? { weight: parseFloat(weight) } : {}),
        ...(heat ? { heatScore: parseInt(heat) } : {}),
        loggedAt: new Date().toISOString(),
      }, { merge: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const chartData = [...entries]
    .filter(e => e.weight != null)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-10)
    .map(e => ({ date: e.weekStart.slice(5), weight: e.weight }))

  const inputClass = 'w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">週次ログ（Garmin転記）</h2>

      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>今週（{weekStart}〜）</span>
          {thisWeek?.weight && <span className="text-stone-600 font-medium">記録済: {thisWeek.weight}kg / 暑熱{thisWeek.heatScore ?? '—'}%</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">体重 (kg)</label>
            <input
              type="number" inputMode="decimal" step="0.1" placeholder={thisWeek?.weight ? String(thisWeek.weight) : '例: 62.5'}
              value={weight} onChange={e => setWeight(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">暑熱スコア (0〜100)</label>
            <input
              type="number" inputMode="numeric" placeholder={thisWeek?.heatScore ? String(thisWeek.heatScore) : '例: 45'}
              value={heat} onChange={e => setHeat(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={(!weight && !heat) || saving}
          className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-sm font-bold transition-colors"
        >
          {saving ? '保存中…' : saved ? '✓ 保存完了' : '今週を記録'}
        </button>
      </div>

      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <p className="text-xs text-stone-400 mb-3 font-medium">体重トレンド（kg）</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f3ef" />
              <XAxis dataKey="date" tick={{ fill: '#a8a29e', fontSize: 10 }} />
              <YAxis tick={{ fill: '#a8a29e', fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e7e5e4', borderRadius: 12, fontSize: 12 }}
                formatter={(v) => [`${v} kg`, '体重']}
              />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function Spinner() {
  return <div className="text-stone-400 text-sm py-8 text-center">読み込み中…</div>
}

export default function GIHeat() {
  const { data: plan, loading } = useDoc<GIHeatPlan>('giHeatPlan/gi-heat-2026')
  const { data: allLogs } = useCollection<DailyLog>('dailyLogs')

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-black text-stone-900 mb-1">コンディショニング</h1>
        <p className="text-stone-400 text-sm">胃腸・発汗・熱中症対策 — 53歳・林道日射型レース特化</p>
      </section>

      {loading ? <Spinner /> : plan && (
        <ProbioticTracker startDate={plan.probioticStartDate} allLogs={allLogs} />
      )}

      <GutTrainingSection allLogs={allLogs} />

      <WeeklyHealthSection />

      {plan && (
        <section className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
          <h2 className="font-bold mb-3 text-sm text-stone-900">レース中 補給目標</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { v: `${plan.inRaceNutrition.carbGMin}–${plan.inRaceNutrition.carbGMax}`, u: 'g/h 糖質' },
              { v: `${plan.inRaceNutrition.sodiumMgMin}–${plan.inRaceNutrition.sodiumMgMax}`, u: 'mg/h Na' },
              { v: `${plan.inRaceNutrition.waterMlMin}–${plan.inRaceNutrition.waterMlMax}`, u: 'mL/h 水' },
            ].map(s => (
              <div key={s.u} className="bg-stone-50 rounded-xl p-3 border border-stone-100">
                <div className="text-emerald-600 font-black text-sm">{s.v}</div>
                <div className="text-stone-400 text-xs mt-0.5">{s.u}</div>
              </div>
            ))}
          </div>
          <p className="text-stone-400 text-xs mt-3">発汗多 → Na 上限側。登り中は固形→液体シフト。脂質・タンパク質ゼロ。</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">プロトコルタイムライン</h2>
        {PROTOCOL_STEPS.map((p, i) => (
          <details key={i} className="rounded-2xl border border-stone-100 bg-white shadow-sm group">
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
              <span className="font-bold text-sm text-stone-900">{p.timing}</span>
              <span className="text-stone-400 text-xs group-open:hidden">{p.items.length}項目</span>
            </summary>
            <ul className="px-4 pb-3 space-y-1.5 border-t border-stone-100">
              {p.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-sm text-stone-600 pt-2">
                  <span className="text-emerald-500 shrink-0">▸</span>{item}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </div>
  )
}
