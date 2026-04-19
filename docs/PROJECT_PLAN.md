# Ontake100 2026 — プロジェクト計画

> **ゴール**: OSJ ONTAKE 100（109km / +3,780m）を 2026-07-19 00:00 に完走する。  
> 2022年完走タイム 15:20:54 を基準に、GI/暑熱管理を最大の改善軸として臨む。

---

## 現在地（2026-04-19 時点）

| 項目 | 状態 |
|---|---|
| リポジトリ (`Ontake100_2026`) | ✅ 初期化済 |
| Firebase プロジェクト | ✅ 作成済 |
| Firestore シード | ✅ 投入済（レース・エイド・セグメント・週次計画・GI・旅程） |
| Web UI 骨格（5タブ） | ✅ 静的データで動作確認済 |
| Firestore 連動 | 🔄 進行中 |

---

## フェーズ構成

```
Phase 0  Done    ████ リポジトリ・Firebase・シード
Phase 1  Now     ████ Firestore連動 + 基本UX完成
Phase 2  〜5/17  ████ Training Cockpit + Strava連携
Phase 3  〜6/7   ████ Race Bible 深掘り（GPX・GAP・ETA）
Phase 4  〜6/28  ████ Race-Day Companion（Fenix + Android）
Phase 5  〜7/17  ████ 本番準備（ドライラン・パッキング）
Race     7/19    ⛰️  OSJ ONTAKE 100
Retro    7/20〜  ████ 振り返り・次戦へ
```

---

## Phase 0 — 完了済み

### 成果物
- Vite + React 19 + TS + Tailwind 4 + PWA + Firebase 12
- Firestore コレクション構造（下記参照）
- seed スクリプト（`scripts/seed-admin.ts`）

### Firestore スキーマ
```
races/{raceId}
  .aidStations/{aidId}
  .segments/{segId}
trainingPlan/{week-N}
giHeatPlan/{planId}
trips/{tripId}
activities/{activityId}       ← Phase 2 で追加
  .laps/{lapIdx}
trainingLog/{date}            ← Phase 2 で追加（CTL/ATL/TSB）
```

---

## Phase 1 — Firestore 連動 + 基本 UX（今週〜4/26）

**目的**: 静的ハードコードを全廃し、Firestore を Single Source of Truth にする。  
UI 全体がリアルタイムで DB と同期した状態を作る。

### タスク
| # | 内容 | 工数 |
|---|---|---|
| 1-1 | Google Auth 実装（サインイン画面 → 全タブ保護） | 2h |
| 1-2 | `useRace` hook — races コレクション取得、3レースカード | 1h |
| 1-3 | `useAidStations` — ontake100 エイド/関門リスト | 1h |
| 1-4 | `useTrainingPlan` — 13週カレンダーを DB から描画 | 2h |
| 1-5 | `useGIHeatPlan` — プロトコル表示 + プロバイオ経過日カウンタ | 2h |
| 1-6 | `useTrips` — 旅程カード（旅程詳細・装備チェックリスト toggle） | 2h |
| 1-7 | Race Day チェックリスト — Firestore へ checked 状態を永続化 | 1h |

**合計見積**: 約 11h（週末 1〜2 回分）

### 完了定義
- すべてのタブで Firestore からデータを読んでいる
- 装備チェック・プロバイオ記録が DB に保存される
- ログインしないとデータが見えない

---

## Phase 2 — Training Cockpit + Strava 連携（4/27〜5/17, Base期）

**目的**: Garmin のトレーニングデータを自動取込し、計画 vs 実績を可視化する。  
CTL/ATL/TSB でコンディションを定量管理できる状態を作る。

### 2-A Strava 連携パイプライン
| # | 内容 | 工数 |
|---|---|---|
| 2A-1 | Strava API アプリ登録 + OAuth フロー（サーバーサイド） | 3h |
| 2A-2 | Cloud Function: Strava webhook → FIT summary → Firestore | 4h |
| 2A-3 | 過去活動一括取込スクリプト（最大 200 件） | 2h |
| 2A-4 | Garmin → Strava 自動同期を Fenix で有効化 | 0.5h |

