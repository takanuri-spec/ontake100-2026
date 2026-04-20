import { useState } from 'react'
import { addDays, format, isToday, isWithinInterval, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { doc, setDoc } from 'firebase/firestore'
import { useCollection } from '@/hooks/useFirestore'
import { useStrava, type StoredActivity } from '@/hooks/useStrava'
import { stravaAuthUrl } from '@/lib/strava'
import { db } from '@/lib/firebase'
import StrengthPlan, { useStrengthLogs } from '@/components/StrengthPlan'

interface WeekPlan {
  id: string; week: number; startDate: string; phase: string
  targetKm: number; targetElevM: number; notes: string
}

interface DailyLog {
  id: string
  workout?: { km: number; elevM: number; durationMin: number; fuelGPerHour: number | null; giLevel: string }
}

const RACE_DATE = '2026-07-19'
const PLAN_START = '2026-04-19'
const SIM_DATES: Record<string, string> = {
  '2026-06-14': 'Toki River',
  '2026-06-21': '翠夏巡嶺',
  '2026-07-18': 'Ontake出発',
  '2026-07-19': 'ONTAKE100',
}

const PHASE_STYLE: Record<string, { badge: string; row: string }> = {
  Base:   { badge: 'bg-blue-100 text-blue-700',       row: 'bg-blue-50' },
  Deload: { badge: 'bg-stone-100 text-stone-600',      row: 'bg-stone-50' },
  Build:  { badge: 'bg-amber-100 text-amber-700',      row: 'bg-amber-50' },
  Peak:   { badge: 'bg-red-100 text-red-700',          row: 'bg-red-50' },
  Taper:  { badge: 'bg-emerald-100 text-emerald-700',  row: 'bg-emerald-50' },
  Race:   { badge: 'bg-emerald-500 text-white',        row: 'bg-emerald-50' },
}

const GI_OPTIONS = ['なし', '軽度（膨満・げっぷ）', '中度（悪心・胃痛）', '重度（嘔吐・下痢）'] as const
type GILevel = typeof GI_OPTIONS[number]

interface WorkoutFormState {
  date: string; km: string; elevM: string; durationMin: string
  fuelGPerHour: string; giLevel: GILevel; notes: string
}

function WorkoutModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<WorkoutFormState>({
    date: format(new Date(), 'yyyy-MM-dd'),
    km: '', elevM: '', durationMin: '', fuelGPerHour: '', giLevel: 'なし', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const set = (field: keyof WorkoutFormState) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  )

  const handleSave = async () => {
    if (!form.km || !form.durationMin) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'dailyLogs', form.date),
        { workout: {
            km: parseFloat(form.km),
            elevM: form.elevM ? parseInt(form.elevM) : 0,
            durationMin: parseInt(form.durationMin),
            fuelGPerHour: form.fuelGPerHour ? parseFloat(form.fuelGPerHour) : null,
            giLevel: form.giLevel, notes: form.notes,
            loggedAt: new Date().toISOString(),
        }},
        { merge: true }
      )
      onClose()
    } finally { setSaving(false) }
  }

  const inputClass = 'w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl w-full max-w-lg border-t border-stone-100 p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-stone-900 text-lg">ランニング記録</h3>
          <button onClick={onClose} className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 text-sm">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-stone-500 block mb-1">日付</label>
            <input type="date" value={form.date} onChange={set('date')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 block mb-1">距離 (km) *</label>
            <input type="number" inputMode="decimal" step="0.1" placeholder="例: 25.0" value={form.km} onChange={set('km')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 block mb-1">D+ (m)</label>
            <input type="number" inputMode="numeric" placeholder="例: 800" value={form.elevM} onChange={set('elevM')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 block mb-1">時間 (分) *</label>
            <input type="number" inputMode="numeric" placeholder="例: 180" value={form.durationMin} onChange={set('durationMin')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 block mb-1">補給 (g/h)</label>
            <input type="number" inputMode="decimal" step="5" placeholder="例: 60" value={form.fuelGPerHour} onChange={set('fuelGPerHour')} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 block mb-1">GI症状</label>
            <select value={form.giLevel} onChange={set('giLevel')} className={inputClass}>
              {GI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-500 block mb-1">メモ</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2}
            placeholder="天候・感覚・気づきなど" className={`${inputClass} resize-none`} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-500 text-sm font-semibold">
            キャンセル
          </button>
          <button onClick={handleSave} disabled={!form.km || !form.durationMin || saving}
            className="flex-1 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-sm font-bold transition-colors">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return <div className="text-stone-400 text-sm py-8 text-center">読み込み中…</div>
}

interface WeekActuals { km: number; elevM: number; sessions: number; fuelLogs: number[] }

function WeekRow({ wp, actuals, strengthMap }: { wp: WeekPlan; actuals: WeekActuals; strengthMap: Record<string, 'A' | 'B'> }) {
  const style = PHASE_STYLE[wp.phase] ?? PHASE_STYLE.Base
  const start = parseISO(wp.startDate)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const daysToRace = Math.ceil((parseISO(RACE_DATE).getTime() - start.getTime()) / 86400000)
  const hasTarget = wp.targetKm > 0
  const kmPct = hasTarget ? Math.min(100, Math.round((actuals.km / wp.targetKm) * 100)) : 0
  const elevPct = hasTarget && wp.targetElevM > 0
    ? Math.min(100, Math.round((actuals.elevM / wp.targetElevM) * 100)) : 0

  return (
    <div className="rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`${style.row} px-3 py-2 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-stone-400 font-mono w-5 shrink-0">W{wp.week}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>{wp.phase}</span>
          <span className="text-xs text-stone-500 truncate">{wp.notes}</span>
        </div>
        <div className="flex gap-3 text-xs text-stone-400 shrink-0">
          {hasTarget && (
            <>
              <span><span className="text-stone-800 font-semibold">{wp.targetKm}</span>km</span>
              <span>+<span className="text-stone-800 font-semibold">{wp.targetElevM.toLocaleString()}</span>m</span>
            </>
          )}
          <span className="text-stone-300 tabular-nums">残{daysToRace}日</span>
        </div>
      </div>

      {/* Day strip */}
      <div className="flex px-3 py-2 gap-1">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const event = SIM_DATES[key]
          const today = isToday(day)
          return (
            <div key={key} className={`flex-1 rounded-lg py-1.5 text-center ${
              event === 'ONTAKE100' ? 'bg-emerald-500' :
              event ? 'bg-blue-500' :
              today ? 'bg-stone-300' : 'bg-stone-100'
            }`}>
              <div className={`text-xs ${today ? 'text-stone-800 font-bold' : event ? 'text-white/80' : 'text-stone-400'}`}>
                {format(day, 'E', { locale: ja })}
              </div>
              {event && (
                <div className="text-xs text-white/90 leading-tight truncate px-0.5 font-bold">
                  {event.split(' ')[0]}
                </div>
              )}
              {strengthMap[key] && !event && (
                <div className={`text-xs font-bold leading-tight ${
                  strengthMap[key] === 'A' ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  S{strengthMap[key]}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actuals bar */}
      {actuals.sessions > 0 && hasTarget && (
        <div className="px-3 pb-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 w-6 text-right">km</span>
            <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${kmPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${kmPct}%` }} />
            </div>
            <span className={`tabular-nums w-16 text-right font-semibold ${kmPct >= 100 ? 'text-emerald-600' : 'text-stone-700'}`}>
              {actuals.km.toFixed(1)}/{wp.targetKm}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 w-6 text-right">D+</span>
            <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${elevPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${elevPct}%` }} />
            </div>
            <span className={`tabular-nums w-16 text-right font-semibold ${elevPct >= 100 ? 'text-emerald-600' : 'text-stone-700'}`}>
              {actuals.elevM.toLocaleString()}/{wp.targetElevM.toLocaleString()}m
            </span>
          </div>
          {actuals.fuelLogs.length > 0 && (
            <div className="text-xs text-stone-400 pt-0.5">
              補給 avg: <span className="text-stone-700 font-semibold">
                {Math.round(actuals.fuelLogs.reduce((a, b) => a + b, 0) / actuals.fuelLogs.length)} g/h
              </span>
              <span className="ml-2 text-stone-300">({actuals.sessions}セッション)</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Training() {
  const { data: plan, loading: planLoading } = useCollection<WeekPlan>('trainingPlan')
  const { data: logs } = useCollection<DailyLog>('dailyLogs')
  const { data: rawActivities } = useCollection<StoredActivity>('activities')
  const activities = rawActivities.filter(a => a.date >= PLAN_START)
  const { isConnected, authDoc, syncing, syncError, lastSyncCount, syncActivities } = useStrava()
  const strengthMap = useStrengthLogs()
  const sorted = [...plan].sort((a, b) => a.week - b.week)
  const [showModal, setShowModal] = useState(false)

  const getActuals = (wp: WeekPlan): WeekActuals => {
    const start = parseISO(wp.startDate)
    const end = addDays(start, 6)
    const inWeek = (dateStr: string) => {
      try { return isWithinInterval(parseISO(dateStr), { start, end }) }
      catch { return false }
    }

    const weekActivities = activities.filter(a => inWeek(a.date))
    const coveredDates = new Set(weekActivities.map(a => a.date))
    const weekLogs = logs.filter(l => inWeek(l.id) && !coveredDates.has(l.id))

    const fromActivities = weekActivities.reduce<WeekActuals>((acc, a) => ({
      km: acc.km + a.distanceKm,
      elevM: acc.elevM + a.elevationGainM,
      sessions: acc.sessions + 1,
      fuelLogs: acc.fuelLogs,
    }), { km: 0, elevM: 0, sessions: 0, fuelLogs: [] })

    return weekLogs.reduce<WeekActuals>((acc, l) => {
      if (!l.workout) return acc
      return {
        km: acc.km + l.workout.km,
        elevM: acc.elevM + l.workout.elevM,
        sessions: acc.sessions + 1,
        fuelLogs: l.workout.fuelGPerHour != null
          ? [...acc.fuelLogs, l.workout.fuelGPerHour]
          : acc.fuelLogs,
      }
    }, fromActivities)
  }

  const totalKm = activities.reduce((acc, a) => acc + a.distanceKm, 0)
    + logs.filter(l => !activities.some(a => a.date === l.id)).reduce((acc, l) => acc + (l.workout?.km ?? 0), 0)
  const totalElevM = activities.reduce((acc, a) => acc + a.elevationGainM, 0)
    + logs.filter(l => !activities.some(a => a.date === l.id)).reduce((acc, l) => acc + (l.workout?.elevM ?? 0), 0)

  return (
    <div className="space-y-5">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 mb-1">トレーニング</h1>
          <p className="text-stone-400 text-sm">13週間プラン — 2026-04-19 → 07-19</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="shrink-0 flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm">
          <span className="text-base leading-none">+</span>記録
        </button>
      </section>

      {/* Strava connection panel */}
      <div className={`rounded-2xl border p-4 shadow-sm ${isConnected ? 'border-orange-200 bg-orange-50' : 'border-stone-100 bg-white'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.024 4.116z" fill="#FC4C02"/>
              <path d="M11.26 13.828L9.161 9.704H6.1L11.26 19.88l5.15-10.176h-3.066l-2.084 4.124z" fill="#FC4C02" opacity=".6"/>
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-bold text-stone-900">
                {isConnected ? 'Strava 連携中' : 'Strava 未連携'}
              </p>
              {isConnected && authDoc?.lastSyncAt && (
                <p className="text-xs text-stone-400">
                  最終同期: {new Date(authDoc.lastSyncAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {lastSyncCount !== null && (
                <p className="text-xs text-emerald-600 font-semibold">{lastSyncCount}件同期完了</p>
              )}
              {syncError && <p className="text-xs text-red-500">{syncError}</p>}
            </div>
          </div>

          {isConnected ? (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => syncActivities(false)}
                disabled={syncing}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#FC4C02] hover:opacity-90 disabled:opacity-50 text-white font-bold transition-colors"
              >
                {syncing ? '同期中…' : '更新'}
              </button>
              <button
                onClick={() => syncActivities(true)}
                disabled={syncing}
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 disabled:opacity-50 transition-colors"
              >
                全取込
              </button>
            </div>
          ) : (
            <a
              href={stravaAuthUrl()}
              className="shrink-0 text-xs px-4 py-2 rounded-xl bg-[#FC4C02] hover:opacity-90 text-white font-bold transition-colors"
            >
              連携する
            </a>
          )}
        </div>
      </div>

      {/* Season totals */}
      {(activities.length > 0 || logs.some(l => l.workout)) && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '累計距離',     value: `${totalKm.toFixed(0)} km` },
            { label: '累計D+',       value: `+${totalElevM.toLocaleString()} m` },
            { label: 'セッション数', value: `${activities.length + logs.filter(l => l.workout && !activities.some(a => a.date === l.id)).length} 回` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 text-center border border-stone-100 shadow-sm">
              <div className="text-emerald-600 font-black text-sm">{s.value}</div>
              <div className="text-stone-400 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Phase legend */}
      <div className="flex gap-2 flex-wrap text-xs">
        {Object.entries(PHASE_STYLE).map(([phase, s]) => (
          <span key={phase} className={`px-2.5 py-0.5 rounded-full font-bold ${s.badge}`}>{phase}</span>
        ))}
      </div>

      {planLoading ? <Spinner /> : (
        <div className="space-y-2">
          {sorted.map(wp => <WeekRow key={wp.id} wp={wp} actuals={getActuals(wp)} strengthMap={strengthMap} />)}
        </div>
      )}

      <StrengthPlan />

      <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-stone-400 text-sm bg-white">
        Strava実績オーバーレイ · CTL/ATL/TSBチャート — Phase 2 実装予定
      </div>

      {showModal && <WorkoutModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
