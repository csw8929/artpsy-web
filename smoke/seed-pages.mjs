#!/usr/bin/env node
// 페이지 다섯을 만든다. **템플릿 파일만으로는 URL 이 생기지 않는다** — WP 는 쿼리를 먼저
// 풀고 그 다음에 템플릿을 고르므로, 슬러그에 맞는 page 포스트가 없으면 `/philosophy/` 는
// 404 다. 실측: 이 커밋 이전 트리에서 `/sample-page/` 는 200 이고 `/philosophy/` 는 404 였다.
//
// 그래서 이것이 L2 판정의 전제다. `.wp-env.json` 의 lifecycleScripts.afterStart 가 부르므로
// **클론 → `npm run wp:start` 만으로 다섯이 눌러진다** (PR3-PARTS §4 의 판정 기준).
//
// 테마가 아니라 여기 둔다. 테마가 콘텐츠를 만들면 안 된다 — 산출물은 테마이고 페이지는
// 고객의 것이다. 시드는 이 repo 를 띄우는 사람을 위한 설정이지 테마의 기능이 아니다.
//
// 한 번의 `wp eval` 로 다섯을 다 처리한다. `wp-env run cli` 는 왕복이 비싸서 다섯 번
// 부르면 매 `wp-env start` 마다 그만큼 늘어진다.
//
// 퍼머링크는 안 건드린다 — WP 7.0.4 새 설치가 이미 pretty permalink 다(같은 트리에서
// `/sample-page/` 가 200 인 것이 그 증거다). 안 그런 환경이면 이 스크립트가 아니라
// 그 환경이 다른 것이고, 여기서 조용히 고치면 원인이 숨는다.
import { execFileSync } from "node:child_process";
import { PAGES } from "./pages.mjs";

const titlesBySlug = Object.fromEntries(PAGES.map((page) => [page.slug, page.title]));

// PHP 리터럴로 옮기지 않고 json_decode 로 넘긴다 — JSON 오브젝트는 PHP 문법이 아니라
// `$pages = {...}` 는 파스 에러다(실제로 한 번 냈다). 작은따옴표 문자열 안이라 값에
// `'`·`\`가 들어오면 깨지는데, 슬러그와 제목은 여기서 우리가 정하는 ASCII 다.
const php = `
$pages = json_decode('${JSON.stringify(titlesBySlug)}', true);
foreach ( $pages as $slug => $title ) {
  if ( get_page_by_path( $slug, OBJECT, 'page' ) ) { echo "skip $slug\\n"; continue; }
  $id = wp_insert_post( array(
    'post_type'   => 'page',
    'post_status' => 'publish',
    'post_name'   => $slug,
    'post_title'  => $title,
  ), true );
  echo is_wp_error( $id ) ? "FAIL $slug " . $id->get_error_message() . "\\n" : "created $slug\\n";
}
`;

let out = "";
try {
  out = execFileSync("wp-env", ["run", "cli", "wp", "eval", php], { encoding: "utf8" });
} catch (err) {
  console.error(
    "wp-env cli 호출이 실패했다 — 환경이 안 떠 있을 수 있다. `npm run wp:start` 를 먼저 돌려라.\n" +
      `원인: ${err.message}`,
  );
  process.exitCode = 1;
}

process.stdout.write(out);

// 조용한 실패를 삼키지 않는다 — eval 안에서 죽어도 wp-env 는 0 을 줄 수 있다.
if (out.includes("FAIL")) process.exitCode = 1;