**注意**: Garmin 公式 API は個人利用不可。Fenix → Strava → 本アプリ が唯一の合法パス。

### 2-B Training Cockpit UI
| # | 内容 | 工数 |
|---|---|---|
| 2B-1 | 週次カレンダー: 計画 vs 実績 (距離・D+) バー表示 | 3h |
| 2B-2 | CTL/ATL/TSB チャート (recharts, 42/7 日 EWMA) | 3h |
| 2B-3 | 日毎プランカード（planned → actual 記入・Strava auto-fill） | 2h |
| 2B-4 | 週次 D+ 累計トラッカー vs Ontake コース比 | 1h |

### 2-C GI・補給ログ
| # | 内容 | 工数 |
|---|---|---|
| 2C-1 | プロバイオ 28 日カウンタ（今日 Day 1 → 6/20 がDay 62） | 1h |
| 2C-2 | 毎ロングラン補給ログ（g/h・製品・GI症状）→ Firestore | 2h |
| 2C-3 | 腸トレーニング進捗グラフ（40→60→75→90 g/h ランプ） | 1h |

**合計見積**: 約 21h（週末 3〜4 回分）

### マイルストーン
- 5/17（Base 終了）: Strava 連携稼働、CTL/ATL/TSB が週次で自動更新

---

## Phase 3 — Race Bible 深掘り（5/18〜6/7, Build 前半）

**目的**: Ontake100 のコースデータを精密化し、レース戦略を数値で固める。  
GPX + GSI 標高で区間ごとの ETA・補給・水分量を出す。

### タスク
| # | 内容 | 工数 |
|---|---|---|
| 3-1 | GPX パース + GSI 標高 API で 5 区間に標高プロファイル付与 | 4h |
| 3-2 | Minetti GAP モデル実装（grade → pace adjustment） | 2h |
| 3-3 | ETA 計算エンジン（目標タイム入力 → 各 CP 通過予測・関門バッファ） | 3h |
| 3-4 | 区間別補給テーブル UI（g/h・mL/h・製品名・数量） | 2h |
| 3-5 | ドロップバッグプランナー（54km CP1 用、品目・重量） | 2h |
| 3-6 | 装備チェックリスト UI 完成（category 別・チェック永続化） | 1h |
| 3-7 | 旅程詳細 UI（出発時刻・宿泊・当日タイムライン） | 2h |

**合計見積**: 約 16h（週末 2〜3 回分）

### マイルストーン
- 6/7: ETA 計算が動き、Around Toki River 前に戦略確定済み

---

## Phase 4 — Race-Day Companion（6/8〜6/28, Build 後半〜Peak）

**目的**: Fenix 7 と Pixel 10 Pro をレース本番で使えるレベルに仕上げる。

### 4-A Fenix 7 — Up Ahead + CIQ Data Field
| # | 内容 | 工数 |
|---|---|---|
| 4A-1 | FIT Course ファイル生成スクリプト（Course Points: エイド・関門） | 3h |
| 4A-2 | Garmin Connect へのアップロード + Fenix 同期テスト | 1h |
| 4A-3 | CIQ Data Field（Monkey C）: Firebase から JSON 取得・キャッシュ | 4h |
| 4A-4 | Data Field 表示: 次エイドまでの距離・関門バッファ・補給タイマー | 3h |
| 4A-5 | sideload (.prg) → Fenix での実機動作確認 | 1h |

**制約**: Data Field は 16KB メモリ制限、haptic 通知不可（視覚のみ）。  
最重要機能は Up Ahead（Course Points）— CIQ は補助。

