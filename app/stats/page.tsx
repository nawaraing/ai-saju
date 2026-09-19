import Link from "next/link";
import { getSajuStats } from "@/lib/supabase/stats";
import { StatsView } from "@/components/StatsView";

// 통계는 요청마다 최신 값을 보여줘야 하므로 빌드 시점 프리렌더링을 하지 않는다.
// 캐싱 전략 도입 여부는 docs/engineering/database.md §7 미결정 사항 참고.
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getSajuStats();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-1">
        <Link href="/" className="text-xs text-zinc-500 hover:underline">
          ← 돌아가기
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">음양오행 통계</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          지금까지 풀이한 사람들의 사주 결과를 모아봤어요.
        </p>
      </header>

      <StatsView stats={stats} />
    </div>
  );
}
