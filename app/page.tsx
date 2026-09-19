"use client";

import { useState } from "react";
import Link from "next/link";
import { SajuForm, type SajuFormValues } from "@/components/SajuForm";
import { SajuResultView } from "@/components/SajuResultView";
import { parseSajuStream } from "@/lib/saju/stream";
import type { SajuResult } from "@/types/saju";

export default function Home() {
  const [submitting, setSubmitting] = useState(false);
  const [interpreting, setInterpreting] = useState(false);
  const [result, setResult] = useState<SajuResult | null>(null);
  const [interpretation, setInterpretation] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: SajuFormValues) {
    setSubmitting(true);
    setError(null);
    setResult(null);
    setInterpretation("");

    try {
      const response = await fetch("/api/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: values.input,
          fortuneType: "general",
          targetYear: values.targetYear,
        }),
      });

      if (!response.body) {
        throw new Error("서버 응답을 받지 못했습니다.");
      }

      for await (const event of parseSajuStream(response.body)) {
        if (event.type === "result") {
          setResult(event.result);
          setInterpreting(true);
        } else if (event.type === "chunk") {
          setInterpretation((prev) => prev + event.text);
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    } catch {
      setError("풀이를 가져오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
      setInterpreting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">AI 사주</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          태어난 연·월·일·시로 사주를 계산하고, AI가 자연어로 풀이해 드려요.
        </p>
        <Link href="/stats" className="mt-1 text-xs text-zinc-500 hover:underline">
          음양오행 통계 보기 →
        </Link>
      </header>

      {!result && <SajuForm onSubmit={handleSubmit} submitting={submitting} />}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <>
          <SajuResultView result={result} interpretation={interpretation} interpreting={interpreting} />
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setInterpretation("");
              setError(null);
            }}
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            다시 입력하기
          </button>
        </>
      )}
    </div>
  );
}