### 4-B Pixel 10 Pro — Android アプリ
| # | 内容 | 工数 |
|---|---|---|
| 4B-1 | Kotlin + Jetpack Compose プロジェクト初期化 | 2h |
| 4B-2 | MapLibre Native + GSI PMTiles オフライン地図 | 6h |
| 4B-3 | Foreground Service + FusedLocation（3〜30s 可変サンプリング） | 4h |
| 4B-4 | コース GPX オーバーレイ + 次エイドまでの距離計算 | 3h |
| 4B-5 | エイド 500m Geofence アラート + 補給 20 分タイマー通知 | 3h |
| 4B-6 | Room → Firestore 非同期同期（オフライン対応） | 3h |
| 4B-7 | グレイスフル UX（大文字・高コントラスト・手袋操作対応） | 2h |
| 4B-8 | AlarmManager ウォッチドッグ（OEM Battery Killer 対策） | 2h |

**合計見積 Phase 4**: 約 37h（週末 4〜6 回分）

**優先度判断**: Phase 4-A（Fenix）は Phase 4-B（Android）より小規模で効果大。  
時間が取れない場合は 4-A のみ完成させ、4-B は大会後の改善扱いも可。

### マイルストーン
- 6/14 Around Toki River: 4-A が使えること（少なくとも Up Ahead）
- 6/21 翠夏巡嶺: 4-B の地図 + 補給タイマーを試験運用

---

## Phase 5 — 本番準備（6/29〜7/17, Taper）

**目的**: すべてのシステムをレース本番で確実に動かすための検証と固定化。

| # | 内容 | 工数 |
|---|---|---|
| 5-1 | Mock GPS 10× 再生による 20h 通し動作確認 | 3h |
| 5-2 | Pixel 10 Pro 終夜バッテリー実測（電池最適化設定込み） | 1晩 |
| 5-3 | Fenix Up Ahead のコースポイント最終確認 | 1h |
| 5-4 | 装備リスト最終版フリーズ・ドロップバッグ梱包 | 2h |
| 5-5 | ETA 計算を 2022 実績タイムで検証（±10% 以内に収める） | 1h |
| 5-6 | GI プロトコル確認（プロバイオ継続日数・NSAID 停止確認） | 0.5h |

---

## Race Day — 2026-07-19

| 時刻 | 行動 |
|---|---|
| 07/18 13:00 | レンタカー (B04527) 下北沢出発 |
| 07/18 夕方 | 松原スポーツ公園 受付・必携品チェック |
| 07/18 21:00 | 夕食（低残渣）、仮眠 |
| 07/18 22:30 | 起床・プレミール（餅+味噌汁、CHO150g） |
| 07/18 23:30 | アイススラリー（500-700g）・カフェイン |
| **07/19 00:00** | **スタート（Fenix 一次 / Pixel バックアップ）** |
| 07/19 〜10:00 | CP1 (54km) 通過 ← 関門バッファ目標 +30分以上 |
| 07/19 〜15:00 | CP2 (83km) 通過 ← 関門バッファ目標 +30分以上 |
| 07/19 15:00〜20:00 | フィニッシュ目標（15:30〜16:30） |
| 07/19 晩 | ホテルやまぶき（馬刺し＆お酒・回復） |
| 07/20 20:00 | レンタカー返却 |

---

## Retro — 2026-07-20〜

| # | 内容 |
|---|---|
| R-1 | Strava FIT 取込・全区間 実績 vs 計画 比較ダッシュボード |
| R-2 | GI 症状ログ × セグメント × 気温 クロス分析 |
| R-3 | Fenix / Android アプリの UX フィードバック整理 |
| R-4 | 次戦（UTMF 2027? 天ヶ瀬 100K?）に向けた改善バックログ |

---

## リスクと緩和策

