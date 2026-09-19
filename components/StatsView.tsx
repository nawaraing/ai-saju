import type { SajuStats } from "@/lib/supabase/stats";

interface StatsViewProps {
  stats: SajuStats;
}

const ELEMENT_LABEL: Record<string, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

const STEM_ORDER = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];

const STRENGTH_LABEL: Record<string, string> = {
  strong: "신강",
  weak: "신약",
  balanced: "중화",
};

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs text-zinc-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300"
          style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs text-zinc-500">{count}</span>
    </div>
  );
}

export function StatsView({ stats }: StatsViewProps) {
  const { totalReadings, fiveElementsTotal, dayMasterStemCounts, strengthCounts, timeAccuracyCounts } = stats;

  if (totalReadings === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        아직 쌓인 풀이가 없어요.
      </div>
    );
  }

  const fiveElementsMax = Math.max(...Object.values(fiveElementsTotal), 1);
  const stemMax = Math.max(...STEM_ORDER.map((stem) => dayMasterStemCounts[stem] ?? 0), 1);
  const strengthTotal = strengthCounts.strong + strengthCounts.weak + strengthCounts.balanced;
  const timeAccuracyTotal = timeAccuracyCounts.known + timeAccuracyCounts.unknown;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{totalReadings}</span>
        <p className="mt-1 text-xs text-zinc-500">누적 풀이 수</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">오행 분포 (전체 합산)</h2>
        <div className="flex flex-col gap-1.5">
          {Object.entries(fiveElementsTotal).map(([element, count]) => (
            <Bar key={element} label={ELEMENT_LABEL[element]} count={count} max={fiveElementsMax} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">일간(천간) 분포</h2>
        <div className="flex flex-col gap-1.5">
          {STEM_ORDER.map((stem) => (
            <Bar key={stem} label={stem} count={dayMasterStemCounts[stem] ?? 0} max={stemMax} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">신강 · 신약 비율</h2>
        <div className="flex flex-col gap-1.5">
          {(["strong", "weak", "balanced"] as const).map((key) => {
            const count = strengthCounts[key];
            const percent = strengthTotal > 0 ? Math.round((count / strengthTotal) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-zinc-500">{STRENGTH_LABEL[key]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300" style={{ width: `${percent}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-zinc-500">{percent}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">시주 확정 비율</h2>
        <div className="flex flex-col gap-1.5">
          {(["known", "unknown"] as const).map((key) => {
            const count = timeAccuracyCounts[key];
            const percent = timeAccuracyTotal > 0 ? Math.round((count / timeAccuracyTotal) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-zinc-500">{key === "known" ? "확정" : "미상"}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300" style={{ width: `${percent}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-zinc-500">{percent}%</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
