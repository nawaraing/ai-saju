# 데이터베이스 설계 문서 (Database)

> 사주 풀이 결과를 저장하고 음양오행 통계를 제공하기 위한 Supabase(Postgres) 스키마·정책 문서.
> 전체 아키텍처는 `architecture.md`, 계산 결과 구조는 `saju-engine.md` §3, 타입 정의는 `types/saju.ts` 참고.
>
> 이 문서는 "무엇을 저장하고 어떻게 보호하는가"를 다룬다. 저장 계층을 코드에 연결하는 방법은
> `architecture.md` §6·§7 요약과 실제 구현(`lib/supabase/`)에서 다룬다.

---

## 1. 저장 원칙 (개인정보 경계)

- `service-plan.md` §6 개인정보 정책의 "생년월일시는 민감정보, 영구 저장 안 함" 원칙은 그대로 유지한다.
- **저장하는 것**: 계산된 `SajuResult`(사주 간지 4기둥, 일간, 오행 분포, 강한/부족 오행, 용신, 시간 정확도) + `gender` + `fortuneType`. 로그인 없이 익명으로 기록한다.
- **저장하지 않는 것**: `birthDate`, `birthTime`, `birthCity`, `name` 등 `SajuInput`의 원문 식별·민감 정보. `limitations`, `yongsin.reasoning`, `fortune.*`(summary/guidance/caveat) 같은 자유 텍스트도 통계 목적에 맞지 않아 제외한다.
- 근거: 사주 간지·오행 카운트는 같은 날 태어난 다수가 공유하는 파생값이라 역식별 위험이 낮고, "결과 통계"라는 목적에 정확히 부합하는 최소 수집이다.

---

## 2. 테이블 설계

`SajuResult`(및 요청 메타) 필드를 아래처럼 `saju_readings` 테이블 컬럼에 매핑한다.

| SajuResult 필드 | 컬럼 | 타입 | 비고 |
|---|---|---|---|
| — | `id` | `uuid` | PK, `gen_random_uuid()` |
| — | `created_at` | `timestamptz` | 기본값 `now()`, 시계열 조회용 |
| `pillars` (연/월/일/시 4기둥) | `pillars` | `jsonb` | 원본 구조 그대로 저장 |
| `dayMaster.stem` | `day_master_stem` | `text` | |
| `dayMaster.elementKo` | `day_master_element` | `text` | |
| `dayMaster.yinYang` | `day_master_yin_yang` | `text` | check `yang` / `yin` |
| `dayMaster.strength` | `day_master_strength` | `text` | check `strong` / `weak` / `balanced` |
| `fiveElements` | `five_elements` | `jsonb` | `{wood,fire,earth,metal,water}` 카운트 |
| `dominantElements` | `dominant_elements` | `text[]` | |
| `weakElements` | `weak_elements` | `text[]` | |
| `yongsin.primaryKo` | `yongsin_primary` | `text` | |
| `yongsin.secondaryKo` | `yongsin_secondary` | `text` | |
| `timeAccuracy` | `time_accuracy` | `text` | check `known` / `unknown` |
| (요청 메타) | `gender` | `text` | nullable, check `male` / `female` |
| (요청 메타) | `fortune_type` | `text` | |

인덱스는 `created_at desc` 하나만 둔다(시계열 조회용). 테이블·컬럼 규모가 작아 그 외 인덱스는 지금 단계에서 불필요하다.

---

## 3. SQL 마이그레이션

아래 SQL로 `saju_readings` 테이블과 RLS 정책을 만든다. 실제 적용 절차(SQL Editor 실행 방법, 확인 방법)는 §6-4 참고. 테이블이 하나뿐인 규모라 CLI 마이그레이션 도구는 지금 도입하지 않는다(과설계 방지, 스키마 변경이 잦아지면 재검토 — §7 참고).

