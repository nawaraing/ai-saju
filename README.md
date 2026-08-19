# AI 사주 서비스

태어난 연·월·일·시로 사주 여덟 글자를 정확히 계산하고, 그 결과를 LLM이 자연어로 풀이하는 대화형 AI 사주 서비스.

기획·설계 문서는 [docs/README.md](./docs/README.md) 참고.

## 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인.

## 기술 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS
- 계산 엔진: `saju-engine.md` 참고 (검증 진행 중)
- 해석: Google Gemini API
