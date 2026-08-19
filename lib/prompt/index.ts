import type { SajuRequest, SajuResult } from "@/types/saju";

// docs/saju/interpretation-prompt.md §0 튜닝 변수 (기본값)
export const PROMPT_TUNING = {
  tone: "전문 상담사형 존댓말",
  length: "중간 (주제당 2~4문단)",
  termLevel: "괄호 병기",
  emoji: false,
} as const;

// docs/saju/interpretation-prompt.md §1 시스템 프롬프트
export const SYSTEM_PROMPT = `당신은 사주 명리학을 바탕으로 상담하는 전문 상담사입니다.
사용자의 사주 여덟 글자와 오행 분석은 이미 정확히 계산되어 아래에 주어집니다.
당신의 역할은 이 계산 결과를 '해석'하는 것입니다. 계산을 다시 하거나 글자를 바꾸지 마세요.

[말투]
- 정중하고 차분한 존댓말을 사용합니다.
- 단정하지 않습니다. "~한 경향이 있어요", "~하기 쉬운 편이에요"처럼 여지를 둡니다.
- 전문용어는 괄호로 가볍게 병기하되, 설명은 쉬운 말로 풉니다. (예: 재물운(정재))

[해석 원칙]
- 결정론적 예언이 아니라 자기 이해와 자기 점검을 돕는 참고 자료로 제시합니다.
- 강한 기운의 장점을 살리고, 부족한 기운은 보완하는 방향으로 조언합니다.
- 단점을 말할 때는 반드시 보완책과 함께 제시합니다.
- 주어진 계산 결과(오행 분포, 신강신약, 용신)에 근거해서만 말합니다. 근거 없는 내용을 지어내지 않습니다.

[금지]
- 단정적 흉언, 저주, 사망 예언, 질병 확정 표현 금지.
- 의료·투자·법률 등 중대한 결정을 대신하지 않습니다.
- 성별을 근거로 음양의 강약을 판단하지 않습니다. (음양 강약은 주어진 계산 결과만 따름)`;

const FORTUNE_TYPE_KO: Record<SajuRequest["fortuneType"], string> = {
  general: "종합",
  love: "연애",
  wealth: "재물",
  career: "직업",
  health: "건강",
};

// docs/saju/interpretation-prompt.md §2 입력 포맷
export function buildInputSection(result: SajuResult, request: SajuRequest): string {
  const { pillars, dayMaster, fiveElements, dominantElements, weakElements, yongsin, timeAccuracy, limitations } =
    result;

  const hourText = pillars.hour ? `${pillars.hour.label}(${pillars.hour.hanja})` : "미상(시간 정보 없음)";

  return `[사주 계산 결과]
- 네 기둥:
    연주 ${pillars.year.label}(${pillars.year.hanja})
    월주 ${pillars.month.label}(${pillars.month.hanja})
    일주 ${pillars.day.label}(${pillars.day.hanja})
    시주 ${hourText}
- 일간(나): ${dayMaster.stem} / ${dayMaster.elementKo} / ${dayMaster.yinYang} / 힘: ${dayMaster.strength}
- 오행 분포: 목 ${fiveElements.wood} · 화 ${fiveElements.fire} · 토 ${fiveElements.earth} · 금 ${fiveElements.metal} · 수 ${fiveElements.water}
- 강한 오행: ${dominantElements.join(", ")}
- 부족한 오행: ${weakElements.join(", ")}
- 용신(보완점): ${yongsin.primaryKo} (보조 ${yongsin.secondaryKo})
- 시간 정확도: ${timeAccuracy}
- 한계: ${limitations.join(" ") || "없음"}

[사용자 요청]
- 주제: ${FORTUNE_TYPE_KO[request.fortuneType]}
- 대상 연도: ${request.targetYear ?? "미지정"}`;
}

// docs/saju/interpretation-prompt.md §3 출력 구조 지시
export const OUTPUT_STRUCTURE_INSTRUCTION = `다음 6단계 구조로 답하세요:
1. 입력 확인 & 한계 (양/음력, 시간, 출생지 누락 여부를 짧게)
2. 사주팔자 요약 (네 기둥과 일간을 한두 문장으로)
3. 오행 분포 (강한/부족한 오행을 생활 언어로)
4. 주제별 풀이 (요청한 주제만 깊게)
5. 실천 조언 (습관·태도·관계·리스크 관리 관점)
6. 주의 문구 (자기점검용 참고 자료이며 의료·투자·법률 판단을 대신하지 않음)

모바일 가독성을 우선하세요: 짧은 문단, 소제목 활용 가능.`;

export function buildPrompt(result: SajuResult, request: SajuRequest): string {
  return [SYSTEM_PROMPT, buildInputSection(result, request), OUTPUT_STRUCTURE_INSTRUCTION].join("\n\n");
}

// Gemini systemInstruction 파라미터로 시스템 프롬프트를 분리해 전달할 때 사용.
export function buildUserContent(result: SajuResult, request: SajuRequest): string {
  return [buildInputSection(result, request), OUTPUT_STRUCTURE_INSTRUCTION].join("\n\n");
}
