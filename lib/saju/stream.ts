import type { SajuStreamEvent } from "@/types/saju";

// POST /api/saju의 NDJSON(줄바꿈 구분 JSON) 응답 본문을 이벤트 단위로 파싱한다.
export async function* parseSajuStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SajuStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        yield JSON.parse(line) as SajuStreamEvent;
      }
    }
  }

  const rest = buffer.trim();
  if (rest) {
    yield JSON.parse(rest) as SajuStreamEvent;
  }
}
