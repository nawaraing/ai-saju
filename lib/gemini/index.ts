import { GoogleGenAI } from "@google/genai";

// docs/engineering/architecture.md §5: 키는 서버 env에서만 접근, 클라이언트 노출 금지.
// docs/saju/interpretation-prompt.md §7: Gemini 모델/파라미터는 미결정.
// gemini-flash-latest가 간헐적으로 503(과부하)이거나 느려(2026-08-20~22 확인),
// 순서대로 한 번씩 시도하는 폴백 목록을 둔다. 같은 모델을 대기 후 재시도하지는 않는다.
export const GEMINI_MODELS = ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"] as const;

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
// GEMINI_MODELS를 순서대로 한 번씩 시도한다. 대기 후 재시도(백오프)는 하지 않고,
// 실패하면 즉시 다음 모델로 넘어간다. 전부 실패하면 마지막 에러를 던진다.
export async function interpretSaju(systemInstruction: string, userContent: string): Promise<string> {
  const ai = getClient();

  let lastError: unknown;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userContent,
        config: { systemInstruction },
      });
      return response.text ?? "";
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