| リスク | 影響 | 緩和 |
|---|---|---|
| 開発が練習を圧迫 | DNF | Phase 4-B (Android) を捨てる判断を早める。Phase 1-3 が最低ライン。 |
| 6/14→6/21 連戦ダメージ | 翠夏巡嶺後のテーパー不足 | 翠夏巡嶺を 70% 努力度で走る。6/22〜6/28 は完全回復優先。 |
| 翠夏巡嶺 +4,500m の筋ダメージ | 28 日でリカバリー不足 | 下り速度を意識的に落とす。翌週は 60% 以下で過ごす。 |
| GI 本番失敗（特に CP2 前急登） | DNF | gut training を週次で必ず実施。6/14 Toki River がドレスリハーサル。 |
| Android OEM Battery Killer | Race Day に地図が死ぬ | Pixel 10 Pro は素の Android に近く OEM killer 軽微。事前テスト必須。 |
| Fenix CIQ 16KB 限界 | データフィールド落ちる | Up Ahead（Course Points）を主力に。CIQ は軽量化必須。 |
| 2026-07 梅雨/豪雨 | 低体温・GI悪化 | 装備に防寒・雨具を必携。雨天ペース分岐計画を ETA に内蔵。 |

---

## 技術スタック全体図

```
[Garmin Fenix 7]
  → Strava 自動同期
  → Strava API webhook
  → Cloud Function (FIT parse)
  → Firestore (activities/)

[React PWA (Web)]
  ← Firestore
  ← GSI 標高 API (コース)
  5 タブ: RaceBible / Training / GIHeat / RaceDay / Retro

[Fenix 7 CIQ Data Field] ← Firebase HTTPS (pre-race fetch)
[Fenix 7 Up Ahead]       ← FIT Course + Course Points (手動 sync)

[Pixel 10 Pro Android]
  ← Firestore (course / plan)
  ← GSI PMTiles (offline map)
  → Room → Firestore (track log)
  Foreground Service / Geofence / Nutrition Timer
```

---

## 推奨実装順序（提案）

| 優先度 | フェーズ | 理由 |
|---|---|---|
| 🔴 即時 | Phase 1 (Firestore 連動) | 今日から毎日使うツールになる。プロバイオ記録・週次ログが必要。 |
| 🔴 即時 | Phase 2-C (GI ログ) | プロバイオは Day 1 から記録が必要。今週スタートが間に合う最後。 |
| 🟠 4月末〜 | Phase 2-A (Strava 連携) | 練習データが入らないと Training Cockpit が空。早いほど蓄積できる。 |
| 🟠 5月〜 | Phase 2-B (CTL/ATL UI) | データが溜まってから意味が出る。2A の 2 週後で十分。 |
| 🟡 5月末〜 | Phase 3 (GPX・ETA) | 6/14 レース前に戦略を固めたい。5月中に完成が目標。 |
| 🟡 6月上旬〜 | Phase 4-A (Fenix CIQ) | Around Toki River (6/14) で試したい。最小 Up Ahead だけでも。 |
| 🟢 6月中旬〜 | Phase 4-B (Android) | 翠夏巡嶺 (6/21) で試験運用。完成しなければ捨て判断も可。 |
| 🔵 7月〜 | Phase 5 (ドライラン) | テーパー期の空き時間で確認。 |

---

## 工数サマリー

| フェーズ | 見積時間 | 対象期間 | 週末作業 |
|---|---|---|---|
| Phase 1 | 11h | 4/19〜4/26 | 1〜2 回 |
| Phase 2 | 21h | 4/27〜5/17 | 3〜4 回 |
| Phase 3 | 16h | 5/18〜6/7 | 2〜3 回 |
| Phase 4-A | 12h | 6/8〜6/28 | 1〜2 回 |
| Phase 4-B | 25h | 6/8〜6/28 | 3〜4 回 |
| Phase 5 | 8h | 6/29〜7/17 | 1〜2 回 |
| **合計** | **〜93h** | **13 週** | |

> Phase 4-B (Android) を省くと **〜68h**、週平均 **5〜6h** のペース。  
> トレーニング週間 100〜155km と並行するなら Phase 4-B は「作れたらラッキー」扱いが現実的。

---

*最終更新: 2026-04-19*
