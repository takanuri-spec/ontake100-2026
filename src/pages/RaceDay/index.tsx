import { doc, setDoc } from 'firebase/firestore'
import { useDoc } from '@/hooks/useFirestore'
import { db } from '@/lib/firebase'

interface ChecklistDoc { id: string; checkedItems?: Record<string, boolean> }

const timeline = [
  { id: 'T-7d',  label: 'T-7日前',          prep: true,  items: ['低残渣食開始（-48h前から厳格化）', 'NSAID完全停止', 'プロバイオ継続（4週目）', '装備最終チェック（氷用バンダナ・塩タブ・ジェル・生姜）'] },
  { id: 'T-24h', label: 'T-24時間前',        prep: true,  items: ['尿比重1.010以下', '夕食: 餅・うどん・白身魚（食物繊維<10g）', 'カフェインは夕方まで'] },
  { id: 'T-90m', label: 'T-90分（22:30）',   prep: true,  items: ['お粥/餅+味噌汁（CHO 100-150g、Na 500mg）', '水500mL（Na含有）', 'アイススラリー準備'] },
  { id: 'T-30m', label: 'T-30分（23:30）',   prep: true,  items: ['プリクーリング: アイススラリー摂取', 'カフェイン 100-200mg + ジェル1本'] },
  { id: '0:00',  label: '00:00 スタート',    prep: false, items: ['最初の30分は水のみ', 'Fenix + Pixel確認', 'ポール準備'] },
  { id: 'ev20',  label: '毎20分',            prep: false, items: ['糖質 22-25g（ジェル or Drink Mix）'] },
  { id: 'ev1h',  label: '毎1時間',           prep: false, items: ['Na 800-1500mg（塩タブ確認）', '水 400-700mL（渇きベース）', '尿色・体感チェック'] },
  { id: 'climb', label: '登り入口',          prep: false, items: ['ペース-5bpm維持（即パワーハイク: 勾配10%超 or Z3上限）', '固形→液体シフト（脂質・タンパク質ゼロ）'] },
  { id: 'aid',   label: 'エイド',            prep: false, items: ['氷: キャップ・バンダナ・首へ', '濡れアームスリーブ', '塩タブ補充', 'CP1(54km): ドロップバッグ取出し・着替え確認'] },
  { id: 'late',  label: '後半（80km〜）',    prep: false, items: ['EAA/ホエイ少量 10-15g/h', 'カフェイン追加 50-100mg（眠気対策）', 'CP2(83km)関門まで1h以上あるか確認'] },
  { id: 'GI',    label: '⚠️ GI警告',        prep: false, items: ['げっぷ・膨満 → 即ハイク、固形停止、生姜', '嘔吐/下痢/冷や汗 → 5-10分休止+冷却+ORS。30分改善なし → DNF判断'] },
]

const mustNotList = [
  'NSAID（イブプロフェン等）✗',
  '登りで脂質・プロテイン ✗',
  '濃いスポドリ大量 ✗',
  'のどが渇いていない時の大量飲水 ✗',
]

const CHECKLIST_DOC = 'raceChecklist/prep'

function itemKey(timelineId: string, idx: number) {
  return `${timelineId}-${idx}`
}

export default function RaceDay() {
  const { data: checklistDoc } = useDoc<ChecklistDoc>(CHECKLIST_DOC)
  const checkedItems = checklistDoc?.checkedItems ?? {}

  const toggleItem = async (timelineId: string, idx: number) => {
    const key = itemKey(timelineId, idx)
    await setDoc(
      doc(db, 'raceChecklist', 'prep'),
      { checkedItems: { [key]: !checkedItems[key] } },
      { merge: true }
    )
  }

  const prepSections = timeline.filter(t => t.prep)
  const prepTotal = prepSections.reduce((acc, t) => acc + t.items.length, 0)
  const prepChecked = prepSections.reduce((acc, t) =>
    acc + t.items.filter((_, i) => checkedItems[itemKey(t.id, i)]).length, 0
  )

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-emerald-400 mb-1">レース当日</h1>
        <p className="text-stone-400 text-sm">2026-07-19 00:00スタート | 制限 20時間</p>
      </section>

      {/* Race stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '距離',    value: '109km' },
          { label: '累積D+',  value: '+3,780m' },
          { label: '2022タイム', value: '15:20:54' },
        ].map(s => (
          <div key={s.label} className="bg-stone-900 rounded-xl p-3 text-center border border-stone-800">
            <div className="text-emerald-400 font-bold">{s.value}</div>
            <div className="text-stone-500 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pre-race prep checklist */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">レース前 準備チェック</h2>
          <span className={`text-xs font-bold ${prepChecked === prepTotal ? 'text-emerald-400' : 'text-stone-400'}`}>
            {prepChecked}/{prepTotal}
          </span>
        </div>
        <div className="h-1 bg-stone-800 rounded mb-3">
          <div
            className={`h-full rounded transition-all duration-300 ${prepChecked === prepTotal ? 'bg-emerald-500' : 'bg-blue-600'}`}
            style={{ width: prepTotal > 0 ? `${Math.round((prepChecked / prepTotal) * 100)}%` : '0%' }}
          />
        </div>
        <div className="space-y-2">
          {timeline.filter(t => t.prep).map(t => (
            <details key={t.id} className="rounded-xl border border-stone-800 bg-stone-900 group" open>
              <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
                <span className="font-semibold text-sm">{t.label}</span>
                <span className="text-stone-500 text-xs">
                  {t.items.filter((_, i) => checkedItems[itemKey(t.id, i)]).length}/{t.items.length}
                </span>
              </summary>
              <ul className="px-3 pb-3 space-y-1 border-t border-stone-800">
                {t.items.map((item, i) => {
                  const key = itemKey(t.id, i)
                  const checked = checkedItems[key] === true
                  return (
                    <li key={i}>
                      <button
                        onClick={() => toggleItem(t.id, i)}
                        className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors mt-1 ${
                          checked ? 'opacity-60' : 'hover:bg-stone-800'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'bg-emerald-600 border-emerald-600' : 'border-stone-600 bg-stone-800'
                        }`}>
                          {checked && <span className="text-white text-xs leading-none">✓</span>}
                        </span>
                        <span className={`text-sm ${checked ? 'line-through text-stone-500' : 'text-stone-300'}`}>
                          {item}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          ))}
        </div>
      </section>

      {/* In-race reference */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">レース中 リファレンス</h2>
        {timeline.filter(t => !t.prep).map(t => (
          <details key={t.id} className="rounded-xl border border-stone-800 bg-stone-900 group">
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between list-none">
              <span className={`font-semibold text-sm ${t.id === 'GI' ? 'text-red-400' : ''}`}>{t.label}</span>
              <span className="text-stone-600 text-xs group-open:hidden">{t.items.length}項目</span>
            </summary>
            <ul className="px-4 pb-3 space-y-1.5 border-t border-stone-800">
              {t.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-300 pt-2">
                  <span className="text-emerald-500 shrink-0">▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      {/* Must NOT */}
      <section className="bg-red-950/30 rounded-xl p-4 border border-red-800">
        <h2 className="font-semibold text-red-400 mb-2 text-sm">絶対にやらない</h2>
        <ul className="space-y-1">
          {mustNotList.map((item, i) => (
            <li key={i} className="text-sm text-red-200 flex gap-2">
              <span>✗</span>{item}
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded-xl border border-dashed border-stone-700 p-6 text-center text-stone-500 text-sm">
        リアルタイムタイマー・エイドETA・補給インターバルアラーム — Phase 3実装予定
      </div>
    </div>
  )
}
