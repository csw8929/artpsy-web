// 페이지 다섯의 정본. 슬러그·제목·내비 라벨이 **여기 한 번만** 적힌다.
//
// 읽는 곳이 넷이다 — 라우트 표(smoke/routes.mjs), 시드(smoke/seed-pages.mjs),
// 템플릿 계약(tests/page-templates.test.js), 헤더 내비 대조(tests/site-parts.test.js).
// 두 곳에 적으면 갈리고, 갈린 쪽이 어디인지는 아무도 안 본다 (PR4-PAGES §1).
//
// 슬러그는 PR3-DECIDE §1 로 확정됐다 — 요구사항의 페이지명을 소문자-하이픈으로 옮긴
// 것이고 계층을 만들지 않는다. 바꾸려면 여기부터 바꾼다.
export const PAGES = [
  { slug: "philosophy", title: "Philosophy", label: "Philosophy" },
  { slug: "individuals", title: "Individuals", label: "Individuals" },
  { slug: "organizations", title: "Organizations", label: "Organizations" },
  { slug: "learning-center", title: "Learning Center", label: "Learning Center" },
  { slug: "contact", title: "Contact", label: "Contact" },
];

/** `/philosophy/` — 헤더 내비의 href 이자 라우트 경로다. */
export const pathOf = (page) => `/${page.slug}/`;

/** `page-philosophy` — 코어의 page-{slug} 계층이 이 이름으로 고른다. */
export const templateOf = (page) => `page-${page.slug}`;

/** `tpl-philosophy` — L2 표식. 200 은 판정이 아니고 이것이 판정이다. */
export const markerOf = (page) => `tpl-${page.slug}`;
