# AI 사주 서비스 기술 설계서 (Architecture)

> 대화형 AI 사주 서비스의 기술 구현 설계 문서.
> 제품 요구는 `service-plan.md`, 명리학 지식은 `domain-knowledge.md`,
> 계산 엔진은 `saju-engine.md`, 해석 프롬프트는 `interpretation-prompt.md`,
> DB 스키마·정책은 `database.md` 참고.
> 이 문서는 "어떻게(How)"를 다룬다.

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Next.js** (App Router) | 프론트 + 서버(Route Handler) 단일 프로젝트 |
| 언어 | TypeScript | 타입 안정성 |
| 스타일 | Tailwind CSS | 모바일 우선 반응형 |
| 계산 엔진 | `saju-fortune` (npm) | 서버에서 실행 (검증 후 채택, `saju-engine.md`) |
| LLM | **Google Gemini API** | 해석 담당 |
| 배포 | Vercel | Next.js 친화적 |
| DB | **Supabase** (Postgres) | 사주 결과(파생값)만 익명 저장, 상세는 `database.md` |

---

## 2. 전체 아키텍처

Next.js가 프론트와 서버를 함께 갖고 있어, 별도 백엔드 서버 없이 한 프로젝트로 구성한다.
**계산과 LLM 호출은 반드시 서버(Route Handler)에서** 수행한다.

```
┌─────────────────────────────────────────────┐
│  브라우저 (Client)                            │
│   - 입력 폼 (생년월일시·성별·주제)             │
│   - 결과 표시 (반응형 UI)                      │
└───────────────┬─────────────────────────────┘
                │ fetch (POST)
                ▼
┌─────────────────────────────────────────────┐
│  Next.js 서버 (Route Handler / Server)        │
│                                               │
│   ① saju-fortune 실행 → 여덟 글자·오행 계산   │ ← 계산(결정론)
│                                               │
│   ② 계산 결과 + 해석 프롬프트                  │
│      → Gemini API 호출 → 자연어 풀이           │ ← 해석(LLM)
│                                               │
│   (Gemini API Key는 서버 env에서만 접근)       │
└───────────────┬─────────────────────────────┘
                │ 결과(JSON / 스트리밍)
                ▼
          브라우저에 풀이 표시
```

### 핵심 원칙
- **계산과 해석의 분리**: 계산은 코드(결정론), 해석은 LLM. 여덟 글자를 LLM에 맡기지 않는다(환각 방지).
- **서버 전용 실행**: `saju-fortune`은 Node 패키지라 클라이언트에서 실행 불가. Gemini 호출도 키 보안상 서버에서만.

---

## 3. 반응형 / 모바일 우선 (Responsive)

> 요구: 반응형으로 만들어 모바일 사용성이 좋아야 함 (`service-plan.md` §7).

### 전략: Mobile-First
- 기본 스타일을 모바일 기준으로 작성하고, 큰 화면은 브레이크포인트로 확장한다.
- Tailwind 기본 브레이크포인트 사용: `sm(640)` / `md(768)` / `lg(1024)` / `xl(1280)`.
- 기본(≈360~430px 폰) → `md` 이상에서 여백·2단 레이아웃 등 확장.

### 대화형 UI 고려
- 좁은 화면에서 입력 폼과 결과가 세로로 자연스럽게 쌓이도록 설계.
- 결과 화면은 **공유(캡처)** 를 염두에 둔 세로형 카드 레이아웃.
- 터치 타깃(버튼) 충분한 크기 확보, 폰트 가독성 우선.

### 성능 체감
- 계산 결과는 즉시 렌더, LLM 해석은 **스트리밍 또는 로딩 상태**로 처리해 체감 대기 축소.

---

## 4. 디렉터리 구조 (초안)

```
/app
  /page.tsx                  # 입력 화면 (반응형)
  /stats/page.tsx            # 음양오행 통계 화면 (Supabase 조회)
  /result/page.tsx           # 결과 화면 (또는 동일 페이지 내 상태 전환)
  /api
    /saju/route.ts           # ① 계산 + ② Gemini 해석 + ③ 결과 저장 (서버 전용)
/lib
  /saju/                     # saju-fortune 호출 래퍼, 결과 매핑
  /gemini/                   # Gemini API 호출 클라이언트
  /prompt/                   # 해석 프롬프트 구성 (interpretation-prompt.md 기반)
  /supabase/                 # Supabase 클라이언트, 저장·통계 조회 함수 (database.md 기반)
/components                  # 입력 폼, 결과 카드, 통계 뷰 등 UI
/types                       # 공통 타입 (입력/계산결과/응답)
.env.local                   # 비밀 키 (git 제외)
```

