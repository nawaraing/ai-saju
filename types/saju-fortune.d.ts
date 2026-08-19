declare module "saju-fortune" {
  interface AnalyzeSajuInput {
    name?: string;
    birthDate: string;
    birthTime?: string;
    calendar: "solar" | "lunar";
    isLeapMonth?: boolean;
    gender: "male" | "female";
    birthCity?: string;
  }

  interface AnalyzeSajuOptions {
    analysisType: "basic" | "fortune" | "yongsin" | "school_compare" | "yongsin_method";
    fortuneType?: string;
    targetYear?: number;
  }

  interface RawPillar {
    label: string;
    hanja: string;
    stem: string;
    branch: string;
    stemElementKo: string;
    branchElementKo: string;
    branchAnimal: string;
    yinYang: "yang" | "yin";
  }

  interface AnalyzeSajuResult {
    pillars: {
      year: RawPillar;
      month: RawPillar;
      day: RawPillar;
      hour: RawPillar | null;
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

  // 실제 반환 구조는 docs/engineering/saju-engine.md §3 참고.
  // 서비스에서 쓰는 필드만 최소 선언한다.
  function analyzeSaju(input: AnalyzeSajuInput, options: AnalyzeSajuOptions): AnalyzeSajuResult;
  function checkCompatibility(args: unknown): unknown;
  function callSajuTool(name: string, args?: unknown): unknown;
  function getMissingInterviewFields(input?: unknown): string[];
  function normalizeBirthInput(input: unknown): unknown;

  export { analyzeSaju, checkCompatibility, callSajuTool, getMissingInterviewFields, normalizeBirthInput };
}
