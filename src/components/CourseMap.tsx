import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import type { ParsedGpx } from '@/lib/gpx'

interface Aid { distanceKm: number; name: string }

// ─── SVG top-down map ─────────────────────────────────────────────────────────

function SvgMap({ gpx, aids }: { gpx: ParsedGpx; aids: Aid[] }) {
  const W = 400
  const H = 260
  const pad = 20

  const { minLat, maxLat, minLon, maxLon } = gpx.bbox
  const midLat = (minLat + maxLat) / 2
  const cosLat = Math.cos((midLat * Math.PI) / 180)

  // Equirectangular projection with cosLat correction, fit to viewport
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
    offY + (maxLat - lat) * scale, // north up
  ]

  const polyPts = gpx.points.map(p => toXY(p.lat, p.lon).join(',')).join(' ')

  const aidMarkers = aids.map(a => {
    const closest = gpx.points.reduce((b, p) =>
      Math.abs(p.cumDist - a.distanceKm) < Math.abs(b.cumDist - a.distanceKm) ? p : b,
    )
    const [x, y] = toXY(closest.lat, closest.lon)
    return { ...a, x, y }
  })

  const [sx, sy] = toXY(gpx.points[0].lat, gpx.points[0].lon)
  const last = gpx.points[gpx.points.length - 1]
  const [fx, fy] = toXY(last.lat, last.lon)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full rounded-xl"
      style={{ background: '#0c0a09' }}
    >
      {/* Course line */}
      <polyline
        points={polyPts}
        fill="none"
        stroke="#34d399"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Start */}
      <circle cx={sx} cy={sy} r={5} fill="#34d399" />
      <text x={sx + 7} y={sy + 4} fontSize={9} fill="#34d399" fontWeight="bold">S</text>

      {/* Finish */}
      <circle cx={fx} cy={fy} r={5} fill="#f59e0b" />
      <text x={fx + 7} y={fy + 4} fontSize={9} fill="#f59e0b" fontWeight="bold">G</text>

      {/* Aid station markers */}
      {aidMarkers.map((a, i) => (
        <g key={i}>
          <circle cx={a.x} cy={a.y} r={4} fill="#ef4444" stroke="#0c0a09" strokeWidth="1.5" />
          <text x={a.x} y={a.y - 8} fontSize={8} fill="#fca5a5" textAnchor="middle">
            {a.distanceKm}k
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Elevation profile ────────────────────────────────────────────────────────

function ElevationProfile({ gpx, aids }: { gpx: ParsedGpx; aids: Aid[] }) {
  // Further downsample to 500 points for recharts performance
  const step = Math.max(1, Math.floor(gpx.points.length / 500))
  const data = gpx.points
    .filter((_, i) => i === 0 || i === gpx.points.length - 1 || i % step === 0)
    .map(p => ({
      d: parseFloat(p.cumDist.toFixed(2)),
      e: Math.round(p.ele),
    }))

  const eles = data.map(d => d.e)
  const domainMin = Math.floor(Math.min(...eles) / 100) * 100
  const domainMax = Math.ceil(Math.max(...eles) / 100) * 100

  return (
    <div className="h-36 px-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="d"
            tick={{ fill: '#78716c', fontSize: 9 }}
            tickCount={7}
            tickFormatter={v => `${v}k`}
          />
          <YAxis
            tick={{ fill: '#78716c', fontSize: 9 }}
            width={38}
            domain={[domainMin, domainMax]}
          />
          <Tooltip
            contentStyle={{ background: '#1c1917', border: '1px solid #44403c', fontSize: 11 }}
            formatter={v => [`${v}m`, '標高']}
            labelFormatter={v => `${Number(v).toFixed(1)}km`}
          />
          {aids.map((a, i) => (
            <ReferenceLine
              key={i}
              x={a.distanceKm}
              stroke="#ef444466"
              strokeDasharray="3 2"
              label={{ value: `${a.distanceKm}k`, fill: '#fca5a5', fontSize: 8, position: 'top' }}
            />
          ))}
          <Area
            type="monotone"
            dataKey="e"
            stroke="#34d399"
            fill="url(#eGrad)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function CourseMap({ gpx, aids = [] }: { gpx: ParsedGpx; aids?: Aid[] }) {
  return (
    <div className="space-y-3">
      <SvgMap gpx={gpx} aids={aids} />
      <ElevationProfile gpx={gpx} aids={aids} />
      <div className="flex gap-4 text-xs text-stone-500 justify-center pt-1">
        <span>
          距離: <span className="text-stone-300">{gpx.totalDistKm.toFixed(1)}km</span>
        </span>
        <span>
          D+: <span className="text-emerald-400">+{gpx.totalAscent.toLocaleString()}m</span>
        </span>
        <span>
          D-: <span className="text-red-400">-{gpx.totalDescent.toLocaleString()}m</span>
        </span>
      </div>
    </div>
  )
}
