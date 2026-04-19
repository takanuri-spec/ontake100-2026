export default function Retro() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-emerald-400 mb-1">振り返り</h1>
        <p className="text-stone-400 text-sm">レース後 — 実績 vs 計画 / GI分析 / 次戦への改善</p>
      </section>

      {/* Past race baseline */}
      <section className="bg-stone-900 rounded-xl p-4 border border-stone-700">
        <h2 className="font-semibold mb-3 text-sm text-stone-400 uppercase tracking-wider">ITRAベースライン</h2>
        <div className="space-y-2">
          {[
            { date: '2022-07-17', race: 'OSJ ONTAKE100', result: '15:20:54', dist: '106km / 2,430m+' },
            { date: '2022-11-19', race: 'FTR Chichibu 100K', result: '26:58:53', dist: '106km / 5,790m+' },
            { date: '2024-04-26', race: 'MtFUJI100', result: '41:11:21', dist: '162km / 7,348m+' },
            { date: '2024-09-08', race: 'OSJ Adatarayama 50K', result: '13:28:51', dist: '52km / 3,764m+' },
          ].map(r => (
            <div key={r.date} className="flex items-center justify-between text-sm py-1.5 border-b border-stone-800 last:border-0">
              <div>
                <span className="text-stone-300">{r.race}</span>
                <span className="text-stone-500 text-xs ml-2">{r.dist}</span>
              </div>
              <div className="text-right">
                <div className="text-emerald-400 font-mono">{r.result}</div>
                <div className="text-stone-600 text-xs">{r.date}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-dashed border-stone-700 p-6 text-center text-stone-500 text-sm">
        Strava FIT取込・セグメント別実績 vs 計画・GI症状タイムライン・改善バックログ — レース後に実装
      </div>
    </div>
  )
}
