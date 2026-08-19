import type { SajuResult } from "@/types/saju";

interface SajuResultViewProps {
  result: SajuResult;
  interpretation: string;
  interpreting: boolean;
}

const ELEMENT_LABEL: Record<string, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

const PILLAR_LABEL = { year: "연주", month: "월주", day: "일주", hour: "시주" } as const;

export function SajuResultView({ result, interpretation, interpreting }: SajuResultViewProps) {
  const { pillars, fiveElements } = result;
  const maxCount = Math.max(...Object.values(fiveElements), 1);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-4 gap-2">
        {(Object.keys(PILLAR_LABEL) as (keyof typeof PILLAR_LABEL)[]).map((key) => {
          const pillar = pillars[key];
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 py-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-[11px] text-zinc-400">{PILLAR_LABEL[key]}</span>
              {pillar ? (
                <>
                  <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{pillar.hanja}</span>
                  <span className="text-xs text-zinc-500">{pillar.label}</span>
                </>
              ) : (
                <span className="pt-3 text-xs text-zinc-400">미상</span>
              )}
            </div>
          );
        })}
      </section>

      {result.limitations.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {result.limitations.join(" ")}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">오행 분포</h2>
        <div className="flex flex-col gap-1.5">
          {Object.entries(fiveElements).map(([element, count]) => (
            <div key={element} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs text-zinc-500">{ELEMENT_LABEL[element]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-4 shrink-0 text-right text-xs text-zinc-500">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {(interpretation || interpreting) && (
        <section className="flex flex-col gap-2 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-white p-4 text-[15px] leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {interpretation}
          {interpreting && <span className="animate-pulse text-zinc-400">▍</span>}
        </section>
      )}
    </div>
  );
}
