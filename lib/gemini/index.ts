import { GoogleGenAI } from "@google/genai";

// docs/engineering/architecture.md §5: 키는 서버 env에서만 접근, 클라이언트 노출 금지.
// docs/saju/interpretation-prompt.md §7: Gemini 모델/파라미터는 미결정 → gemini-flash-latest를 기본값으로 채택.
// (2026-08-20: gemini-2.5-flash는 신규 사용자 대상 404, gemini-3.7-flash는 503 과부하가 잦아
//  안정적으로 응답하는 gemini-flash-latest 별칭으로 교체. 항상 최신 안정 flash를 가리켜 유지보수 부담도 적음)
export const GEMINI_MODEL = "gemini-flash-latest";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) {
    return client;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.");
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

// docs/engineering/architecture.md §3, §7: 스트리밍(generateContentStream)이 원래 목표였으나
// 2026-08-20 기준 해당 엔드포인트가 503(과부하)을 자주 반환해 일괄 호출로 전환.
// 안정화되면 되돌릴 수 있도록 함수 경계는 유지한다.
//
// 비스트리밍 호출도 간헐적으로 503이 발생해(수요 급증은 일시적) 짧은 지수 백오프로 재시도한다.
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

function isRetryable(error: unknown): boolean {
  return error instanceof Error && /"code":\s*503|UNAVAILABLE/.test(error.message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function interpretSaju(systemInstruction: string, userContent: string): Promise<string> {
  const ai = getClient();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userContent,
        config: { systemInstruction },
      });
      return response.text ?? "";
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt || !isRetryable(error)) {
        throw error;
      }
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }

  throw new Error("interpretSaju: 재시도 로직 오류");
}
