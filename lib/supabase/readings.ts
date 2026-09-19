import { getSupabaseClient } from "@/lib/supabase";
import type { FortuneType, Gender, SajuResult } from "@/types/saju";

// docs/engineering/database.md §2 컬럼 매핑을 그대로 따른다.
interface SajuReadingRow {
  pillars: SajuResult["pillars"];
  day_master_stem: string;
  day_master_element: string;
  day_master_yin_yang: "yang" | "yin";
  day_master_strength: "strong" | "weak" | "balanced";
  five_elements: SajuResult["fiveElements"];
  dominant_elements: string[];
  weak_elements: string[];
  yongsin_primary: string;
  yongsin_secondary: string;
  time_accuracy: "known" | "unknown";
  gender: Gender | null;
  fortune_type: FortuneType;
}

// docs/engineering/database.md §5: SajuInput이 아니라 SajuResult + 최소 메타만 받는다.
// 함수 시그니처 자체가 민감정보 유입을 차단하는 가드 역할을 한다.
// 저장 실패는 사용자 응답에 영향을 주지 않도록 내부에서 삼킨다.
export async function saveSajuReading(
  result: SajuResult,
  meta: { gender?: Gender; fortuneType: FortuneType },
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const row: SajuReadingRow = {
      pillars: result.pillars,
      day_master_stem: result.dayMaster.stem,
      day_master_element: result.dayMaster.elementKo,
      day_master_yin_yang: result.dayMaster.yinYang,
      day_master_strength: result.dayMaster.strength,
      five_elements: result.fiveElements,
      dominant_elements: result.dominantElements,
      weak_elements: result.weakElements,
      yongsin_primary: result.yongsin.primaryKo,
      yongsin_secondary: result.yongsin.secondaryKo,
      time_accuracy: result.timeAccuracy,
      gender: meta.gender ?? null,
      fortune_type: meta.fortuneType,
    };

    const { error } = await supabase.from("saju_readings").insert(row);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("saveSajuReading 실패:", error);
  }
}