- 계산·해석 로직은 `app/api/saju/route.ts`에 두거나 `/lib`로 분리해 Route Handler에서 호출.
- 클라이언트 컴포넌트에는 계산/키 관련 코드가 들어가지 않도록 경계 유지.

---

## 5. 보안 · 환경변수 관리

> 요구: 보안이 필요한 것은 env 파일로 관리.

### 원칙
- **Gemini API Key 등 비밀 값은 절대 클라이언트에 노출하지 않는다.**
- Next.js 환경변수 규칙:
  - `NEXT_PUBLIC_` 접두사 → 클라이언트에 노출됨 (비밀 값에 **사용 금지**).
  - 접두사 없음 → **서버에서만** 접근 가능 (비밀 값은 이쪽).

### .env 예시
```
# 서버 전용 (클라이언트 노출 금지)
GEMINI_API_KEY=xxxxxxxx
SUPABASE_URL=xxxxxxxx
SUPABASE_ANON_KEY=xxxxxxxx

# 공개 가능한 값만 NEXT_PUBLIC_ 사용
# NEXT_PUBLIC_APP_NAME=...
```

### 관리 수칙
- `.env.local`은 `.gitignore`에 포함(커밋 금지).
- 저장소에는 `.env.example`(키 이름만, 값 없음)만 커밋해 필요한 변수 목록 공유.
- 배포 환경(예: Vercel)에서는 대시보드의 Environment Variables로 주입.
- Gemini 호출은 오직 서버(Route Handler)에서만 수행 → 키가 브라우저로 나갈 경로 자체를 차단.

---

## 6. 데이터베이스

> 상세 스키마·SQL·RLS 정책은 `database.md` 참고. 여기서는 요약만 다룬다.

- **Supabase(Postgres)** 사용. 로그인 없이 익명으로 사주 계산 결과(파생값)만 저장한다.
- 원문 생년월일시 등 민감정보는 저장하지 않는다 (`service-plan.md` §6, `database.md` §1).
- 계산/해석 로직은 저장소를 모른다 — 저장은 `app/api/saju/route.ts`에 얇게 얹힌 부수효과 단계다.
- 저장된 결과는 `/stats` 페이지에서 음양오행 통계로 집계해 보여준다.

---

## 7. 요청 처리 흐름 (API)

`POST /api/saju` 기준 단계.

1. **입력 검증**: 양력/음력, (음력 시)윤달 플래그, 생년월일, 시각(선택), 성별, 주제.
2. **음력 → 양력 변환**(음력 입력 시): 검증된 만세력/라이브러리로 변환, 윤달 반영. (상세 `saju-engine.md`)
3. **사주 계산**: `saju-fortune` 실행 → 여덟 글자·오행·십신·신강신약·용신 등 산출.
4. **결과 저장**: 계산 결과(파생값)를 Supabase에 익명 기록 (부수효과, 실패해도 응답에 영향 없음. `database.md` §5).
5. **프롬프트 구성**: 계산 결과 + 해석 지침(`interpretation-prompt.md`)을 결합.
6. **Gemini 호출**: 자연어 풀이 생성(스트리밍 권장).
7. **응답 반환**: 계산 요약 + 해석 텍스트를 클라이언트로.

### 예외 처리
- 태어난 시간 미상 → 시주 미확정 플래그, 연·월·일 중심 보수적 풀이로 진행.
- 음력 변환 실패 → 진행 중단, 사용자에게 명확 안내.
- 계산 엔진/LLM 오류 → 사용자 친화적 에러 메시지, 재시도 안내.

---

## 8. 미결정 사항 (Decisions Needed)
- [ ] 배포 플랫폼 확정 (Vercel 등)
- [ ] Gemini 모델 버전/파라미터 선택
- [ ] 응답 방식: 스트리밍 vs 일괄
- [ ] 음력 변환 라이브러리 선정 (`saju-engine.md`와 연동)
- [ ] `saju-fortune` 패키지 채택 확정 (검증 후)
- [ ] 결과 공유(이미지 저장) 구현 방식

> DB 관련 미결정 사항은 `database.md` §7으로 이관.