```sql
create table public.saju_readings (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),

  pillars               jsonb not null,

  day_master_stem       text not null,
  day_master_element    text not null,
  day_master_yin_yang   text not null check (day_master_yin_yang in ('yang', 'yin')),
  day_master_strength   text not null check (day_master_strength in ('strong', 'weak', 'balanced')),

  five_elements         jsonb not null,
  dominant_elements     text[] not null default '{}',
  weak_elements         text[] not null default '{}',

  yongsin_primary       text,
  yongsin_secondary     text,

  time_accuracy         text not null check (time_accuracy in ('known', 'unknown')),
  gender                text check (gender in ('male', 'female')),
  fortune_type          text not null
);

create index saju_readings_created_at_idx on public.saju_readings (created_at desc);

comment on table public.saju_readings is
  'AI 사주 서비스: 익명 사용자의 사주 계산 결과(파생값)만 기록. 생년월일시 원문 등 민감정보는 저장하지 않는다.';

alter table public.saju_readings enable row level security;

create policy "anon can insert readings"
  on public.saju_readings for insert to anon with check (true);

create policy "anon can read readings for stats"
  on public.saju_readings for select to anon using (true);

-- update/delete 정책은 만들지 않는다 → RLS 활성화 상태에서 정책 없는 작업은 기본 거부된다.
```

---

## 4. RLS(Row Level Security) 정책

- **RLS를 반드시 켠다.** Supabase는 테이블 생성 시 RLS가 기본적으로 꺼져 있어, 켜지 않으면 `anon` key 하나로 테이블 전체를 읽고 쓰고 지울 수 있다 — Supabase가 가장 자주 지적하는 보안 실수다.
- **insert/select 정책만 만들고 update/delete 정책은 만들지 않는다.** RLS가 켜진 상태에서 정책이 없는 작업은 기본적으로 거부되므로, 별도로 `false` 정책을 만들지 않아도 `anon` key로는 수정·삭제가 원천적으로 불가능하다.
- `saju_readings`에 민감정보가 전혀 없으므로 select를 전체 공개해도 프라이버시 리스크가 없다 — 통계 페이지가 이 select 정책을 그대로 사용한다.
- **`service_role` key는 이 설계에서 사용하지 않는다.** RLS를 완전히 우회하는 관리자 권한이라, 서버 env에 두더라도 route handler 코드나 로그에 실수로 노출될 위험이 있다. `anon` key + 위 RLS 정책만으로 "insert 허용, select 공개, update/delete 금지"를 전부 표현할 수 있으므로 지금은 불필요하다.

---

## 5. 연동 원칙 (구현 경계)

이번 도입은 `architecture.md`가 미리 못박아둔 "확장 대비 설계" 3원칙 위에 얹힌다.

- **저장 함수는 `SajuInput`이 아니라 `SajuResult` + 최소 메타(`gender`, `fortuneType`)만 받는다.** 함수 시그니처 자체가 "민감정보는 여기 들어올 수 없다"를 타입으로 강제하는 가드 역할을 한다.
- **저장은 계산 직후(Gemini 해석 완료 전)에 수행**하고, 실패해도 사용자 응답에 영향을 주지 않도록 저장 함수 내부에서 에러를 삼킨다. Gemini 호출이 느리거나 실패해도 계산이 끝난 모든 요청이 통계에 반영되어야 하기 때문이다.
- **통계 조회는 전체 row를 select해 애플리케이션 레벨(TypeScript)에서 집계한다.** RPC 함수나 뷰는 만들지 않는다 — 초기 데이터량에 맞는 가장 단순한 방식이며, row가 많아져 느려지면 그때 전환을 검토한다(§7).
- **환경변수**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. `architecture.md` §5의 `NEXT_PUBLIC_` 규칙과 일치시켜, Supabase 호출이 서버(Route Handler·서버 컴포넌트)에서만 일어나고 클라이언트에서 직접 호출하지 않으므로 접두사 없이 서버 전용으로 둔다.

---

## 6. 설정 체크리스트 (실제 동작을 위해 필요한 작업)

이 문서의 설계가 실제로 동작하려면, 코드 작성과 별개로 아래 항목이 **모두** 끝나 있어야 한다. 하나라도 빠지면 저장·통계 조회가 조용히 실패하거나 에러가 난다.

### 6-1. Supabase 프로젝트 생성

이 저장소에는 아직 Supabase 프로젝트가 연결되어 있지 않다. 없다면 먼저 만든다.

