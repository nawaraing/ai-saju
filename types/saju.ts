export type Calendar = "solar" | "lunar";
export type Gender = "male" | "female";
export type FortuneType = "general" | "love" | "wealth" | "career" | "health";

export interface SajuInput {
  name?: string;
  calendar: Calendar;
  isLeapMonth?: boolean;
  birthDate: string; // YYYY-MM-DD (양력 기준, 음력이면 서버에서 변환 후 채움)
  birthTime?: string; // HH:mm, 없으면 시주 미확정
  gender: Gender;
  birthCity?: string;
}

export interface SajuRequest {
  input: SajuInput;
  fortuneType: FortuneType;
  targetYear?: number;
}

// analyzeSaju(또는 대체 엔진) 산출물 중 서비스가 실제로 사용하는 필드.
// 상세 원본 구조는 docs/engineering/saju-engine.md §3 참고.
export interface SajuResult {
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  };
  timeAccuracy: "known" | "unknown";
  limitations: string[];
  dayMaster: {
    stem: string;
    elementKo: string;
    yinYang: "yang" | "yin";
    strength: "strong" | "weak" | "balanced";
  };
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  dominantElements: string[];
  weakElements: string[];
  yongsin: {
    primaryKo: string;
    secondaryKo: string;
    reasoning: string;
  };
  fortune: {
    summary: string;
    guidance: string[];
    caveat: string;
  };
}

export interface Pillar {
  label: string; // 한글 간지, 예: "경오"
  hanja: string; // 한자 간지, 예: "庚午"
  stem: string;
  branch: string;
  stemElementKo: string;
  branchElementKo: string;
  branchAnimal: string;
  yinYang: "yang" | "yin";
}

// POST /api/saju가 내려주는 NDJSON 스트림의 각 줄. app/api/saju/route.ts 참고.
export type SajuStreamEvent =
  | { type: "result"; result: SajuResult }
  | { type: "chunk"; text: string }
  | { type: "error"; message: string };
