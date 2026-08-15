#!/usr/bin/env node
// 저널 글 둘을 만든다. 페이지 시드(seed-pages.mjs)와 같은 이유로 여기 있다 —
// **파일만으로는 URL 이 안 생긴다.** 다만 원인이 하나 더 있다.
//
//   페이지    쿼리가 안 풀린다        page 포스트가 없어서
//   저널      리라이트 규칙이 없다    register_post_type 은 규칙을 DB 에 안 쓴다
//
// 그래서 이 스크립트가 마지막에 flush_rewrite_rules() 를 부른다. 테마 쪽에도
// after_switch_theme 훅이 있는데(functions.php), 그건 **활성화될 때만** 돈다 —
// 이미 활성화된 테마에 이 코드가 pull 로 들어오면 안 돌고 /journal/ 이 404 로 남는다.
//
// 낱글 라우트가 smoke 표에 들어가려면 슬러그가 고정이어야 한다. 그래서 이 둘은
// "예시 콘텐츠"이자 **L2 판정의 전제**다. 0개 화면은 이것과 별개로 봐야 한다
// (PR5-JOURNAL §3) — 고객이 처음 받는 상태가 그쪽이다.
import { execFileSync } from "node:child_process";
import { JOURNAL } from "./journal.mjs";

// PHP 작은따옴표 문자열 안으로 들어간다. `'` 나 `\` 가 값에 있으면 조용히 깨지는 대신
// 여기서 죽는다 — 앞서 JSON 오브젝트를 PHP 리터럴로 넘겨 파스 에러를 낸 적이 있다.
const payload = JOURNAL.map((post) => ({
  slug: post.slug,
  title: post.title,
  date: post.date,
  image: post.image,
  caption: post.caption,
  content: post.content,
}));

const json = JSON.stringify(payload);
if (/['\\]/.test(json.replace(/\\"/g, ""))) {
  console.error("시드 값에 ' 또는 \\ 가 있다 — PHP 작은따옴표 문자열로 못 넘긴다.");
  process.exit(1);
}

const php = `
require_once ABSPATH . 'wp-admin/includes/image.php';
$posts = json_decode('${json}', true);
foreach ( $posts as $one ) {
  if ( get_page_by_path( $one['slug'], OBJECT, 'artpsy_journal' ) ) { echo "skip {$one['slug']}\\n"; continue; }

  $post_id = wp_insert_post( array(
    'post_type'    => 'artpsy_journal',
    'post_status'  => 'publish',
    'post_name'    => $one['slug'],
    'post_title'   => $one['title'],
    'post_date'    => $one['date'],
    'post_content' => "<!-- wp:paragraph -->\\n<p>{$one['content']}</p>\\n<!-- /wp:paragraph -->",
  ), true );

  if ( is_wp_error( $post_id ) ) { echo "FAIL {$one['slug']} " . $post_id->get_error_message() . "\\n"; continue; }

  $file = get_theme_file_path( 'assets/img/journal/' . $one['image'] );
  if ( ! file_exists( $file ) ) { echo "FAIL {$one['slug']} 자산이 없다: {$one['image']}\\n"; continue; }

  $upload = wp_upload_bits( $one['image'], null, file_get_contents( $file ) );
  if ( ! empty( $upload['error'] ) ) { echo "FAIL {$one['slug']} 업로드: {$upload['error']}\\n"; continue; }

  // post_excerpt 가 첨부의 캡션이다. 크레딧이 이미지를 따라다녀야 해서 여기 둔다 —
  // functions.php 의 core/post-featured-image 필터가 그것을 <figcaption> 으로 낸다.
  $attach_id = wp_insert_attachment( array(
    'post_mime_type' => 'image/webp',
    'post_title'     => $one['title'],
    'post_excerpt'   => $one['caption'],
    'post_status'    => 'inherit',
  ), $upload['file'], $post_id );

  if ( is_wp_error( $attach_id ) || ! $attach_id ) { echo "FAIL {$one['slug']} 첨부\\n"; continue; }

  wp_update_attachment_metadata( $attach_id, wp_generate_attachment_metadata( $attach_id, $upload['file'] ) );
  set_post_thumbnail( $post_id, $attach_id );
  echo "created {$one['slug']}\\n";
}

// 규칙이 DB 옵션이라 register_post_type 만으로는 /journal/ 이 404 다.
flush_rewrite_rules();
echo "rewrite flushed\\n";
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

if (out.includes("FAIL")) process.exitCode = 1;