1. https://supabase.com 에서 로그인 후 **New Project** 생성 (리전은 서울/도쿄 등 가까운 곳 선택).
2. 프로젝트 생성이 끝나면 **Project Settings → API**로 이동해 아래 두 값을 확보한다:
   - `Project URL`
   - `anon public` key
   - `service_role` key는 이 설계에서 쓰지 않으므로 복사해둘 필요 없다 (§4 참고).

### 6-2. 패키지 설치

Supabase JS 클라이언트가 아직 설치되어 있지 않다. 프로젝트 루트에서 실행한다:

```bash
npm install @supabase/supabase-js
```

### 6-3. 환경변수(API 키) 등록

§5에서 정한 두 값을 `.env.local`에 실제 값으로 채운다. `.env.local`은 `.gitignore`에 걸려 있어 커밋되지 않으므로, 이 파일에는 진짜 키 값을 넣어도 된다.

```
# .env.local
GEMINI_API_KEY=(기존 값 유지)
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_ANON_KEY=(6-1에서 복사한 anon public key)
```

`.env.example`에는 값 없이 키 이름만 추가해 저장소에 커밋한다(다른 문서·`architecture.md` §5의 기존 관리 수칙과 동일):

```
# .env.example
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

키를 넣지 않으면 `lib/supabase/index.ts`의 클라이언트 초기화가 "SUPABASE_URL/SUPABASE_ANON_KEY가 설정되지 않았습니다" 에러를 던지도록 설계되어 있다(§5) — 누락 시 원인을 바로 알 수 있다.

### 6-4. 테이블·RLS 정책 생성 (SQL 실행)

§3의 SQL을 실제 Supabase 프로젝트에 적용해야 `saju_readings` 테이블이 생긴다. 코드를 아무리 잘 짜도 이 단계를 건너뛰면 모든 저장·조회가 "테이블이 없다"는 에러로 실패한다.

1. Supabase 대시보드 → 왼쪽 메뉴 **SQL Editor** 진입.
2. **New query** 클릭 후 §3의 SQL 전체(테이블 생성 + 인덱스 + RLS 정책)를 그대로 붙여넣는다.
3. **Run**(또는 Ctrl/Cmd+Enter)으로 실행.
4. 왼쪽 메뉴 **Table Editor**에서 `saju_readings` 테이블이 생성되었는지, 컬럼 목록이 §2 표와 일치하는지 눈으로 확인한다.
5. **Authentication → Policies**(또는 Table Editor의 테이블 상세 화면)에서 RLS가 활성화(Enabled)되어 있고 `anon can insert readings`/`anon can read readings for stats` 정책 두 개가 보이는지 확인한다.

### 6-5. 배포 환경 변수 등록 (배포 시)

로컬 `.env.local`은 배포 서버에 자동으로 올라가지 않는다. Vercel 등에 배포한다면, 대시보드의 Environment Variables에도 `SUPABASE_URL`/`SUPABASE_ANON_KEY`를 동일하게 등록해야 한다(`architecture.md` §5 관리 수칙과 동일한 방식).

### 6-6. 완료 확인

아래가 모두 만족되면 설정이 끝난 것이다:
- [ ] Supabase 프로젝트 생성됨, URL/anon key 확보
- [ ] `npm install @supabase/supabase-js` 실행 완료 (`package.json`에 의존성 추가됨)
- [ ] `.env.local`에 `SUPABASE_URL`/`SUPABASE_ANON_KEY` 값 채움, `.env.example`에는 키 이름만 커밋
- [ ] SQL Editor에서 §3 SQL 실행 완료, `saju_readings` 테이블·RLS 정책 생성 확인
- [ ] (배포 시) 배포 플랫폼 환경변수에도 동일한 키 등록

---

## 7. 미결정 사항 (Decisions Needed)

- [ ] 통계 집계가 row 증가로 느려질 때 RPC/materialized view 전환 시점
- [ ] anon insert 남용(스팸) 방지를 위한 rate limiting 필요 여부·방식
- [ ] Supabase 마이그레이션 운영 방식 (SQL Editor 수동 실행 vs CLI 도입)
- [ ] 통계 페이지 캐싱 전략 (Next.js `revalidate` 등)
- [ ] 통계 페이지 공개 범위 (전체 공개 vs 내부용)
