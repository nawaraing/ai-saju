import { createClient, SupabaseClient } from "@supabase/supabase-js";

// docs/engineering/database.md §5: 환경변수는 NEXT_PUBLIC_ 없이 서버 전용.
// Supabase 호출은 서버(Route Handler·서버 컴포넌트)에서만 일어난다.
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY가 설정되지 않았습니다. .env.local을 확인하세요.");
  }

  client = createClient(url, anonKey);
  return client;
}
