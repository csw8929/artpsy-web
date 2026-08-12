# artpsy-web

**자율 연습 프로토타입이다.** 실제 수주 건이 아니고 의뢰인도 없다 — 공개된 외주 공고를
요구사항 샘플로 삼았을 뿐이므로, 클라이언트 산출물처럼 다루지 않는다.

허브: `../MyPrivate`. 운영 규칙·역할·핸드오프는 거기 `CLAUDE.md`와 `.ai/`를 읽는다.
팀: `artpsy` — 설정은 허브 `teams/artpsy.yml`.

이슈 관리는 GitHub Issues로 한다 — 절차는 허브 `.ai/workflows/issue-flow.md`.
라벨이 다음 담당을 지정하고, 카드는 홉 하나를 배달한다.

요구사항과 리스크, 스택 결정 근거는 허브 `md/` vault에 있다 (이 repo에는 없다).

## 이 프로젝트 고유

- base 브랜치: `main`
- 개발: `npm run dev` · 빌드: `npm run build` · 확인: `npm run preview`
- 린트: 아직 없음 (Phase 1 범위 밖)

## 현재 Phase

**Phase 1 — 프론트엔드 프로토타입.** Vite + Lenis + GSAP ScrollTrigger.
이 프로젝트에서 가장 위험한 것은 CMS 배선이 아니라 **하이엔드 인터랙션과 성능**이라, 그것부터
실제로 돌려서 검증한다.

**Phase 2 — WordPress 블록 테마 이식.** PHP·Composer·Docker가 이 머신에 없어서 착수 불가.
Phase 1의 토큰(`src/styles/tokens.css`)을 `theme.json`으로 매핑하는 것이 이식의 축이다.

## 지킬 것

- 시각적인 값은 전부 `src/styles/tokens.css`의 토큰으로 수렴시킨다. Phase 2에서 `theme.json`과
  1:1로 매핑되어야 하므로, 컴포넌트에 하드코딩된 색·간격이 남으면 그만큼 이식이 수작업이 된다.
- 성능 예산을 넘기는 변경은 넣지 않는다 — LCP 2.5s, INP 200ms, CLS 0.1 (모두 75퍼센타일).
- `prefers-reduced-motion`을 무시하지 않는다. 심리상담 도메인이라 더 그렇다.
- JS 실패가 백지 화면이 되면 안 된다. reveal 초기 상태는 `.js` 클래스가 붙었을 때만 적용한다.
