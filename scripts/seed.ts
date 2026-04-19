/**
 * Firestore seed script — Ontake100 2026
 * Run: npx tsx scripts/seed.ts
 *
 * Seeds: races (ontake100 + 2 sim), aid stations, segments (approx),
 *        training plan (13 weeks), travel plan (3 trips), GI/heat checklist
 */

import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, collection, writeBatch } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ─── 1. RACES ───────────────────────────────────────────────────────────────

const races = [
  {
    id: 'ontake100-2026',
    name: 'OSJ ONTAKE 100',
    nameJa: 'OSJおんたけウルトラトレイル100K',
    date: '2026-07-19',
    startTime: '00:00',
    distanceKm: 109,
    elevationGainM: 3780,
    elevationLossM: 3780,
    cutoffMinutes: 1200, // 20h
    location: '王滝村・長野県',
    lat: 35.758, lng: 137.568,  // 松原スポーツ公園
    type: 'target',
    loopCount: 2,
    itraPoints: 4,
    gpxUrl: 'https://tracedetrail.fr/en/trace/278469',
    baselineTime: '15:20:54',   // 2022実績
    targetTime: '15:30:00',
    rentalCar: { reservation: 'B04527', departure: '2026-07-18T13:00', return: '2026-07-20T20:00', shop: '下北沢駅前' },
    hotel: { name: 'ホテルやまぶき', reservation: '5123', checkIn: '2026-07-19', plan: '馬刺し&お酒 信州名物セット付' },
  },
  {
    id: 'sim-toki-river',
    name: '第4回 Around Toki River',
    nameJa: '第4回 Around Toki River',
    date: '2026-06-14',
    startTime: '08:30',
    distanceKm: 56.2,
    elevationGainM: 3386,
    elevationLossM: 3386,
    cutoffMinutes: 675, // 11h15m
    location: '越生町・埼玉県',
    lat: 35.985, lng: 139.29,
    type: 'sim',
    loopCount: 1,
    itraPoints: 3,
    gpxUrl: 'https://npo-sup.org/blog/event/atr_vol3/',
    strategy: 'Race at target effort. Gut-training test: 75–90g/h CHO. No poles.',
    rentalCar: { reservation: 'B04104', departure: '2026-06-13T15:30', return: '2026-06-15T08:00', shop: '下北沢駅前' },
  },
  {
    id: 'sim-hinohara',
    name: '翠夏巡嶺 Hinohara Mountain Marathon',
    nameJa: '翠夏巡嶺',
    date: '2026-06-21',
    startTime: '07:00',
    distanceKm: 44,
    elevationGainM: 4500,
    elevationLossM: 4100,
    cutoffMinutes: 570, // 9h30m
    location: '檜原村・東京都',
    lat: 35.739, lng: 139.023,
    type: 'sim',
    loopCount: 1,
    itraPoints: 3,
    strategy: 'Conservative effort (70%). Week 10 — D+ conditioning, eccentric. Do NOT blow up (28 days to Ontake). No poles.',
    rentalCar: { reservation: 'B04128', departure: '2026-06-20T20:00', return: '2026-06-21T20:00', shop: '下北沢駅前' },
  },
]

// ─── 2. AID STATIONS ────────────────────────────────────────────────────────

const ontakeAids = [
  { id: 'aid-25', distanceKm: 25, name: '第1給水', cutoffFromStartMin: null, hasDropBag: false, items: ['水', 'オレンジ'] },
  { id: 'aid-54', distanceKm: 54, name: 'CP1 松原（折返し）', cutoffFromStartMin: 600, hasDropBag: true, items: ['おにぎり', 'バナナ', '果物', '水', '電解質'] },
  { id: 'aid-73', distanceKm: 73, name: '第3給水', cutoffFromStartMin: null, hasDropBag: false, items: ['水'] },
  { id: 'aid-83', distanceKm: 83, name: 'CP2', cutoffFromStartMin: 900, hasDropBag: false, items: ['そうめん', '果物', 'おにぎり', '水', '電解質'] },
  { id: 'finish', distanceKm: 109, name: 'フィニッシュ', cutoffFromStartMin: 1200, hasDropBag: false, items: [] },
]

// ─── 3. SEGMENTS (Minetti-adjusted approx until GPX is loaded) ───────────────

