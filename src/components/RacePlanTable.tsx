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
    'bg-white rounded-xl px-3 py-2 text-sm font-mono text-stone-900 text-center shadow-[0_2px_8px_rgba(0,0,0,0.10)] outline-none focus:shadow-[0_2px_12px_rgba(0,0,0,0.18)] transition-shadow w-full'

  return (
    <div className="rounded-2xl bg-white overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.09)]">
      {/* Header row */}
      <div className="px-4 py-3 bg-stone-50 flex items-center justify-between gap-2 border-b border-stone-100">
        <span className="text-sm font-bold text-stone-900">
          {from.name}
          <span className="text-stone-300 mx-2">→</span>
          {to.name}
        </span>
        <span className="text-xs text-stone-400 font-mono shrink-0">{stats.distKm}km</span>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Terrain */}
        <div className="flex gap-4 text-sm">
          <span className="text-stone-500">D+ <span className="font-semibold text-stone-800">+{stats.ascent}m</span></span>
          <span className="text-stone-500">D- <span className="font-semibold text-stone-800">-{stats.descent}m</span></span>
        </div>

        {/* Pace + segment time */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">ペース</span>
          <div className="flex items-center gap-3">
            {editing ? (
              <input
                type="text"
                value={paceStr}
                onChange={e => setPaceStr(e.target.value)}
                onBlur={save}
                className={`${inputCls} max-w-[80px]`}
                placeholder="8:30"
              />
            ) : (
              <span className="font-mono font-bold text-lg text-stone-900">{paceStr}</span>
            )}
            <span className="text-stone-400 text-sm">/km</span>
            <span className="text-stone-300">→</span>
            <span className="font-mono text-stone-700 font-semibold">{fmtHM(segTimeMin)}</span>
          </div>
        </div>

        {/* ETA + cutoff */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">到着予定</span>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-lg text-stone-900">{fmtHM(etaMin)}</span>
            {hasCutoff && (
              <>
                <span className="text-stone-200">|</span>
                <span className="text-stone-400 text-sm">関門 <span className="font-mono text-stone-700">{fmtHM(to.cutoffFromStartMin)}</span></span>
                <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded-lg ${
                  bufferOk
                    ? 'bg-stone-100 text-stone-700'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {bufferOk ? '+' : '-'}{fmtHM(Math.abs(bufferMin))}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Fuel */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">補給</span>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <div className="text-xs text-stone-400">炭水化物</div>
              {editing ? (
                <input type="number" value={carb}
                  onChange={e => setCarb(Number(e.target.value))} onBlur={save}
                  className={inputCls} />
              ) : (
                <div className="font-mono font-bold text-stone-900">{carb}<span className="text-xs text-stone-400 font-normal ml-1">g/h</span></div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="text-xs text-stone-400">水分</div>
              {editing ? (
                <input type="number" value={water}
                  onChange={e => setWater(Number(e.target.value))} onBlur={save}
                  className={inputCls} />
              ) : (
                <div className="font-mono font-bold text-stone-900">{water}<span className="text-xs text-stone-400 font-normal ml-1">mL/h</span></div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {(editing || notes) && (
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">メモ</span>
            {editing ? (
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={save}
                className={`${inputCls} max-w-full text-left`}
                placeholder="ドロップバッグ・装備変更など"
              />
            ) : (
              <p className="text-sm text-stone-600">{notes}</p>
            )}
          </div>
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
    <div className="space-y-3 p-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-stone-500">
          計画合計:{' '}
          <span className="text-stone-900 font-mono font-bold">{fmtHM(totalMin)}</span>
        </div>
        <button
          onClick={() => setEditing(e => !e)}
          className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
            editing
              ? 'bg-stone-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]'
              : 'bg-white text-stone-700 shadow-[0_4px_12px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.18)]'
          }`}
        >
          {editing ? '完了' : '編集'}
        </button>
      </div>

      {loading ? (
        <div className="text-stone-400 text-sm py-4 text-center">読み込み中…</div>
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
