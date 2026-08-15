// L2 라우트 표. 각 항목은 "이 경로가 이 표식을 가져야 하는가/가지면 안 되는가"를 말한다.
// 200 은 판정이 아니다 — 템플릿을 못 찾으면 WP 가 폴백을 렌더하고도 200 을 준다
// (PR2-SMOKE §1). 그래서 표식(marker)으로 어느 템플릿이 골렸는지를 본다.
//
// marker 는 클래스 토큰이다. body class 는 안 쓴다 — "어느 페이지냐"이지
// "어느 템플릿이 골렸냐"가 아니다 (PR2-SMOKE §1).
export const ROUTES = [
  {
    label: "프론트 페이지 — hero 표식이 있어야 한다",
    path: "/",
    marker: "hero",
    expect: true,
  },
  {
    label: "프론트 페이지 — 없는 표식은 없어야 한다",
    path: "/",
    marker: "tpl-does-not-exist",
    expect: false,
  },
];

// 라우트가 늘 때마다 이 수를 손으로 올린다. 표만 늘리고 세는 곳이 없으면
// "장치가 아무것도 안 재는 상태"로 초록불이 난다 (PR2-SMOKE §2-1).
export const EXPECTED_ROUTE_COUNT = 2;