// Based on: 2-loop林道, 5 segments between aid stations
// gradePct estimated from elevation profile
const ontakeSegments = [
  {
    id: 'seg-0-25', fromKm: 0, toKm: 25, distanceKm: 25,
    elevationGainM: 600, elevationLossM: 200, avgGradePct: 1.6,
    terrainType: 'trail', sunExposure: 'mixed',
    plannedPaceMinPerKm: 7.0,  // relatively runnable
    plannedFuelGPerHour: 60, plannedWaterMlPerHour: 500,
    notes: '序盤・走れる林道。ナイトスタート。ペースを抑える。',
  },
  {
    id: 'seg-25-54', fromKm: 25, toKm: 54, distanceKm: 29,
    elevationGainM: 1400, elevationLossM: 800, avgGradePct: 2.1,
    terrainType: 'trail', sunExposure: 'exposed',
    plannedPaceMinPerKm: 9.5,  // long climb included
    plannedFuelGPerHour: 70, plannedWaterMlPerHour: 550,
    notes: '長い登り区間。夜明け〜早朝。GI要注意ゾーン開始。パワーハイク活用。',
  },
  {
    id: 'seg-54-73', fromKm: 54, toKm: 73, distanceKm: 19,
    elevationGainM: 600, elevationLossM: 700, avgGradePct: 0.5,
    terrainType: 'trail', sunExposure: 'exposed',
    plannedPaceMinPerKm: 7.5,
    plannedFuelGPerHour: 75, plannedWaterMlPerHour: 600,
    notes: 'CP1後の再スタート。日中・日射強くなる。冷却最優先。',
  },
  {
    id: 'seg-73-83', fromKm: 73, toKm: 83, distanceKm: 10,
    elevationGainM: 700, elevationLossM: 200, avgGradePct: 5.0,
    terrainType: 'trail', sunExposure: 'exposed',
    plannedPaceMinPerKm: 11.0, // steep climb
    plannedFuelGPerHour: 70, plannedWaterMlPerHour: 500,
    notes: '最難所の登り。脚が削られる区間。固形→液体、必ずパワーハイク。',
  },
  {
    id: 'seg-83-109', fromKm: 83, toKm: 109, distanceKm: 26,
    elevationGainM: 480, elevationLossM: 1880, avgGradePct: -5.4,
    terrainType: 'trail', sunExposure: 'mixed',
    plannedPaceMinPerKm: 8.0,
    plannedFuelGPerHour: 75, plannedWaterMlPerHour: 500,
    notes: 'CP2以降は下り基調。大腿四頭筋限界に注意。カフェイン追加。',
  },
]

// ─── 4. TRAINING PLAN ────────────────────────────────────────────────────────

const weeklyPlan = [
  { week: 1, startDate: '2026-04-19', phase: 'Base',   targetKm: 90,  targetElevM: 2500, targetLongRunH: 3.0, notes: 'Base開始。週1ヒル、週末ロング。GI記録開始。' },
  { week: 2, startDate: '2026-04-26', phase: 'Base',   targetKm: 100, targetElevM: 3000, targetLongRunH: 3.5, notes: '糖質摂取量 60g/h へ増量。' },
  { week: 3, startDate: '2026-05-03', phase: 'Base',   targetKm: 110, targetElevM: 4000, targetLongRunH: 4.0, notes: 'B2B試走: 土3h+日2h。下り特化1回。' },
  { week: 4, startDate: '2026-05-10', phase: 'Deload', targetKm: 70,  targetElevM: 2000, targetLongRunH: 2.0, notes: 'Deload週。量-30%。閾値走40分。' },
  { week: 5, startDate: '2026-05-17', phase: 'Build',  targetKm: 115, targetElevM: 5000, targetLongRunH: 5.0, notes: 'B2B強化: 土5h+日3h。70g/hへ。' },
  { week: 6, startDate: '2026-05-24', phase: 'Build',  targetKm: 125, targetElevM: 6000, targetLongRunH: 5.5, notes: 'ナイトラン1回(2h)。Hill 5×4min。' },
  { week: 7, startDate: '2026-05-31', phase: 'Build',  targetKm: 135, targetElevM: 6500, targetLongRunH: 6.0, notes: '下り特化Long。75-90g/hへ到達目標。' },
  { week: 8, startDate: '2026-06-07', phase: 'Deload', targetKm: 90,  targetElevM: 3500, targetLongRunH: 3.0, notes: 'Deload。6/14レース直前週。脚を休める。' },
  { week: 9, startDate: '2026-06-14', phase: 'Peak',   targetKm: 150, targetElevM: 7500, targetLongRunH: null, notes: '🏃 6/14 Around Toki River 56K/3386m。GI本番リハーサル。' },
  { week: 10, startDate: '2026-06-21', phase: 'Peak',  targetKm: 155, targetElevM: 8000, targetLongRunH: null, notes: '🏃 6/21 翠夏巡嶺 44K/4500m（70%努力度）。サウナ暑熱順化開始。' },
  { week: 11, startDate: '2026-06-28', phase: 'Taper', targetKm: 100, targetElevM: 4000, targetLongRunH: 2.5, notes: 'テーパー開始-35%。高強度短め。装備確認。' },
  { week: 12, startDate: '2026-07-05', phase: 'Taper', targetKm: 60,  targetElevM: 2000, targetLongRunH: 1.5, notes: 'テーパー-55%。Fenix/Androidドライラン。パッキング完成。' },
  { week: 13, startDate: '2026-07-12', phase: 'Race',  targetKm: 0,   targetElevM: 0,    targetLongRunH: null, notes: '7/18出発。7/19 00:00 ONTAKE100スタート！' },
]

