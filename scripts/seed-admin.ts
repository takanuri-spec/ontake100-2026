/**
 * Firestore seed — Admin SDK版
 * Run: npx tsx scripts/seed-admin.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, WriteBatch } from 'firebase-admin/firestore'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const sa = require('./serviceAccount.json')

initializeApp({ credential: cert(sa) })
const db = getFirestore()

// ─── DATA ────────────────────────────────────────────────────────────────────

const races = [
  {
    id: 'ontake100-2026',
    name: 'OSJ ONTAKE 100', nameJa: 'OSJおんたけウルトラトレイル100K',
    date: '2026-07-19', startTime: '00:00',
    distanceKm: 109, elevationGainM: 3780, elevationLossM: 3780,
    cutoffMinutes: 1200, location: '王滝村・長野県',
    lat: 35.758, lng: 137.568,
    type: 'target', loopCount: 2, itraPoints: 4,
    gpxUrl: 'https://tracedetrail.fr/en/trace/278469',
    baselineTime: '15:20:54', targetTime: '15:30:00',
    rentalCar: { reservation: 'B04527', departure: '2026-07-18T13:00', return: '2026-07-20T20:00', shop: '下北沢駅前' },
    hotel: { name: 'ホテルやまぶき', reservation: '5123', checkIn: '2026-07-19', plan: '馬刺し&お酒 信州名物セット付' },
  },
  {
    id: 'sim-toki-river',
    name: '第4回 Around Toki River', nameJa: '第4回 Around Toki River',
    date: '2026-06-14', startTime: '08:15',
    distanceKm: 56.2, elevationGainM: 3386, elevationLossM: 3386,
    cutoffMinutes: 675, location: '越生町・埼玉県',
    lat: 35.985, lng: 139.290,
    type: 'sim', loopCount: 1, itraPoints: 3,
    gpxUrl: 'https://npo-sup.org/blog/event/atr_vol3/',
    strategy: 'Race at target effort. Gut-training test: 75–90g/h CHO. No poles.',
    rentalCar: { reservation: 'B04104', departure: '2026-06-13T15:30', return: '2026-06-15T08:00', shop: '下北沢駅前' },
  },
  {
    id: 'sim-hinohara',
    name: '翠夏巡嶺 Hinohara Mountain Marathon', nameJa: '翠夏巡嶺',
    date: '2026-06-21', startTime: '07:00',
    distanceKm: 44, elevationGainM: 4500, elevationLossM: 4100,
    cutoffMinutes: 570, location: '檜原村・東京都',
    lat: 35.739, lng: 139.023,
    type: 'sim', loopCount: 1, itraPoints: 3,
    strategy: '70%努力度。Week 10 — 28日前。下りを抑える。No poles.',
    rentalCar: { reservation: 'B04128', departure: '2026-06-20T20:00', return: '2026-06-21T20:00', shop: '下北沢駅前' },
  },
]

const ontakeAids = [
  { id: 'aid-25',   distanceKm: 25,  name: '第1給水',         cutoffFromStartMin: 0,    hasDropBag: false, items: ['水', 'オレンジ'] },
  { id: 'aid-54',   distanceKm: 54,  name: 'CP1 松原（折返し）', cutoffFromStartMin: 600,  hasDropBag: true,  items: ['おにぎり', 'バナナ', '果物', '水', '電解質'] },
  { id: 'aid-73',   distanceKm: 73,  name: '第3給水',          cutoffFromStartMin: 0,    hasDropBag: false, items: ['水'] },
  { id: 'aid-83',   distanceKm: 83,  name: 'CP2',             cutoffFromStartMin: 900,  hasDropBag: false, items: ['そうめん', '果物', 'おにぎり', '水', '電解質'] },
  { id: 'finish',   distanceKm: 109, name: 'フィニッシュ',       cutoffFromStartMin: 1200, hasDropBag: false, items: [] },
]

const ontakeSegments = [
  { id: 'seg-0-25',   fromKm: 0,   toKm: 25,  distanceKm: 25, elevationGainM: 600,  elevationLossM: 200,  avgGradePct: 1.6,  terrainType: 'trail', sunExposure: 'mixed',   plannedPaceMinPerKm: 7.0,  plannedFuelGPerHour: 60, plannedWaterMlPerHour: 500, notes: '序盤・走れる林道。ナイトスタート。ペースを抑える。' },
  { id: 'seg-25-54',  fromKm: 25,  toKm: 54,  distanceKm: 29, elevationGainM: 1400, elevationLossM: 800,  avgGradePct: 2.1,  terrainType: 'trail', sunExposure: 'exposed', plannedPaceMinPerKm: 9.5,  plannedFuelGPerHour: 70, plannedWaterMlPerHour: 550, notes: '長い登り。夜明け〜早朝。GI要注意。パワーハイク活用。' },
  { id: 'seg-54-73',  fromKm: 54,  toKm: 73,  distanceKm: 19, elevationGainM: 600,  elevationLossM: 700,  avgGradePct: 0.5,  terrainType: 'trail', sunExposure: 'exposed', plannedPaceMinPerKm: 7.5,  plannedFuelGPerHour: 75, plannedWaterMlPerHour: 600, notes: 'CP1後再スタート。日中・日射強。冷却最優先。' },
  { id: 'seg-73-83',  fromKm: 73,  toKm: 83,  distanceKm: 10, elevationGainM: 700,  elevationLossM: 200,  avgGradePct: 5.0,  terrainType: 'trail', sunExposure: 'exposed', plannedPaceMinPerKm: 11.0, plannedFuelGPerHour: 70, plannedWaterMlPerHour: 500, notes: '最難所の急登。固形→液体。必ずパワーハイク。' },
  { id: 'seg-83-109', fromKm: 83,  toKm: 109, distanceKm: 26, elevationGainM: 480,  elevationLossM: 1880, avgGradePct: -5.4, terrainType: 'trail', sunExposure: 'mixed',   plannedPaceMinPerKm: 8.0,  plannedFuelGPerHour: 75, plannedWaterMlPerHour: 500, notes: 'CP2後は下り基調。大腿四頭筋注意。カフェイン追加。' },
]

const weeklyPlan = [
  { week: 1,  startDate: '2026-04-19', phase: 'Base',   targetKm: 90,  targetElevM: 2500, notes: 'GI摂取量記録開始（40g/h）。週1ヒル。' },
  { week: 2,  startDate: '2026-04-26', phase: 'Base',   targetKm: 100, targetElevM: 3000, notes: '60g/hへ増量。glucose:fructose 1:0.8 切替。' },
  { week: 3,  startDate: '2026-05-03', phase: 'Base',   targetKm: 110, targetElevM: 4000, notes: 'B2B: 土3h+日2h。下り特化1回。' },
  { week: 4,  startDate: '2026-05-10', phase: 'Deload', targetKm: 70,  targetElevM: 2000, notes: 'Deload-30%。閾値走40分。' },
  { week: 5,  startDate: '2026-05-17', phase: 'Build',  targetKm: 115, targetElevM: 5000, notes: 'B2B: 土5h+日3h。70g/hへ。' },
  { week: 6,  startDate: '2026-05-24', phase: 'Build',  targetKm: 125, targetElevM: 6000, notes: 'ナイトラン1回(2h)。Hill 5×4min。' },
  { week: 7,  startDate: '2026-05-31', phase: 'Build',  targetKm: 135, targetElevM: 6500, notes: '75-90g/h到達。下り特化Long。' },
  { week: 8,  startDate: '2026-06-07', phase: 'Deload', targetKm: 90,  targetElevM: 3500, notes: 'Deload。6/14レース前週。脚を休める。' },
  { week: 9,  startDate: '2026-06-14', phase: 'Peak',   targetKm: 150, targetElevM: 7500, notes: '🏃 Around Toki River 56.2K/3386m (6/14)。GI本番リハーサル。' },
  { week: 10, startDate: '2026-06-21', phase: 'Peak',   targetKm: 155, targetElevM: 8000, notes: '🏃 翠夏巡嶺 44K/4500m (6/21)。サウナ暑熱順化開始。' },
  { week: 11, startDate: '2026-06-28', phase: 'Taper',  targetKm: 100, targetElevM: 4000, notes: 'テーパー-35%。高強度短め。装備確認。' },
  { week: 12, startDate: '2026-07-05', phase: 'Taper',  targetKm: 60,  targetElevM: 2000, notes: 'テーパー-55%。ドライラン。パッキング完成。' },
  { week: 13, startDate: '2026-07-12', phase: 'Race',   targetKm: 0,   targetElevM: 0,    notes: '7/18出発。7/19 00:00 OSJ ONTAKE 100スタート！' },
]

const giHeatPlan = {
  probioticStartDate: '2026-04-19',
  probioticProduct: 'L. acidophilus CUL60 + B. bifidum CUL20 (25B CFU/日以上)',
  probioticNotes: '28日以上連続が効果条件 (Pugh 2019)。今日から開始。',
  nsaidBlackoutStart: '2026-07-12',
  gutTrainingRamp: [
    { weekRange: '週1-2', targetGPerHour: 40 },
    { weekRange: '週3-4', targetGPerHour: 60 },
    { weekRange: '週5-7', targetGPerHour: 75 },
    { weekRange: '週8-10', targetGPerHour: 90 },
    { weekRange: '週11-12', targetGPerHour: 75 },
  ],
  heatAcclimation: { startDate: '2026-06-21', protocol: '90°C サウナ × 15-20分 × 週5回 × 2週間' },
  inRaceNutrition: { carbGMin: 70, carbGMax: 90, sodiumMgMin: 800, sodiumMgMax: 1500, waterMlMin: 400, waterMlMax: 700 },
}

const trips = [
  {
    id: 'trip-toki-river', raceId: 'sim-toki-river',
    rentalCar: {
      reservation: 'B04104', company: 'ニッポンレンタカー',
      departure: '2026-06-13T15:30', return: '2026-06-15T08:00',
      pickupLocation: '下北沢駅前', returnLocation: '下北沢駅前',
      phone: '03-6418-1500', mapUrl: 'https://maps.app.goo.gl/下北沢',
    },
    schedule: [
      { timing: '2026-06-13 15:30', description: 'ニッポンレンタカー 下北沢駅前でピックアップ', mapUrl: 'https://maps.app.goo.gl/下北沢' },
      { timing: '2026-06-14 08:15', description: 'Around Toki River スタート（ニューサンピア埼玉おごせ）', mapUrl: 'https://maps.app.goo.gl/ニューサンピア埼玉おごせ' },
      { timing: '2026-06-14 19:30', description: 'Around Toki River フィニッシュ・着替え・宿へ向かう' },
      { timing: '2026-06-15 08:00', description: 'ニッポンレンタカー 返却' },
    ],
    notes: '越生町まで約1.5h。GI本番リハーサル。',
    packingList: [
      { id: 'p1', name: 'ヘッドランプ', category: 'mandatory', checked: false },
      { id: 'p2', name: 'レインウェア上下', category: 'mandatory', checked: false },
      { id: 'p3', name: 'エマージェンシーシート', category: 'mandatory', checked: false },
      { id: 'p4', name: 'マイカップ', category: 'mandatory', checked: false },
      { id: 'p5', name: '水 最低1L', category: 'mandatory', checked: false },
      { id: 'p6', name: 'Maurten Gel 100 × 6', category: 'nutrition', checked: false },
      { id: 'p7', name: '塩熱サプリ × 10', category: 'nutrition', checked: false },
      { id: 'p8', name: '生姜キャンディ', category: 'medical', checked: false },
    ],
  },
  {
    id: 'trip-hinohara', raceId: 'sim-hinohara',
    rentalCar: {
      reservation: 'B04128', company: 'ニッポンレンタカー',
      departure: '2026-06-20T20:00', return: '2026-06-21T20:00',
      pickupLocation: '下北沢駅前', returnLocation: '下北沢駅前',
      phone: '03-6418-1500', mapUrl: 'https://maps.app.goo.gl/下北沢',
    },
    schedule: [
      { timing: '2026-06-20 20:00', description: 'ニッポンレンタカー 下北沢駅前でピックアップ', mapUrl: 'https://maps.app.goo.gl/下北沢' },
      { timing: '2026-06-21 07:00', description: '翠夏巡嶺 スタート（檜原村）', mapUrl: 'https://maps.app.goo.gl/檜原村' },
      { timing: '2026-06-21 19:00', description: '翠夏巡嶺 フィニッシュ・着替え・宿へ向かう' },
      { timing: '2026-06-21 20:00', description: 'ニッポンレンタカー 返却' },
    ],
    notes: '檜原村まで約1h。前日夜発。下り強化リハーサル。',
    packingList: [
      { id: 'p1', name: 'ヘッドランプ', category: 'mandatory', checked: false },
      { id: 'p2', name: 'レインウェア上下', category: 'mandatory', checked: false },
      { id: 'p3', name: 'エマージェンシーシート', category: 'mandatory', checked: false },
      { id: 'p4', name: 'Maurten Gel 100 × 5', category: 'nutrition', checked: false },
      { id: 'p5', name: '塩熱サプリ × 10', category: 'nutrition', checked: false },
      { id: 'p6', name: '生姜キャンディ', category: 'medical', checked: false },
      { id: 'p7', name: 'アイスバッグ', category: 'other', checked: false },
    ],
  },
  {
    id: 'trip-ontake', raceId: 'ontake100-2026',
    rentalCar: {
      reservation: 'B04527', company: 'ニッポンレンタカー',
      departure: '2026-07-18T13:00', return: '2026-07-20T20:00',
      pickupLocation: '下北沢駅前', returnLocation: '下北沢駅前',
      phone: '03-6418-1500', mapUrl: 'https://maps.app.goo.gl/下北沢',
    },
    hotel: {
      name: 'ホテルやまぶき', reservation: '5123',
      checkIn: '2026-07-19', checkOut: '2026-07-20',
      phone: '0264-58-2626', address: '長野県木曽郡木祖村薮原1151-6',
      mapUrl: 'https://maps.app.goo.gl/ホテルやまぶき',
      notes: '馬刺し&お酒 信州名物セット付。レース後の回復宿。',
    },
    schedule: [
      { timing: '2026-07-18 13:00', description: 'ニッポンレンタカー 下北沢駅前でピックアップ', mapUrl: 'https://maps.app.goo.gl/下北沢' },
      { timing: '2026-07-18 16:30', description: 'ホテルやまぶき チェックイン・最終チェック', mapUrl: 'https://maps.app.goo.gl/ホテルやまぶき' },
      { timing: '2026-07-18 19:00', description: '夕食・最終準備・早期就寝（ゴール実行時刻予定: 16h15m = 午前4時頃）' },
      { timing: '2026-07-19 00:00', description: 'OSJ ONTAKE 100 スタート（御岳ベースキャンプ）', mapUrl: 'https://maps.app.goo.gl/御岳ベースキャンプ' },
      { timing: '2026-07-19 16:15', description: 'ONTAKE100 フィニッシュ予定（11時間15分カットオフ）' },
      { timing: '2026-07-19 17:00', description: 'ホテルやまぶき チェックイン・回復食・水風呂・睡眠' },
      { timing: '2026-07-20 10:00', description: 'ホテルやまぶき チェックアウト・朝食' },
      { timing: '2026-07-20 20:00', description: 'ニッポンレンタカー 下北沢駅前で返却' },
    ],
    notes: '王滝村まで約3.5h。7/18受付・前泊。',
    dropBagContents: ['着替え上下', 'ウインドシェル', 'ゲイター', '追加ジェル×5', 'PH1500×3', '塩タブ補充', '靴下替え', '予備電池', 'バンダナ×2'],
    packingList: [
      { id: 'p1',  name: 'ヘッドランプ（＋予備電池）', category: 'mandatory',   checked: false },
      { id: 'p2',  name: 'レインウェア上下',           category: 'mandatory',   checked: false },
      { id: 'p3',  name: 'エマージェンシーシート',      category: 'mandatory',   checked: false },
      { id: 'p4',  name: 'マイカップ',                 category: 'mandatory',   checked: false },
      { id: 'p5',  name: '熊鈴',                       category: 'mandatory',   checked: false },
      { id: 'p6',  name: 'ホイッスル',                 category: 'mandatory',   checked: false },
      { id: 'p7',  name: '携帯トイレ',                 category: 'mandatory',   checked: false },
      { id: 'p8',  name: 'テーピング 80×3cm',          category: 'mandatory',   checked: false },
      { id: 'p9',  name: 'Fenix 7（充電済）',           category: 'navigation',  checked: false },
      { id: 'p10', name: 'Pixel 10 Pro（充電済）',      category: 'navigation',  checked: false },
      { id: 'p11', name: 'モバイルバッテリー',           category: 'navigation',  checked: false },
      { id: 'p12', name: 'Maurten Gel 100 × 12',       category: 'nutrition',   checked: false },
      { id: 'p13', name: 'Maurten Drink Mix 160 × 4',  category: 'nutrition',   checked: false },
      { id: 'p14', name: '塩熱サプリ × 20',            category: 'nutrition',   checked: false },
      { id: 'p15', name: 'Precision PH1500 × 4',       category: 'nutrition',   checked: false },
      { id: 'p16', name: '生姜キャンディ',              category: 'medical',     checked: false },
      { id: 'p17', name: 'バンダナ×2（氷冷却用）',      category: 'clothing',    checked: false },
      { id: 'p18', name: 'アームスリーブ（冷却用）',    category: 'clothing',    checked: false },
      { id: 'p19', name: 'ポール',                      category: 'other',       checked: false },
    ],
  },
]

// ─── SEED ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Firestore (Admin SDK)...')
  let batch: WriteBatch = db.batch()
  let count = 0

  const flush = async () => { await batch.commit(); batch = db.batch(); count = 0 }
  const add = async (ref: FirebaseFirestore.DocumentReference, data: object) => {
    batch.set(ref, data)
    if (++count >= 450) await flush()
  }

  for (const { id, ...data } of races) {
    await add(db.collection('races').doc(id), data)
    console.log(`  ✓ races/${id}`)
  }

  for (const { id, ...data } of ontakeAids) {
    await add(db.collection('races').doc('ontake100-2026').collection('aidStations').doc(id), data)
  }
  console.log(`  ✓ aidStations (${ontakeAids.length})`)

  for (const { id, ...data } of ontakeSegments) {
    await add(db.collection('races').doc('ontake100-2026').collection('segments').doc(id), data)
  }
  console.log(`  ✓ segments (${ontakeSegments.length})`)

  for (const week of weeklyPlan) {
    await add(db.collection('trainingPlan').doc(`week-${week.week}`), week)
  }
  console.log(`  ✓ trainingPlan (${weeklyPlan.length} weeks)`)

  await add(db.collection('giHeatPlan').doc('gi-heat-2026'), giHeatPlan)
  console.log('  ✓ giHeatPlan')

  for (const { id, ...data } of trips) {
    await add(db.collection('trips').doc(id), data)
    console.log(`  ✓ trips/${id}`)
  }

  await flush()
  console.log('\n✅ Seed complete!')
  process.exit(0)
}

seed().catch(err => { console.error('❌', err.message); process.exit(1) })
