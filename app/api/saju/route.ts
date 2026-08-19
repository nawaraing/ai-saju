import { calculateSaju } from "@/lib/saju";
import { buildUserContent, SYSTEM_PROMPT } from "@/lib/prompt";
import { interpretSaju } from "@/lib/gemini";
import type { SajuRequest } from "@/types/saju";

// docs/engineering/architecture.md §7 처리 흐름:
// 입력검증 → (음력이면) 변환 → 계산 → 프롬프트 조립 → Gemini 호출 → 응답
//
// 응답은 줄바꿈으로 구분된 JSON 이벤트 스트림(NDJSON)이다.
// 첫 줄: {"type":"result", "result": SajuResult} — 계산 결과, 즉시 렌더 가능.
// 다음 줄: {"type":"chunk", "text": string} — 해석 텍스트 전체 (현재 Gemini 호출은 일괄 방식, lib/gemini 참고).
// 에러 시: {"type":"error", "message": string}.
export async function POST(request: Request) {
  const body = (await request.json()) as SajuRequest;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const result = calculateSaju(body.input, {
          fortuneType: body.fortuneType,
          targetYear: body.targetYear,
        });
        send({ type: "result", result });

        const userContent = buildUserContent(result, body);
        const text = await interpretSaju(SYSTEM_PROMPT, userContent);
        send({ type: "chunk", text });
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