// ─── 5. GI/HEAT PLAN ────────────────────────────────────────────────────────

const giHeatPlan = {
  id: 'gi-heat-2026',
  probioticStartDate: '2026-04-19',  // ← 今日から開始
  probioticProduct: 'L. acidophilus CUL60 + B. bifidum CUL20 (≥25B CFU/日)',
  probioticNotes: '28日前から継続が効果の条件 (Pugh 2019)。レース直前にスタートしても無効。',
  nsaidBlackoutStart: '2026-07-12',  // レース1週前
  nsaidNote: 'イブプロフェン等NSAID禁止。腸透過性を倍化する。',
  gutTrainingRamp: [
    { weekRange: '週1-2', targetGPerHour: 40, notes: '単一グルコース可' },
    { weekRange: '週3-4', targetGPerHour: 60, notes: 'glucose:fructose = 1:0.8 デュアルソース切替' },
    { weekRange: '週5-7', targetGPerHour: 75, notes: '本番製品で試す。登坂練で実戦テスト。' },
    { weekRange: '週8-10', targetGPerHour: 90, notes: 'Around Toki River (6/14) で90g/hリハーサル' },
    { weekRange: '週11-12', targetGPerHour: 75, notes: 'テーパー期は8割に。本番は70-90g/h' },
  ],
  heatAcclimation: {
    startDate: '2026-06-21',  // 翠夏巡嶺後
    protocol: '90°C サウナ × 15-20分 × 週5回 × 2週間',
    notes: 'Casadio 2017プロトコル。運動後に入ること。',
  },
  inRaceNutritionTarget: {
    carbGPerHour: { min: 70, max: 90 },
    sodiumMgPerHour: { min: 800, max: 1500 },
    waterMlPerHour: { min: 400, max: 700 },
  },
  products: [
    { name: 'Maurten Gel 100', carbG: 25, sodiumMg: 55, notes: '登り第一選択。ハイドロゲルで胃通過早い。' },
    { name: 'Maurten Drink Mix 160', carbG: 40, sodiumMg: 400, notes: '500mL希釈。胃への負担小。' },
    { name: 'Precision PH1500', carbG: 0, sodiumMg: 1500, notes: '発汗多い時の塩分補給。水に混ぜる。' },
    { name: '塩熱サプリ (大塚製薬)', carbG: 0, sodiumMg: 100, notes: 'ポケット常備。1粒/30min目安。' },
    { name: 'Mag-on ジェル', carbG: 24, sodiumMg: 20, notes: '味変・胃もたれしにくい。' },
    { name: 'アスリチューン', carbG: 26, sodiumMg: 30, notes: '日本製、消化吸収優しい。' },
  ],
}

// ─── 6. TRAVEL PLANS ────────────────────────────────────────────────────────

