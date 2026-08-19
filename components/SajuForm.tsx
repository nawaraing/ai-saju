"use client";

import { useState } from "react";
import type { Calendar, Gender, SajuInput } from "@/types/saju";

export interface SajuFormValues {
  input: SajuInput;
  targetYear: number;
}

interface SajuFormProps {
  onSubmit: (values: SajuFormValues) => void;
  submitting: boolean;
}

const currentYear = new Date().getFullYear();

export function SajuForm({ onSubmit, submitting }: SajuFormProps) {
  const [calendar, setCalendar] = useState<Calendar>("solar");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [gender, setGender] = useState<Gender>("female");
  const [birthCity, setBirthCity] = useState("");

  const isLunar = calendar === "lunar";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLunar || !birthDate) {
      return;
    }

    onSubmit({
      input: {
        calendar,
        isLeapMonth,
        birthDate,
        birthTime: timeUnknown ? undefined : birthTime || undefined,
        gender,
        birthCity: birthCity || undefined,
      },
      targetYear: currentYear,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">양력 / 음력</legend>
        <div className="flex gap-2">
          {(["solar", "lunar"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCalendar(c)}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                calendar === c
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {c === "solar" ? "양력" : "음력"}
            </button>
          ))}
        </div>

        {isLunar && (
          <>
            <label className="mt-1 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={isLeapMonth}
                onChange={(e) => setIsLeapMonth(e.target.checked)}
                className="h-4 w-4"
              />
              윤달입니다
            </label>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              음력 입력은 아직 지원하지 않습니다. 양력 생년월일로 변환해 입력해 주세요.
            </p>
          </>
        )}
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">생년월일</span>
        <input
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">태어난 시각</legend>
        <input
          type="time"
          value={birthTime}
          disabled={timeUnknown}
          onChange={(e) => setBirthTime(e.target.value)}
          className="rounded-lg border border-zinc-300 px-4 py-3 text-base disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={timeUnknown}
            onChange={(e) => setTimeUnknown(e.target.checked)}
            className="h-4 w-4"
          />
          태어난 시각을 몰라요 (시주 제외하고 풀이)
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">성별</legend>
        <div className="flex gap-2">
          {(["female", "male"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                gender === g
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {g === "female" ? "여성" : "남성"}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          출생 시군구 <span className="font-normal text-zinc-400">(선택, 진태양시 보정용)</span>
        </span>
        <input
          type="text"
          placeholder="예: 서울"
          value={birthCity}
          onChange={(e) => setBirthCity(e.target.value)}
          className="rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <button
        type="submit"
        disabled={submitting || isLunar || !birthDate}
        className="mt-2 rounded-full bg-zinc-900 px-6 py-4 text-base font-semibold text-white transition-colors disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {submitting ? "풀이 중..." : "사주 풀이 보기"}
      </button>
    </form>
  );
}
