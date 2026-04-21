import { useState, useMemo, useRef, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, ReferenceDot,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { ParsedGpx, GpxPoint } from '@/lib/gpx'

interface Aid { distanceKm: number; name: string }

// ─── SVG top-down map ─────────────────────────────────────────────────────────

// Compute best label offset using the track normal at the marker position
function labelOffset(
  mx: number, my: number,
  projPts: [number, number][],
  W: number, H: number,
): { dx: number; dy: number; anchor: 'inherit' | 'middle' | 'start' | 'end' } {
  // Find closest projected point
  let ci = 0, minD = Infinity
  for (let i = 0; i < projPts.length; i++) {
    const d = Math.hypot(projPts[i][0] - mx, projPts[i][1] - my)
    if (d < minD) { minD = d; ci = i }
  }
  // Local tangent over ±8 points
  const i0 = Math.max(0, ci - 8)
  const i1 = Math.min(projPts.length - 1, ci + 8)
  const tx = projPts[i1][0] - projPts[i0][0]
  const ty = projPts[i1][1] - projPts[i0][1]
  const len = Math.hypot(tx, ty) || 1
  // Two normals (perpendicular to tangent)
  const n1x = -ty / len, n1y = tx / len
  const n2x = ty / len,  n2y = -tx / len
  const D = 13
  // Candidates: both normals, then pure up/down as fallback
  const cands: { dx: number; dy: number; anchor: 'inherit' | 'middle' | 'start' | 'end' }[] = [
    { dx: n1x * D, dy: n1y * D, anchor: Math.abs(n1x) < 0.4 ? 'middle' : n1x > 0 ? 'start' : 'end' },
    { dx: n2x * D, dy: n2y * D, anchor: Math.abs(n2x) < 0.4 ? 'middle' : n2x > 0 ? 'start' : 'end' },
    { dx: 0, dy: -D, anchor: 'middle' },
    { dx: 0, dy: D + 5, anchor: 'middle' },
  ]
  const PAD = 14
  for (const c of cands) {
    const lx = mx + c.dx, ly = my + c.dy
    if (lx > PAD && lx < W - PAD && ly > PAD && ly < H - PAD) return c
  }
  return cands[2]
}

function SvgMap({
  gpx, aids, hoverKm,
}: {
  gpx: ParsedGpx
  aids: Aid[]
  hoverKm: number | null
}) {
  const W = 400
  const H = 260
  const pad = 20

  const { minLat, maxLat, minLon, maxLon } = gpx.bbox
  const midLat = (minLat + maxLat) / 2
  const cosLat = Math.cos((midLat * Math.PI) / 180)

  const lonSpanGeo = (maxLon - minLon) * cosLat
  const latSpan = maxLat - minLat
  const scaleX = (W - 2 * pad) / lonSpanGeo
  const scaleY = (H - 2 * pad) / latSpan
  const scale = Math.min(scaleX, scaleY)
  const drawW = lonSpanGeo * scale
  const drawH = latSpan * scale
  const offX = (W - drawW) / 2
  const offY = (H - drawH) / 2

  const toXY = (lat: number, lon: number): [number, number] => [
    offX + (lon - minLon) * cosLat * scale,
    offY + (maxLat - lat) * scale,
  ]

  // Pre-compute projected points for normal calculation
  const projPts = useMemo(
    () => gpx.points.map(p => toXY(p.lat, p.lon) as [number, number]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gpx.points],
  )
  const polyPts = projPts.map(([x, y]) => `${x},${y}`).join(' ')

  const aidMarkers = useMemo(() => aids.map(a => {
    const closest = gpx.points.reduce((b, p) =>
      Math.abs(p.cumDist - a.distanceKm) < Math.abs(b.cumDist - a.distanceKm) ? p : b,
    )
    const [x, y] = toXY(closest.lat, closest.lon)
    const off = labelOffset(x, y, projPts, W, H)
    return { ...a, x, y, off }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [aids, gpx.points, projPts])

  const [sx, sy] = toXY(gpx.points[0].lat, gpx.points[0].lon)
  const last = gpx.points[gpx.points.length - 1]
  const [fx, fy] = toXY(last.lat, last.lon)

  // Detect loop: start and finish within 10px → render as single S/G marker
  const isLoop = Math.hypot(fx - sx, fy - sy) < 10

  const hoverPt = useMemo(() => {
    if (hoverKm === null) return null
    const closest = gpx.points.reduce((b, p) =>
      Math.abs(p.cumDist - hoverKm) < Math.abs(b.cumDist - hoverKm) ? p : b,
    )
    const [x, y] = toXY(closest.lat, closest.lon)
    return { x, y, ele: Math.round(closest.ele), km: closest.cumDist.toFixed(1) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverKm, gpx.points])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl" style={{ background: '#ffffff' }}>
      {/* Course line */}
      <polyline points={polyPts} fill="none" stroke="#1c1917" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.65" />

      {/* Start / Finish markers */}
      {isLoop ? (
        // Loop course: single dot with S/G label
        <g>
          <circle cx={sx} cy={sy} r={4.5} fill="#1c1917" />
          <text x={sx} y={sy - 8} fontSize={7} fill="#1c1917" textAnchor="middle" fontWeight="bold"
            style={{ paintOrder: 'stroke' }} stroke="white" strokeWidth="2.5">S/G</text>
        </g>
      ) : (
        <>
          {/* Start */}
          <g>
            <circle cx={sx} cy={sy} r={4.5} fill="#1c1917" />
            <text x={sx} y={sy - 8} fontSize={7} fill="#1c1917" textAnchor="middle" fontWeight="bold"
              style={{ paintOrder: 'stroke' }} stroke="white" strokeWidth="2.5">S</text>
          </g>
          {/* Finish */}
          <g>
            <circle cx={fx} cy={fy} r={4.5} fill="#1c1917" />
            <text x={fx} y={fy - 8} fontSize={7} fill="#1c1917" textAnchor="middle" fontWeight="bold"
              style={{ paintOrder: 'stroke' }} stroke="white" strokeWidth="2.5">G</text>
          </g>
        </>
      )}

      {/* Aid station markers */}
      {aidMarkers.map((a, i) => {
        const lx = a.x + a.off.dx
        const ly = a.y + a.off.dy
        const label = `${a.distanceKm}k`
        return (
          <g key={i}>
            <circle cx={a.x} cy={a.y} r={3.5} fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
            {/* White knockout behind text */}
            <text x={lx} y={ly + 3} fontSize={7} fill="white" textAnchor={a.off.anchor}
              fontWeight="bold" stroke="white" strokeWidth="3" strokeLinejoin="round"
              style={{ paintOrder: 'stroke' }}>
              {label}
            </text>
            <text x={lx} y={ly + 3} fontSize={7} fill="#dc2626" textAnchor={a.off.anchor} fontWeight="bold">
              {label}
            </text>
          </g>
        )
      })}

      {/* Hover pointer */}
      {hoverPt && (
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={hoverPt.x} cy={hoverPt.y} r={8} fill="#f59e0b" opacity="0.18">
            <animate attributeName="r" values="8;12;8" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0.07;0.25" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={hoverPt.x} cy={hoverPt.y} r={4.5} fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
          <g transform={`translate(${Math.min(Math.max(hoverPt.x, 38), W - 38)}, ${
            hoverPt.y < 24 ? hoverPt.y + 18 : hoverPt.y - 14
          })`}>
            <rect x={-32} y={-11} width={64} height={14} rx={4} fill="white"
              style={{ filter: 'drop-shadow(0 1px 5px rgba(0,0,0,0.16))' }} />
            <text x={0} y={-1} fontSize={8} fill="#1c1917" textAnchor="middle"
              fontFamily="monospace" fontWeight="600">
              {hoverPt.km}km · {hoverPt.ele}m
            </text>
          </g>
        </g>
      )}
    </svg>
  )
}

// ─── Elevation profile ────────────────────────────────────────────────────────

interface AidDot { d: number; e: number; name: string; km: number }

function ElevationProfile({
  gpx, aids, onHover,
}: {
  gpx: ParsedGpx
  aids: Aid[]
  onHover: (km: number | null) => void
}) {
  // Further downsample to 500 points for recharts performance
  const data = useMemo(() => {
    const step = Math.max(1, Math.floor(gpx.points.length / 500))
    return gpx.points
      .filter((_, i) => i === 0 || i === gpx.points.length - 1 || i % step === 0)
      .map(p => ({
        d: parseFloat(p.cumDist.toFixed(2)),
        e: Math.round(p.ele),
      }))
  }, [gpx.points])

  const eles = data.map(d => d.e)
  const domainMin = Math.floor(Math.min(...eles) / 100) * 100
  const domainMax = Math.ceil(Math.max(...eles) / 100) * 100

  // CP dots: snap each aid to closest GPX point so the dot sits on the elevation line
  const aidDots: AidDot[] = useMemo(() => {
    return aids.map(a => {
      const pt: GpxPoint = gpx.points.reduce((b, p) =>
        Math.abs(p.cumDist - a.distanceKm) < Math.abs(b.cumDist - a.distanceKm) ? p : b,
      )
      return {
        d: parseFloat(pt.cumDist.toFixed(2)),
        e: Math.round(pt.ele),
        name: a.name,
        km: a.distanceKm,
      }
    })
  }, [gpx.points, aids])

  const totalKm = parseFloat(gpx.totalDistKm.toFixed(2))

  // タッチイベントでタッチX座標をkm値に変換するためのref
  const containerRef = useRef<HTMLDivElement>(null)

  // プロット領域のオフセット計算:
  //   左: px-1 padding (4px) + YAxis width (38px) + margin.left (-8px) = 34px
  //   右: px-1 padding (4px) + margin.right (4px) = 8px
  const PLOT_LEFT = 34
  const PLOT_RIGHT = 8

  const touchKmFromEvent = (touch: Touch): number | null => {
    if (!containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const plotWidth = rect.width - PLOT_LEFT - PLOT_RIGHT
    const x = touch.clientX - rect.left - PLOT_LEFT
    const ratio = Math.max(0, Math.min(1, x / plotWidth))
    return ratio * totalKm
  }

  // passive: false でスクロールをキャンセルしつつタッチ追従
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onStart = (e: TouchEvent) => {
      e.preventDefault()
      const km = touchKmFromEvent(e.touches[0])
      if (km !== null) onHover(km)
    }
    const onMove = (e: TouchEvent) => {
      e.preventDefault()
      const km = touchKmFromEvent(e.touches[0])
      if (km !== null) onHover(km)
    }
    const onEnd = () => onHover(null)
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  // totalKm と onHover が変わったら再登録
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalKm, onHover])

  return (
    <div
      className="h-44 px-1"
      ref={containerRef}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 16, right: 4, left: -8, bottom: 0 }}
          onMouseMove={(s: { activeLabel?: number | string }) => {
            if (s && s.activeLabel !== undefined && s.activeLabel !== null) {
              const km = Number(s.activeLabel)
              if (!isNaN(km)) onHover(km)
            }
          }}
          onMouseLeave={() => onHover(null)}
        >
          <defs>
            <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1c1917" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1c1917" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <XAxis
            type="number"
            dataKey="d"
            domain={[0, totalKm]}
            tick={{ fill: '#78716c', fontSize: 9 }}
            tickCount={7}
            tickFormatter={v => `${v}k`}
            allowDecimals={false}
          />
          <YAxis
            tick={{ fill: '#78716c', fontSize: 9 }}
            width={38}
            domain={[domainMin, domainMax]}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              borderRadius: 10,
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              fontSize: 11,
              color: '#1c1917',
            }}
            formatter={((v: unknown) => [`${v}m`, '標高']) as never}
            labelFormatter={((v: unknown) => `${Number(v).toFixed(1)}km`) as never}
            cursor={{ stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '4 3' }}
          />
          {aidDots.map((dot, i) => (
            <ReferenceLine
              key={`l-${i}`}
              x={dot.d}
              stroke="#ef444466"
              strokeDasharray="3 2"
            />
          ))}
          <Area
            type="monotone"
            dataKey="e"
            stroke="#1c1917"
            fill="url(#eGrad)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {/* CP dots on elevation line */}
          {aidDots.map((dot, i) => (
            <ReferenceDot
              key={`d-${i}`}
              x={dot.d}
              y={dot.e}
              r={4}
              fill="#ef4444"
              stroke="#0c0a09"
              strokeWidth={1.5}
              ifOverflow="visible"
              label={{
                value: `${dot.km}k`,
                position: 'top',
                fill: '#fca5a5',
                fontSize: 8,
                offset: 6,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function CourseMap({ gpx, aids = [] }: { gpx: ParsedGpx; aids?: Aid[] }) {
  const [hoverKm, setHoverKm] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {/* Map card */}
      <div className="rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
        <SvgMap gpx={gpx} aids={aids} hoverKm={hoverKm} />
      </div>
      {/* Elevation card */}
      <div className="rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)] px-2 pt-4 pb-2">
        <ElevationProfile gpx={gpx} aids={aids} onHover={setHoverKm} />
        <div className="flex gap-4 text-xs text-stone-400 justify-center pt-3 pb-1">
          <span>距離: <span className="text-stone-700 font-semibold">{gpx.totalDistKm.toFixed(1)}km</span></span>
          <span>D+: <span className="text-stone-700 font-semibold">+{gpx.totalAscent.toLocaleString()}m</span></span>
          <span>D-: <span className="text-stone-700 font-semibold">-{gpx.totalDescent.toLocaleString()}m</span></span>
        </div>
      </div>
    </div>
  )
}
