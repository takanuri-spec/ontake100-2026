import { useState, useCallback } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { useSubCollection } from '@/hooks/useFirestore'
import { db } from '@/lib/firebase'
import { getSegmentStats } from '@/lib/gpx'
import type { GpxPoint } from '@/lib/gpx'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Checkpoint {
  id: string
  name: string
  distKm: number
  cutoffFromStartMin: number // 0 = no cutoff
}

interface SegPlan {
  id: string
  paceStr: string   // "8:30" format
  carbGPerH: number
  waterMlPerH: number
  notes: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePace(s: string): number {
  const parts = s.split(':')
  const m = parseInt(parts[0] ?? '10', 10)
  const sec = parseInt(parts[1] ?? '0', 10)
  if (isNaN(m)) return 10
  return m + (isNaN(sec) ? 0 : sec) / 60
}

function fmtHM(totalMin: number): string {
  if (!isFinite(totalMin) || totalMin < 0) return '--:--'
  const h = Math.floor(totalMin / 60)
  const m = Math.round(totalMin % 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

// ─── Segment card ─────────────────────────────────────────────────────────────

interface CardProps {
  raceId: string
  segIdx: number
  from: Checkpoint
  to: Checkpoint
  plan: SegPlan | undefined
  prevEtaMin: number
  points: GpxPoint[]
  editing: boolean
}

function SegmentCard({
  raceId, segIdx, from, to, plan, prevEtaMin, points, editing,
}: CardProps) {
  const stats = getSegmentStats(points, from.distKm, to.distKm)

  const init = {
    paceStr: plan?.paceStr ?? '10:00',
    carb:    plan?.carbGPerH ?? 60,
    water:   plan?.waterMlPerH ?? 500,
    notes:   plan?.notes ?? '',
  }

  const [paceStr, setPaceStr] = useState(init.paceStr)
  const [carb, setCarb]       = useState(init.carb)
  const [water, setWater]     = useState(init.water)
  const [notes, setNotes]     = useState(init.notes)

  const segTimeMin = parsePace(paceStr) * stats.distKm
  const etaMin = prevEtaMin + segTimeMin

  const hasCutoff = to.cutoffFromStartMin > 0
  const bufferMin = hasCutoff ? to.cutoffFromStartMin - etaMin : Infinity
  const bufferOk = !hasCutoff || bufferMin >= 0

  const save = useCallback(async () => {
    const pace = parsePace(paceStr)
    if (isNaN(pace)) return
    await setDoc(
      doc(db, 'races', raceId, 'racePlan', `seg-${segIdx}`),
      { paceStr, paceMinPerKm: pace, carbGPerH: carb, waterMlPerH: water, notes },
      { merge: true },
    )
  }, [raceId, segIdx, paceStr, carb, water, notes])

  const inputCls =
    'bg-stone-800 border border-stone-600 rounded px-2 py-0.5 text-xs text-stone-200 text-center'

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 overflow-hidden">
      {/* Header row */}
      <div className="px-4 py-2.5 bg-stone-800/50 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-200">
          {from.name}
          <span className="text-stone-500 mx-1.5">→</span>
          {to.name}
        </span>
        <span className="text-xs text-stone-500 font-mono shrink-0">{stats.distKm}km</span>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {/* Terrain */}
        <div className="flex gap-4 text-xs">
          <span className="text-stone-500">D+ <span className="text-emerald-400">+{stats.ascent}m</span></span>
          <span className="text-stone-500">D- <span className="text-red-400">-{stats.descent}m</span></span>
        </div>

        {/* Pace + segment time */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-stone-500">ペース</span>
          {editing ? (
            <input
              type="text"
              value={paceStr}
              onChange={e => setPaceStr(e.target.value)}
              onBlur={save}
              className={`${inputCls} w-14`}
              placeholder="8:30"
            />
          ) : (
            <span className="font-mono text-stone-200">{paceStr}</span>
          )}
          <span className="text-stone-500">/km</span>
          <span className="text-stone-600">→</span>
          <span className="font-mono text-stone-300">{fmtHM(segTimeMin)}</span>
        </div>

        {/* ETA + cutoff */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-stone-500">到着</span>
          <span className="font-mono font-semibold text-stone-100">{fmtHM(etaMin)}</span>
          {hasCutoff && (
            <>
              <span className="text-stone-700">|</span>
              <span className="text-stone-500">関門</span>
              <span className="font-mono text-red-300">{fmtHM(to.cutoffFromStartMin)}</span>
              <span className={`font-mono font-semibold text-xs ${bufferOk ? 'text-emerald-400' : 'text-red-400'}`}>
                ({bufferOk ? '+' : '-'}{fmtHM(Math.abs(bufferMin))})
              </span>
            </>
          )}
        </div>

        {/* Fuel */}
        <div className="flex gap-4 text-xs items-center">
          <span className="text-stone-500">補給</span>
          {editing ? (
            <input
              type="number"
              value={carb}
              onChange={e => setCarb(Number(e.target.value))}
              onBlur={save}
              className={`${inputCls} w-12`}
            />
          ) : (
            <span className="text-stone-300">{carb}</span>
          )}
          <span className="text-stone-500">g/h</span>
          <span className="text-stone-500">水</span>
          {editing ? (
            <input
              type="number"
              value={water}
              onChange={e => setWater(Number(e.target.value))}
              onBlur={save}
              className={`${inputCls} w-14`}
            />
          ) : (
            <span className="text-stone-300">{water}</span>
          )}
          <span className="text-stone-500">mL/h</span>
        </div>

        {/* Notes */}
        {(editing || notes) && (
          editing ? (
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={save}
              className="w-full bg-stone-800 border border-stone-600 rounded px-2 py-0.5 text-xs text-stone-200"
              placeholder="メモ（ドロップバッグ・装備変更など）"
            />
          ) : (
            <p className="text-xs text-stone-500 italic">{notes}</p>
          )
        )}
      </div>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

interface Props {
  raceId: string
  checkpoints: Checkpoint[]
  points: GpxPoint[]
  startOffsetMin?: number // minutes from midnight (0 = midnight start)
}

export function RacePlanTable({ raceId, checkpoints, points, startOffsetMin = 0 }: Props) {
  const [editing, setEditing] = useState(false)
  const { data: plans, loading } = useSubCollection<SegPlan>(`races/${raceId}`, 'racePlan')

  const planMap: Record<string, SegPlan> = {}
  for (const p of plans) planMap[p.id] = p

  // Compute cumulative ETAs
  const etas: number[] = [startOffsetMin]
  for (let i = 1; i < checkpoints.length; i++) {
    const plan = planMap[`seg-${i - 1}`]
    const pace = parsePace(plan?.paceStr ?? '10:00')
    const dist = checkpoints[i].distKm - checkpoints[i - 1].distKm
    etas.push(etas[i - 1] + pace * dist)
  }

  const totalMin = etas[etas.length - 1] - startOffsetMin

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-stone-500">
          計画合計:{' '}
          <span className="text-stone-200 font-mono font-semibold">{fmtHM(totalMin)}</span>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
            editing
              ? 'bg-emerald-700 text-white hover:bg-emerald-600'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          {editing ? '完了' : '編集'}
        </button>
      </div>

      {loading ? (
        <div className="text-stone-600 text-sm py-4 text-center">読み込み中…</div>
      ) : (
        // key forces remount after initial Firestore load so SegmentCards get correct initial state
        <div key="loaded" className="space-y-2">
          {checkpoints.slice(0, -1).map((from, i) => (
            <SegmentCard
              key={i}
              raceId={raceId}
              segIdx={i}
              from={from}
              to={checkpoints[i + 1]}
              plan={planMap[`seg-${i}`]}
              prevEtaMin={etas[i]}
              points={points}
              editing={editing}
            />
          ))}
        </div>
      )}
    </div>
  )
}
