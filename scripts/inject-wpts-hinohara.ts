/**
 * Inject CP waypoints into public/gpx/hinohara.gpx
 *
 * CP data (翠夏巡嶺 / sim-hinohara, Start 7:00):
 *   CP1/A1:  7.8km  120min (9:00)
 *   CP2/A2: 16.0km  240min (11:00)
 *   CP3/A3: 24.0km  345min (12:45)
 *   CP4/A4: 31.0km  420min (14:00)
 *   CP5/A5: 39.0km  510min (15:30)
 *   CP6:    41.5km  (no cutoff)
 *   Goal:   44.0km  570min (16:30)
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const gpxPath = join(__dirname, '../public/gpx/hinohara.gpx')

const CPS = [
  { name: 'CP1/A1', distKm: 7.8,  cutoffMin: 120, desc: '7.8km 9:00 cutoff' },
  { name: 'CP2/A2', distKm: 16.0, cutoffMin: 240, desc: '16.0km 11:00 cutoff' },
  { name: 'CP3/A3', distKm: 24.0, cutoffMin: 345, desc: '24.0km 12:45 cutoff' },
  { name: 'CP4/A4', distKm: 31.0, cutoffMin: 420, desc: '31.0km 14:00 cutoff' },
  { name: 'CP5/A5', distKm: 39.0, cutoffMin: 510, desc: '39.0km 15:30 cutoff' },
  { name: 'CP6',    distKm: 41.5, cutoffMin: 0,   desc: '41.5km no cutoff' },
  { name: 'Goal',   distKm: 44.0, cutoffMin: 570, desc: '44.0km 16:30 cutoff' },
]

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const text = readFileSync(gpxPath, 'utf-8')

// Parse trkpt elements using regex (avoids loading into DOM in Node)
const trkptRe = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>[\s\S]*?<ele>([^<]+)<\/ele>/g

interface Pt { lat: number; lon: number; ele: number; cumDist: number }
const pts: Pt[] = []
let cumDist = 0
let m: RegExpExecArray | null

while ((m = trkptRe.exec(text)) !== null) {
  const lat = parseFloat(m[1])
  const lon = parseFloat(m[2])
  const ele = parseFloat(m[3])
  if (pts.length > 0) {
    const prev = pts[pts.length - 1]
    cumDist += haversine(prev.lat, prev.lon, lat, lon)
  }
  pts.push({ lat, lon, ele, cumDist })
}

console.log(`Parsed ${pts.length} trkpts, total dist = ${cumDist.toFixed(2)} km`)

// For each CP, find the closest trkpt by cumDist
const wpts: string[] = []
for (const cp of CPS) {
  const closest = pts.reduce((best, p) =>
    Math.abs(p.cumDist - cp.distKm) < Math.abs(best.cumDist - cp.distKm) ? p : best
  )
  console.log(
    `${cp.name} @ ${cp.distKm}km → trkpt cumDist=${closest.cumDist.toFixed(3)} lat=${closest.lat} lon=${closest.lon} ele=${closest.ele}`
  )
  wpts.push(
    `  <wpt lat="${closest.lat}" lon="${closest.lon}">\n` +
    `    <ele>${closest.ele}</ele>\n` +
    `    <name>${cp.name}</name>\n` +
    `    <desc>${cp.desc}</desc>\n` +
    `    <extensions><cutoffMin>${cp.cutoffMin}</cutoffMin></extensions>\n` +
    `  </wpt>`
  )
}

// Insert waypoints before </gpx>
const wptBlock = wpts.join('\n') + '\n'
if (text.includes('</gpx>')) {
  const updated = text.replace('</gpx>', wptBlock + '</gpx>')
  writeFileSync(gpxPath, updated, 'utf-8')
  console.log('\nSuccessfully injected waypoints into hinohara.gpx')
} else {
  console.error('ERROR: </gpx> not found in file!')
  process.exit(1)
}
