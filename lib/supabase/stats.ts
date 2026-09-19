import { getSupabaseClient } from "@/lib/supabase";

export interface SajuStats {
  totalReadings: number;
  fiveElementsTotal: { wood: number; fire: number; earth: number; metal: number; water: number };
  dayMasterStemCounts: Record<string, number>;
  strengthCounts: Record<"strong" | "weak" | "balanced", number>;
  timeAccuracyCounts: Record<"known" | "unknown", number>;
}

interface StatsRow {
  day_master_stem: string;
  day_master_strength: "strong" | "weak" | "balanced";
  five_elements: { wood: number; fire: number; earth: number; metal: number; water: number };
  time_accuracy: "known" | "unknown";
}

// docs/engineering/database.md §5: RPC/뷰 없이 전체 row를 select해 애플리케이션 레벨에서 집계한다.
export async function getSajuStats(): Promise<SajuStats> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("saju_readings")
    .select("day_master_stem, day_master_strength, five_elements, time_accuracy")
    .returns<StatsRow[]>();

  if (error) {
    throw new Error(`통계 조회 실패: ${error.message}`);
  }

  const fiveElementsTotal = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const dayMasterStemCounts: Record<string, number> = {};
  const strengthCounts = { strong: 0, weak: 0, balanced: 0 };
  const timeAccuracyCounts = { known: 0, unknown: 0 };

  for (const row of data ?? []) {
    for (const el of Object.keys(fiveElementsTotal) as (keyof typeof fiveElementsTotal)[]) {
      fiveElementsTotal[el] += row.five_elements?.[el] ?? 0;
    }
    dayMasterStemCounts[row.day_master_stem] = (dayMasterStemCounts[row.day_master_stem] ?? 0) + 1;
    strengthCounts[row.day_master_strength] += 1;
    timeAccuracyCounts[row.time_accuracy] += 1;
  }

  return {
    totalReadings: data?.length ?? 0,
    fiveElementsTotal,
    dayMasterStemCounts,
    strengthCounts,
    timeAccuracyCounts,
  };
}
