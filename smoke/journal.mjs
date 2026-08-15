// 저널 시드의 정본. **여기서부터 개수가 편집자에게 달린다** — 이 둘은 갓 클론한 설치가
// 빈 화면이 아니도록 놓는 씨앗이지, 고정 콘텐츠가 아니다.
//
// 메인의 저널 카드 둘과 제목·날짜·이미지가 같다. 같은 것의 티저와 낱글이라 그렇다 —
// 메인을 쿼리 루프로 바꾸는 것은 별건이고(PR5-JOURNAL §4), 그때 이 둘이 그대로 쓰인다.
//
// caption 은 CC 표시 의무다. 값의 정본은 src/assets/CREDITS.md 의 "페이지 표시" 필드이고,
// tests/credits-coverage.test.js 가 여기와 그것을 문자 단위로 대조한다 —
// 옮기다 갈리는 것을 사람 눈으로 잡지 않는다.
export const JOURNAL = [
  {
    slug: "drawing-hand",
    title: "그리는 손이 먼저 아는 것",
    date: "2026-08-04 10:00:00",
    image: "journal-01.webp",
    caption: "<a href=\"https://commons.wikimedia.org/wiki/File:%22Abstrakte_Komposition%22_Hans_Kruzwicki.jpg\">“Abstrakte Komposition”</a>, Hans Kruzwicki(그림) · Dietmar Kruzwicki(사진) · <a href=\"https://creativecommons.org/licenses/by/3.0\">CC BY 3.0</a> · 크롭·WebP 재인코딩",
    content: "재료를 고르는 손이 먼저 움직이는 날이 있습니다. 무엇을 그릴지 정하기 전에 손이 색을 집고, 그 선택을 나중에 말로 따라가 봅니다.",
  },
  {
    slug: "blank-page-resistance",
    title: "빈 종이 앞에서 생기는 저항",
    date: "2026-07-28 10:00:00",
    image: "journal-02.webp",
    caption: "<a href=\"https://commons.wikimedia.org/wiki/File:%22Afterglow%22_by_Ray_L._Burggraf,_2005.jpg\">“Afterglow”</a> (2005), Ray L. Burggraf · <a href=\"https://creativecommons.org/licenses/by-sa/3.0\">CC BY-SA 3.0</a> · 크롭·WebP 재인코딩",
    content: "시작하지 못하는 것도 하나의 반응입니다. 종이를 밀어 두는 손을 억지로 되돌리지 않고, 무엇이 그 자리를 지키고 있는지부터 봅니다.",
  },
];

export const ARCHIVE_PATH = "/journal/";

/** `/journal/drawing-hand/` — 리라이트 슬러그가 아카이브와 같다. */
export const pathOf = (post) => `${ARCHIVE_PATH}${post.slug}/`;

export const MARKER_ARCHIVE = "tpl-journal-archive";
export const MARKER_SINGLE = "tpl-journal-single";
export const POST_TYPE = "artpsy_journal";
