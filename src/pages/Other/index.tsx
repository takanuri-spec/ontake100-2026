import { Link } from 'react-router-dom'

const pastRaces = [
  { date: '2022-07-17', race: 'OSJ ONTAKE100',       result: '15:20:54', dist: '106km / 2,430m+' },
  { date: '2022-11-19', race: 'FTR Chichibu 100K',   result: '26:58:53', dist: '106km / 5,790m+' },
  { date: '2024-04-26', race: 'MtFUJI100',            result: '41:11:21', dist: '162km / 7,348m+' },
  { date: '2024-09-08', race: 'OSJ Adatarayama 50K', result: '13:28:51', dist: '52km / 3,764m+' },
]

const usefulLinks = [
  { label: 'OSJ ONTAKE 100 公式', url: 'https://www.powersports.co.jp/osj/ontake/' },
  { label: 'ITRA — レース検索',    url: 'https://itra.run/' },
  { label: 'Strava',              url: 'https://www.strava.com/' },
  { label: 'Garmin Connect',      url: 'https://connect.garmin.com/' },
  { label: 'Maurten 製品情報',     url: 'https://www.maurten.com/' },
]

export default function Other() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1 text-stone-400 hover:text-stone-700 text-sm transition-colors font-medium">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          ホーム
        </Link>
        <span className="text-stone-300 text-xs">|</span>
        <h1 className="text-xl font-black text-stone-900">その他</h1>
      </div>

      {/* 振り返り */}
      <section>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">ITRAベースライン</h2>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {pastRaces.map((r, i) => (
            <div
              key={r.date}
              className={`flex items-center justify-between px-4 py-3.5 text-sm ${
                i < pastRaces.length - 1 ? 'border-b border-stone-100' : ''
              }`}
            >
              <div>
                <div className="text-stone-800 font-semibold">{r.race}</div>
                <div className="text-stone-400 text-xs mt-0.5">{r.dist}</div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-emerald-600 font-black font-mono">{r.result}</div>
                <div className="text-stone-400 text-xs">{r.date}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-dashed border-stone-200 p-5 text-center text-stone-400 text-sm bg-white">
          Strava FIT取込・セグメント別実績 vs 計画・GI症状タイムライン・改善バックログ — レース後に実装
        </div>
      </section>

      {/* リンク */}
      <section>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">リンク</h2>
        <div className="space-y-2">
          {usefulLinks.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 border border-stone-100 shadow-sm hover:shadow-md hover:border-stone-200 transition-all"
            >
              <span className="text-sm font-medium text-stone-800">{l.label}</span>
              <svg className="w-4 h-4 text-stone-400 shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </div>
      </section>

      {/* 管理 */}
      <section>
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">管理</h2>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-2 text-xs text-stone-500">
          <p className="font-medium">Firestoreデータ再投入:</p>
          <code className="block bg-stone-100 rounded-xl px-3 py-2.5 text-stone-700 font-mono">
            npx tsx scripts/seed-admin.ts
          </code>
          <p className="text-stone-400">※ serviceAccount.json が必要 (gitignore済)</p>
        </div>
      </section>
    </div>
  )
}
