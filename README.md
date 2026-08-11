# artpsy-web

예술심리(미술치료·심리상담) 브랜드 웹사이트를 상정한 **자율 연습 프로토타입**.
실제 수주 건이 아니고 의뢰인도 없다 — 공개된 외주 공고를 요구사항 샘플로 삼아,
WordPress 하이엔드 사이트에서 가장 위험한 부분이 무엇인지 실제로 만들어 확인하는 것이 목적이다.

현재 **Phase 1 — 프론트엔드 인터랙션 프로토타입**.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build
npm run preview
```

## 무엇을 검증하는 프로토타입인가

원 요구사항은 WordPress 기반 하이엔드 웹사이트 구축이다. 그중 실패 확률이 가장 높은 것은
CMS 세팅이 아니라 **"테마의 한계를 넘어선" 인터랙션을 성능 예산 안에서 구현하는 것**이다.
이 프로토타입은 그 부분만 떼어 실제로 돌려본다.

- Lenis(스크롤 위치) + GSAP ScrollTrigger(클럭) 동기화
- 디자인 토큰 단일화 — Phase 2에서 `theme.json`으로 매핑
- `prefers-reduced-motion` 대응
- JS 실패 시 정적 페이지로 degrade

## 아직 없는 것

WordPress 테마, CMS, 문의 폼, 예약 연동, SEO 세팅. 전부 Phase 2이고,
PHP·Composer·Docker가 갖춰져야 착수한다.

상세: `CLAUDE.md`
