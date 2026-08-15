// 페이지의 정본. 슬러그·제목·내비 라벨·내비 노출이 **여기 한 번만** 적힌다.
//
// 읽는 곳이 넷이다 — 라우트 표(smoke/routes.mjs), 시드(smoke/seed-pages.mjs),
// 템플릿 계약(tests/page-templates.test.js), 헤더 내비 대조(tests/site-parts.test.js).
// 두 곳에 적으면 갈리고, 갈린 쪽이 어디인지는 아무도 안 본다 (PR4-PAGES §1).
//
// 슬러그는 PR3-DECIDE §1 로 확정됐다 — 요구사항의 페이지명을 소문자-하이픈으로 옮긴
// 것이고 계층을 만들지 않는다. 바꾸려면 여기부터 바꾼다.
//
// **inNav 가 PR 6 에서 생겼다.** 그전까지 이 목록은 "내비에 뜨는 다섯" 과 "시드할 다섯" 을
// 겸했는데 처방침이 그 둘을 가른다 — 템플릿과 시드는 필요하고 헤더에는 안 뜬다.
// 값으로 두지 않으면 헤더에 여섯째 항목이 조용히 생긴다 (PR6-CONTACT-FORM §2).
export const PAGES = [
  { slug: "philosophy", title: "Philosophy", label: "Philosophy", inNav: true },
  { slug: "individuals", title: "Individuals", label: "Individuals", inNav: true },
  { slug: "organizations", title: "Organizations", label: "Organizations", inNav: true },
  { slug: "learning-center", title: "Learning Center", label: "Learning Center", inNav: true },
  { slug: "contact", title: "Contact", label: "Contact", inNav: true },
  // 처리방침은 동의 문구의 링크와 푸터에서만 닿는다. 헤더 내비에 올리면 요구사항의
  // 다섯이 여섯으로 읽힌다.
  { slug: "privacy", title: "개인정보 처리방침", label: "개인정보 처리방침", inNav: false },
];

/** 헤더 내비에 뜨는 것. 이 수가 요구사항의 다섯이고 늘어나면 안 된다. */
export const NAV_PAGES = PAGES.filter((page) => page.inNav);

/** `/philosophy/` — 헤더 내비의 href 이자 라우트 경로다. */
export const pathOf = (page) => `/${page.slug}/`;

/** `page-philosophy` — 코어의 page-{slug} 계층이 이 이름으로 고른다. */
export const templateOf = (page) => `page-${page.slug}`;

/** `tpl-philosophy` — L2 표식. 200 은 판정이 아니고 이것이 판정이다. */
export const markerOf = (page) => `tpl-${page.slug}`;
