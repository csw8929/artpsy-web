// L2 — 사이트맵과 메타태그. 둘 다 **응답을 보는 것**이지 코드를 보는 것이 아니다.
//
// 이 검사의 구멍이 하나 뻔하다: 여섯 라우트가 **같은** og:title 을 들어도 "있다" 는
// 통과한다. 그래서 서로 다른지를 같이 잰다 (계획 §2.2 안전장치 4).
import { execFileSync } from "node:child_process";
import { PAGES, pathOf } from "./pages.mjs";
import { ARCHIVE_PATH } from "./journal.mjs";

const BASE = process.env.WP_BASE_URL ?? "http://localhost:8888";

async function text(path) {
  const res = await fetch(new URL(path, BASE));
  return { status: res.status, body: await res.text() };
}

/**
 * 설명의 **정본을 WP 에서 읽어 온다.** "description 이 있다" 로 재면 우리가 지어낸 문장도
 * 통과한다 — 이 PR 의 유일한 위험이 그것이라 값까지 대조한다.
 *
 * 편집자가 아무것도 안 넣었으면 기대값은 빈 문자열이고, 그때는 **태그가 없어야 한다.**
 * 빈 description 을 내보내거나 우리가 채우면 그 자리에서 규칙이 깨진다.
 */
function evalPhp(php) {
  return execFileSync("wp-env", ["run", "cli", "wp", "eval", php], { encoding: "utf8" });
}

function expectedDescriptions() {
  const php = [
    'echo "TAGLINE=" . get_bloginfo( "description" ) . "\n";',
    ...PAGES.map(
      (page) =>
        `$p = get_page_by_path( "${page.slug}" ); echo "EXCERPT_${page.slug}=" . ( $p ? $p->post_excerpt : "" ) . "\n";`,
    ),
  ].join(" ");

  const out = evalPhp(php);
  const read = (key) => {
    const found = out.match(new RegExp(`${key}=(.*)`));
    return found ? found[1].trim() : "";
  };

  const tagline = read("TAGLINE");
  const bySlug = Object.fromEntries(PAGES.map((page) => [page.slug, read(`EXCERPT_${page.slug}`)]));
  return { tagline, bySlug };
}

function metaOf(html, key) {
  const found = html.match(
    new RegExp(`<meta (?:name|property)="${key.replace(/[:]/g, "\\:")}" content="([^"]*)"`),
  );
  return found ? found[1] : null;
}

