export interface GpxPoint {
  lat: number
  lon: number
  ele: number
  cumDist: number // km from start
}

export interface GpxWaypoint {
  lat: number
  lon: number
  ele: number
  name: string
  desc: string
  cutoffMin: number // 0 = no cutoff
}

export interface ParsedGpx {
  name: string
  points: GpxPoint[] // downsampled, max ~1200 points
  waypoints: GpxWaypoint[]
  totalDistKm: number
  totalAscent: number
  totalDescent: number
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number }
}

export interface SegmentStats {
  distKm: number
  ascent: number
  descent: number
}

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function parseGpx(url: string): Promise<ParsedGpx> {
  const text = await fetch(url).then(r => r.text())
  const xmlDoc = new DOMParser().parseFromString(text, 'application/xml')

  const nameEl = xmlDoc.querySelector('trk > name')
  const name = nameEl?.textContent?.trim() ?? 'Course'

  const trkpts = Array.from(xmlDoc.querySelectorAll('trkpt'))

  const raw: GpxPoint[] = []
  let cumDist = 0
  let totalAscent = 0
  let totalDescent = 0

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i]
    const lat = parseFloat(pt.getAttribute('lat') ?? '0')
    const lon = parseFloat(pt.getAttribute('lon') ?? '0')
    const ele = parseFloat(pt.querySelector('ele')?.textContent ?? '0')

    if (i > 0) {
      const prev = raw[i - 1]
      cumDist += haversineDist(prev.lat, prev.lon, lat, lon)
      const dEle = ele - prev.ele
      if (dEle > 0) totalAscent += dEle
      else totalDescent -= dEle
    }
    raw.push({ lat, lon, ele, cumDist })
  }

  const bbox = {
    minLat: Math.min(...raw.map(p => p.lat)),
    maxLat: Math.max(...raw.map(p => p.lat)),
    minLon: Math.min(...raw.map(p => p.lon)),
    maxLon: Math.max(...raw.map(p => p.lon)),
  }

  // Downsample to at most 1200 points for rendering performance
  const step = Math.max(1, Math.floor(raw.length / 1200))
  const points = raw.filter((_, i) => i === 0 || i === raw.length - 1 || i % step === 0)

  // Parse <wpt> waypoints (CP data injected into GPX)
  const wptEls = Array.from(xmlDoc.querySelectorAll('wpt'))
  const waypoints: GpxWaypoint[] = wptEls.map(wpt => {
    const lat = parseFloat(wpt.getAttribute('lat') ?? '0')
    const lon = parseFloat(wpt.getAttribute('lon') ?? '0')
    const ele = parseFloat(wpt.querySelector('ele')?.textContent ?? '0')
    const name = wpt.querySelector('name')?.textContent?.trim() ?? ''
    const desc = wpt.querySelector('desc')?.textContent?.trim() ?? ''
    const cutoffMin = parseInt(
      wpt.querySelector('extensions > cutoffMin')?.textContent ?? '0',
      10,
    )
    return { lat, lon, ele, name, desc, cutoffMin }
  })

  return {
    name,
    points,
    waypoints,
    totalDistKm: cumDist,
    totalAscent: Math.round(totalAscent),
    totalDescent: Math.round(totalDescent),
    bbox,
  }
}

export function getSegmentStats(
  points: GpxPoint[],
  fromKm: number,
  toKm: number,
): SegmentStats {
  const seg = points.filter(p => p.cumDist >= fromKm && p.cumDist <= toKm)
  if (seg.length < 2) return { distKm: toKm - fromKm, ascent: 0, descent: 0 }
  let ascent = 0
  let descent = 0
  for (let i = 1; i < seg.length; i++) {
    const d = seg[i].ele - seg[i - 1].ele
    if (d > 0) ascent += d
    else descent -= d
  }
  return {
    distKm: parseFloat((toKm - fromKm).toFixed(1)),
    ascent: Math.round(ascent),
    descent: Math.round(descent),
  }
}
