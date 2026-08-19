import { analyzeSaju } from "saju-fortune";
import type { SajuInput, SajuResult, Pillar as MappedPillar } from "@/types/saju";

// docs/engineering/saju-engine.md §5에서 연/월/일/시주 계산 로직을 검증하고 채택 확정.
// 남은 한계(절기 고정 날짜 테이블)는 analyzeSaju가 반환하는 limitations로 노출한다.

type RawPillar = ReturnType<typeof analyzeSaju>["pillars"]["year"];

function mapPillar(raw: RawPillar): MappedPillar {
  return {
    label: raw.label,
    hanja: raw.hanja,
    stem: raw.stem,
    branch: raw.branch,
    stemElementKo: raw.stemElementKo,
    branchElementKo: raw.branchElementKo,
    branchAnimal: raw.branchAnimal,
    yinYang: raw.yinYang,
  };
}

// 계산(input) → result 경계 고정 (architecture.md §6).
// 음력 입력은 이 함수 호출 전 반드시 검증된 라이브러리로 양력 변환을 마쳐야 한다
// (saju-fortune은 음력 변환을 지원하지 않고 명시적으로 거부한다).
export function calculateSaju(
  input: SajuInput,
  options: { fortuneType: string; targetYear?: number },
): SajuResult {
  if (input.calendar === "lunar") {
    throw new Error("음력 입력은 서버에서 먼저 양력으로 변환한 뒤 calculateSaju에 전달해야 합니다.");
  }

  const raw = analyzeSaju(
    {
      name: input.name,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      calendar: "solar",
      isLeapMonth: input.isLeapMonth,
      gender: input.gender,
      birthCity: input.birthCity,
    },
    {
      analysisType: "fortune",
      fortuneType: options.fortuneType,
      targetYear: options.targetYear,
    },
  );

  return {
    pillars: {
      year: mapPillar(raw.pillars.year),
      month: mapPillar(raw.pillars.month),
      day: mapPillar(raw.pillars.day),
      hour: raw.pillars.hour ? mapPillar(raw.pillars.hour) : null,
    },
    timeAccuracy: raw.timeAccuracy,
    limitations: raw.limitations,
    dayMaster: {
      stem: raw.dayMaster.stem,
      elementKo: raw.dayMaster.elementKo,
      yinYang: raw.dayMaster.yinYang,
      strength: raw.dayMaster.strength,
    },
    fiveElements: raw.fiveElements,
    dominantElements: raw.dominantElements,
    weakElements: raw.weakElements,
    yongsin: {
      primaryKo: raw.yongsin.primaryKo,
      secondaryKo: raw.yongsin.secondaryKo,
      reasoning: raw.yongsin.reasoning,
    },
    fortune: raw.fortune,
  };
}