export async function checkSeo() {
  const failures = [];

  // ── 사이트맵 ─────────────────────────────────────────────────────────
  const index = await text("/wp-sitemap.xml");
  if (index.status !== 200) {
    return [`/wp-sitemap.xml 이 HTTP ${index.status} 다 — 코어 사이트맵이 꺼져 있을 수 있다.`];
  }

  // 저널은 담기고 문의는 안 담긴다. **후자가 이 검사의 본론이다** — public: false 라
  // 지금은 저절로 빠지지만, 누가 관리 화면을 편하게 하려고 public 을 켜면 상담 문의
  // URL 이 검색엔진으로 넘어간다 (#38 의 판정 8 과 짝이다).
  if (!index.body.includes("artpsy_journal")) {
    failures.push("사이트맵 색인에 artpsy_journal 이 없다 — 저널이 검색에 안 잡힌다.");
  }
  if (index.body.includes("artpsy_inquiry")) {
    failures.push("사이트맵 색인에 artpsy_inquiry 가 있다 — 상담 문의 URL 이 검색엔진으로 간다.");
  }

  const pageMap = await text("/wp-sitemap-posts-page-1.xml");
  if (pageMap.status !== 200) {
    failures.push(`페이지 사이트맵이 HTTP ${pageMap.status} 다.`);
  } else {
    // 개수는 pages.mjs 에서 유도한다. 두 곳에 적으면 갈린다.
    const found = PAGES.filter((page) => pageMap.body.includes(`<loc>${BASE}${pathOf(page)}</loc>`));
    if (found.length !== PAGES.length) {
      const missing = PAGES.filter((page) => !found.includes(page)).map((page) => pathOf(page));
      failures.push(`페이지 사이트맵에 ${missing.join(", ")} 가 없다.`);
    }
  }

  // 문의 URL 이 어느 하위 사이트맵에도 없어야 한다. 색인 이름만 보면 놓친다.
  //
  // **published 문의를 하나 만들어 놓고 잰다.** 이유가 이 검사의 전부다: 코어 사이트맵은
  // post_status: publish 만 담고(class-wp-sitemaps-posts.php: 'post_status' => 'publish')
  // 우리는 문의를 private 로 저장한다. 그래서 **평소 상태에서는 public 을 켜도 아무 일이
  // 안 일어나고**, "안 나온다" 가 통과해도 그것이 우리가 막아서인지 알 수 없다.
  // 실제로 public 을 켜서 반증해 봤더니 아무것도 안 걸렸다 — 그때 이 검사는 아무것도
  // 안 재고 있었다.
  const made = evalPhp(
    `$id = wp_insert_post( array( "post_type" => "artpsy_inquiry", "post_status" => "publish", "post_title" => "smoke-sitemap-probe" ), true );
     echo "PROBE=" . ( is_wp_error( $id ) ? "error" : $id );`,
  );
  const probeId = (made.match(/PROBE=(\S+)/) ?? [])[1];

  if (!probeId || probeId === "error") {
    failures.push("사이트맵 검사용 문의를 못 만들었다 — 이 검사가 아무것도 안 재게 된다.");
  } else {
    try {
      const reindex = await text("/wp-sitemap.xml");
      if (reindex.body.includes("artpsy_inquiry")) {
        failures.push("사이트맵 색인에 artpsy_inquiry 가 있다 — 상담 문의 URL 이 검색엔진으로 간다.");
      }

      const inquiryMap = await text("/wp-sitemap-posts-artpsy_inquiry-1.xml");
      if (inquiryMap.status === 200) {
        failures.push("문의 전용 사이트맵이 200 이다 — 있으면 안 된다.");
      }
    } finally {
      evalPhp(`wp_delete_post( ${probeId}, true ); echo "PROBE_CLEANED=1";`);
    }

    const left = evalPhp(`echo "LEFT=" . ( get_post( ${probeId} ) ? "yes" : "no" );`);
    if (!/LEFT=no/.test(left)) failures.push("검사용 문의를 못 지웠다.");
  }

  // ── 메타태그 ─────────────────────────────────────────────────────────
  const { tagline, bySlug } = expectedDescriptions();
  const expectedFor = (path) => {
    const page = PAGES.find((one) => pathOf(one) === path);
    const excerpt = page ? bySlug[page.slug] : "";
    return excerpt || tagline;
  };

  const ROUTES = ["/", ARCHIVE_PATH, ...PAGES.map(pathOf)];
  const titles = new Map();
  const urls = new Map();
  let images = new Set();

  for (const path of ROUTES) {
    const { status, body } = await text(path);
    if (status !== 200) {
      failures.push(`${path} 가 HTTP ${status} 다 — 메타를 볼 수 없다.`);
      continue;
    }

    for (const key of ["og:title", "og:url", "og:image", "og:site_name", "twitter:card"]) {
      if (metaOf(body, key) === null) failures.push(`${path} 에 ${key} 가 없다.`);
    }

    // 설명은 **값까지** 본다. 편집자가 넣은 것이 아니면 나가면 안 된다.
    const want = expectedFor(path);
    const got = metaOf(body, "description");
    if (want === "" && got !== null) {
      failures.push(`${path} 에 description 이 있다 — 발췌도 태그라인도 비어 있는데 무엇을 적었나: "${got}"`);
    }
    if (want !== "" && got !== want) {
      failures.push(`${path} 의 description 이 편집자가 넣은 값과 다르다: "${got}" (기대: "${want}")`);
    }

    // 코어가 내는 것을 우리가 또 내면 안 된다.
    if ((body.match(/<title>/g) ?? []).length !== 1) {
      failures.push(`${path} 의 <title> 이 하나가 아니다 — 코어와 겹쳤다.`);
    }
    // canonical 은 **코어가 singular 에서만** 낸다. 없는 라우트가 있는 것이 정상이고,
    // 여기서 보는 것은 "우리가 두 번째를 만들지 않았다" 뿐이다.
    if ((body.match(/rel="canonical"/g) ?? []).length > 1) {
      failures.push(`${path} 의 canonical 이 둘 이상이다 — 코어와 겹쳤다.`);
    }

    titles.set(path, metaOf(body, "og:title"));
    urls.set(path, metaOf(body, "og:url"));
    const image = metaOf(body, "og:image");
    if (image) images.add(image);

    if (urls.get(path) && !urls.get(path).endsWith(path)) {
      failures.push(`${path} 의 og:url 이 그 페이지가 아니다: ${urls.get(path)}`);
    }
  }

  // 여섯이 같은 값을 들어도 "있다" 는 통과한다. 그 구멍을 여기서 닫는다.
  for (const [label, map] of [["og:title", titles], ["og:url", urls]]) {
    const values = [...map.values()].filter(Boolean);
    if (new Set(values).size !== values.length) {
      failures.push(`${label} 이 라우트마다 다르지 않다 — ${values.length}개 중 ${new Set(values).size}개만 고유하다.`);
    }
  }

  // og:image 가 실제로 도달해야 한다. 404 를 소셜에 물리면 그것이 첫인상이다.
  for (const image of images) {
    const res = await fetch(image, { method: "HEAD" });
    if (res.status !== 200) failures.push(`og:image 가 HTTP ${res.status} 다: ${image}`);
  }
  if (images.size === 0) failures.push("og:image 를 하나도 못 모았다 — 이 검사가 아무것도 안 재고 있다.");

  if (failures.length === 0) {
    const described = ROUTES.filter((path) => expectedFor(path) !== "").length;
    console.log(
      `OK  SEO — 사이트맵(문의 없음) · 메타 ${ROUTES.length}라우트 전부 고유 · og:image 200 · ` +
        `description ${described}/${ROUTES.length} (편집자가 채운 만큼)`,
    );
  }
  return failures;
}