const trips = [
  {
    id: 'trip-toki-river',
    raceId: 'sim-toki-river',
    rentalCar: { reservation: 'B04104', departure: '2026-06-13T15:30', return: '2026-06-15T08:00', shop: '下北沢駅前' },
    notes: '越生町まで約1.5h。前日移動、現地泊または車中泊。',
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
    id: 'trip-hinohara',
    raceId: 'sim-hinohara',
    rentalCar: { reservation: 'B04128', departure: '2026-06-20T20:00', return: '2026-06-21T20:00', shop: '下北沢駅前' },
    notes: '檜原村まで約1h。前日夜発・当日返却。会場近くで仮眠。',
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
    id: 'trip-ontake',
    raceId: 'ontake100-2026',
    rentalCar: { reservation: 'B04527', departure: '2026-07-18T13:00', return: '2026-07-20T20:00', shop: '下北沢駅前' },
    hotel: { name: 'ホテルやまぶき', reservation: '5123', checkIn: '2026-07-19', checkOut: '2026-07-20', notes: '馬刺し&お酒プラン。レース後の回復宿。' },
    notes: '王滝村まで約3.5h。7/18受付・前泊、7/19 00:00スタート。',
    dropBagContents: [
      '着替え上下（CP1 54km受取）', 'ウインドシェル', 'ゲイター', '追加ジェル×5', 'Precision PH1500×3', '塩タブ補充', '靴下替え', 'ヘッドライム予備電池', 'バンダナ×2（氷用）',
    ],
    packingList: [
      { id: 'p1', name: 'ヘッドランプ（＋予備電池）', category: 'mandatory', checked: false },
      { id: 'p2', name: 'レインウェア上下', category: 'mandatory', checked: false },
      { id: 'p3', name: 'エマージェンシーシート', category: 'mandatory', checked: false },
      { id: 'p4', name: 'マイカップ', category: 'mandatory', checked: false },
      { id: 'p5', name: '熊鈴', category: 'mandatory', checked: false },
      { id: 'p6', name: 'ホイッスル', category: 'mandatory', checked: false },
      { id: 'p7', name: '携帯トイレ', category: 'mandatory', checked: false },
      { id: 'p8', name: 'テーピング 80×3cm', category: 'mandatory', checked: false },
      { id: 'p9', name: 'コンパス', category: 'navigation', checked: false },
      { id: 'p10', name: 'Fenix 7（充電済）', category: 'navigation', checked: false },
      { id: 'p11', name: 'Pixel 10 Pro（充電済）', category: 'navigation', checked: false },
      { id: 'p12', name: 'モバイルバッテリー', category: 'navigation', checked: false },
      { id: 'p13', name: 'Maurten Gel 100 × 12', category: 'nutrition', checked: false },
      { id: 'p14', name: 'Maurten Drink Mix 160 × 4', category: 'nutrition', checked: false },
      { id: 'p15', name: '塩熱サプリ × 20', category: 'nutrition', checked: false },
      { id: 'p16', name: 'Precision PH1500 × 4', category: 'nutrition', checked: false },
      { id: 'p17', name: 'アイススラリー素材（スタート前）', category: 'nutrition', checked: false },
      { id: 'p18', name: '生姜キャンディ', category: 'medical', checked: false },
      { id: 'p19', name: 'バンダナ×2（氷冷却用）', category: 'clothing', checked: false },
      { id: 'p20', name: 'アームスリーブ（冷却用）', category: 'clothing', checked: false },
      { id: 'p21', name: 'ポール（ドロップバッグに不要分）', category: 'other', checked: false },
    ],
  },
]

// ─── RUN SEED ────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Firestore...')
  let batch = writeBatch(db)
  let opCount = 0

  const flush = async () => {
    await batch.commit()
    batch = writeBatch(db)
    opCount = 0
  }
  const add = async (ref: any, data: any) => {
    batch.set(ref, data)
    opCount++
    if (opCount >= 450) await flush()
  }

  // Races
  for (const race of races) {
    const { id, ...data } = race
    await add(doc(db, 'races', id), { ...data, createdAt: new Date().toISOString() })
    console.log(`  ✓ race/${id}`)
  }

  // Aid stations (Ontake only for now)
  for (const aid of ontakeAids) {
    const { id, ...data } = aid
    await add(doc(collection(db, 'races', 'ontake100-2026', 'aidStations'), id), data)
  }
  console.log(`  ✓ ontake100/aidStations (${ontakeAids.length})`)

  // Segments
  for (const seg of ontakeSegments) {
    const { id, ...data } = seg
    await add(doc(collection(db, 'races', 'ontake100-2026', 'segments'), id), data)
  }
  console.log(`  ✓ ontake100/segments (${ontakeSegments.length})`)

  // Training plan
  for (const week of weeklyPlan) {
    await add(doc(db, 'trainingPlan', `week-${week.week}`), week)
  }
  console.log(`  ✓ trainingPlan (${weeklyPlan.length} weeks)`)

  // GI/heat plan
  await add(doc(db, 'giHeatPlan', 'gi-heat-2026'), giHeatPlan)
  console.log('  ✓ giHeatPlan')

  // Trips
  for (const trip of trips) {
    const { id, ...data } = trip
    await add(doc(db, 'trips', id), data)
    console.log(`  ✓ trips/${id}`)
  }

  await flush()
  console.log('✅ Seed complete!')
  process.exit(0)
}

seed().catch(err => { console.error('❌', err); process.exit(1) })
