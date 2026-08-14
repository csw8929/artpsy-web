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

**Phase 1 — 프론트엔드 프로토타입. 종료됨** (2026-08-13, `e72f1ae`). Vite + Lenis + GSAP
ScrollTrigger. 이 프로젝트에서 가장 위험한 것은 CMS 배선이 아니라 **하이엔드 인터랙션과
성능**이라, 그것부터 실제로 돌려서 검증했다. 이슈 4건 전부 종결.

종료 지점은 **`phase-1` 태그**로 고정돼 있다. Phase 2와 대볼 기준선은 전부 **허브
`tools/perf-harness/baselines/`** 에 있다 (repo 아닌 이유: 그걸 읽는 하네스가 거기 있고,
전면 캡처는 PR diff에서 눈으로 볼 수 없어 스크립트 대조가 유일한 사용법이다).

- 수치 29건 — 라운드별 성능 원자료
- `dist-manifest-phase-1.json` — 파일별 크기·sha256, 재빌드 동일성 대조용
- `visual-phase-1/` — 전면 캡처 4폭(390·768·1440·1600), `prefers-reduced-motion`

**1440만 보고 판정하지 않는다.** 그 폭에서는 `wideSize`와 콘텐츠 폭이 우연히 겹쳐 갈리지
않는다. 근거와 사용법은 하네스 README §5.5.

**Phase 2 — WordPress 블록 테마 이식. 착수.** Docker 28.1.1 + Compose v2.35.1이 이 머신에
섰다(2026-08-13). 구동은 `@wordpress/env`로 하고 WordPress는 컨테이너의 PHP 8.x를 쓴다 —
호스트 PHP 7.4는 대비책이고 `mbstring`·`zip`이 빠져 있다(20.04 universe/main 버전 핀 충돌).

Phase 1의 토큰(`src/styles/tokens.css`)을 `theme.json`으로 매핑하는 것이 이식의 축이다.
매핑 설계는 허브 `md/architect/20260811_artpsy-theme-json-매핑.md`가 정본이고,
**그 §9의 미검증 가정 6건을 최소 테마로 먼저 확인한 뒤** 매핑표를 옮긴다 — 표를 다 옮긴
뒤에 전제가 틀린 것을 발견하면 되돌리는 비용이 옮기는 비용과 같다.

- 테마: `theme/artpsy/` · 구동 설정: `.wp-env.json` (둘 다 Phase 1 트리와 공존한다)
- `docker` 그룹이 로그인 세션에 아직 안 붙었으면 `sg docker -c "..."` 로 감싼다.
  영구 해결은 완전 로그아웃 후 재로그인이다.

## 지킬 것

- 시각적인 값은 전부 `src/styles/tokens.css`의 토큰으로 수렴시킨다. Phase 2에서 `theme.json`과
  1:1로 매핑되어야 하므로, 컴포넌트에 하드코딩된 색·간격이 남으면 그만큼 이식이 수작업이 된다.
- 성능 예산을 넘기는 변경은 넣지 않는다.
  - 임계와 측정 조건(느린 4G가 정확히 무엇인지)은 `perf-budget.json`이 정본이다.
    값을 여기 두 벌로 적지 않는다 — 갈라지면 어느 쪽이 맞는지 아무도 모른다.
  - 그 파일 `required`의 키가 하나라도 없거나 `null`이면 FAIL이다. 임계 비교보다 먼저 본다.
    Phase 1에서 실제로 난 사고는 예산이 깨진 것이 아니라 측정기가 조용히 값을 안 낸 것이었다.
  - 세 지표만으로는 부족하다 — 전부 통과하면서 초기 로드 72초가 실측된 적이 있다.
    풀블리드 히어로는 LCP 후보에서 빠지므로 LCP가 이미지 비용을 담지 않는다.
    근거는 허브 `md/analysis/20260812_artpsy-phase1-성능실측.md`.
- `prefers-reduced-motion`을 무시하지 않는다. 심리상담 도메인이라 더 그렇다.
- JS 실패가 백지 화면이 되면 안 된다. `.js` 클래스만으로는 부족하다 — GSAP이 트윈 생성 시점에
  인라인 `opacity: 0`을 쓰므로, 초기화가 중간에 죽으면 클래스를 떼도 복구되지 않는다.
  초기화 실패는 `stopMotion()`으로 정적 상태까지 내린다.
