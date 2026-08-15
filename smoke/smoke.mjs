#!/usr/bin/env node
// L2 도달 계층 — "그 URL 이 200 이고 그 템플릿이 골렸나" 를 잰다 (PR2-SMOKE §1).
// L1(파일이 그렇게 적혀 있나)은 vitest, L3(보내면 남고 보이나)는 smoke/db.mjs 가 자리만 쥔다.
import { ROUTES, EXPECTED_ROUTE_COUNT } from "./routes.mjs";
import { muPluginLoaded } from "./db.mjs";
import { extractImageUrls } from "./assets.mjs";

// DB 레코드가 있다고 파일이 서는 게 아니다 — 저널 대표 이미지가 그렇게 깨졌었다
// (SEED-EXISTS-DECIDE). 200만으로는 "이미지 URL을 0개 모으고 통과"하는 구멍이 남아
// 하드코딩해 단언한다 — ROUTES와 같은 이유다.
const EXPECTED_ASSET_COUNT = 10;

const BASE = process.env.WP_BASE_URL ?? "http://localhost:8888";

function hasMarker(html, marker) {
  // 클래스 토큰을 공백으로 쪼개 정확히 비교한다 — \b 정규식은 하이픈이 단어 경계라
  // "hero-renamed"에도 "hero"가 걸린다(§2-3 표식 조작 시험에서 실제로 걸렸다).
  const classAttrs = html.match(/class="[^"]*"/g) ?? [];
  return classAttrs.some((attr) => attr.slice(7, -1).trim().split(/\s+/).includes(marker));
}

async function fetchHtml(path) {
  const url = new URL(path, BASE).toString();
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    // 연결 거부를 "라우트 0개 통과"로 삼키지 않는다 (PR2-SMOKE §2-2).
    throw new Error(
      `${url} 에 연결할 수 없다 — wp-env 가 안 떠 있을 수 있다. ` +
        `\`npm run wp:start\` 를 먼저 돌려라.\n원인: ${err.message}`,
    );
  }
  const body = await res.text();
  return { status: res.status, body };
}

async function checkRoutes() {
  const failures = [];
  let firstRouteChecked = false;

  for (const route of ROUTES) {
    const { status, body } = await fetchHtml(route.path);

    if (status !== 200) {
      failures.push(`${route.label}: ${route.path} → HTTP ${status} (기대: 200)`);
      continue;
    }

    const found = hasMarker(body, route.marker);

    if (!firstRouteChecked) {
      firstRouteChecked = true;
      if (route.expect && !found) {
        // 첫 라우트에서 기대 표식이 없으면 테마가 비활성일 수 있다 — 원인을 짚는다.
        failures.push(
          `${route.label}: ${route.path} 에서 '${route.marker}' 표식을 못 찾았다 — ` +
            `테마가 비활성일 수 있다. \`npm run wp:activate\` 를 돌려라.`,
        );
        continue;
      }
    }

    if (route.expect && !found) {
      failures.push(`${route.label}: ${route.path} 에서 '${route.marker}' 표식을 못 찾았다.`);
    } else if (!route.expect && found) {
      failures.push(`${route.label}: ${route.path} 에서 없어야 할 '${route.marker}' 표식이 나왔다.`);
    } else {
      console.log(`OK  ${route.label}`);
    }
  }

  return failures;
}

/**
 * 문의 폼이 **응답에** 있는지 본다. 템플릿에 있는지가 아니다 — nonce 는 서버가 요청마다
 * 내므로 정적 파일에는 없고, 파일을 보는 단언으로는 "주입이 실제로 돌았나" 를 못 잡는다
 * (PR6-CONTACT-FORM §3·§7).
 *
 * 동의 체크박스의 required 도 여기서 본다. 브라우저가 막는 것으로 끝내지 않는 것은
 * PR 7 이지만, 막을 표시가 응답에 붙어 있는지는 지금 잴 수 있다.
 */
async function checkContactForm() {
  const failures = [];
  const { status, body } = await fetchHtml("/contact/");

  if (status !== 200) return [`/contact/ 가 HTTP ${status} 다 — 폼을 볼 수 없다.`];

  if (!/<form[^>]*method="post"/.test(body)) {
    failures.push("/contact/ 에 <form method=post> 가 없다 — 렌더 주입이 안 돌았다.");
  }

  const nonce = body.match(/name="artpsy_contact_nonce"[^>]*value="([^"]+)"/);
  if (!nonce) {
    failures.push("/contact/ 에 nonce 필드가 없다 — 값이 있어야 PR 7 의 반증이 성립한다.");
  }

  if (!/id="artpsy-consent"[^>]*required/.test(body)) {
    failures.push("/contact/ 의 동의 체크박스에 required 가 없다.");
  }

  if (failures.length === 0) console.log("OK  문의 폼 — form · nonce · 동의 required");
  return failures;
}

async function checkMuPlugin() {
  // L3 은 자리만 확인한다 — 뮤플러그인이 pre_wp_mail 을 걸었는지만 본다.
  // 폼과 엮는 것은 PR 7 의 일이다 (PR2-SMOKE §3).
  try {
    const loaded = muPluginLoaded();
    if (!loaded) {
      return [`뮤플러그인이 pre_wp_mail 을 안 걸었다 — .wp-env.json mappings 를 확인해라.`];
    }
    console.log(`OK  뮤플러그인이 pre_wp_mail 을 걸었다`);
    return [];
  } catch (err) {
    return [`뮤플러그인 확인 중 wp-env cli 호출이 실패했다: ${err.message}`];
  }
}

async function checkAssets() {
  // 시드된 라우트를 돌면서 그 문서가 참조하는 이미지 URL을 모으고 전부 200인지 본다.
  // 이 방법으로 DB 레코드는 있는데 파일이 없는 상태(SEED-EXISTS-DECIDE)가 조용한
  // 상태에서 시끄러운 상태로 바뀐다. 원인은 안 판다 — 여기가 잡는 것은 증상이다.
  const paths = [...new Set(ROUTES.map((route) => route.path))];
  const urls = new Set();
  for (const path of paths) {
    const { body } = await fetchHtml(path);
    for (const url of extractImageUrls(body, BASE)) urls.add(url);
  }

  if (urls.size !== EXPECTED_ASSET_COUNT) {
    return [
      `이미지 URL을 ${urls.size}개 모았는데 EXPECTED_ASSET_COUNT는 ${EXPECTED_ASSET_COUNT}다. ` +
        `자산이 늘거나 줄었으면 이 수도 같이 고쳐라.`,
    ];
  }

  const failures = [];
  for (const url of urls) {
    let res;
    try {
      res = await fetch(url);
    } catch (err) {
      failures.push(`${url} 에 연결할 수 없다: ${err.message}`);
      continue;
    }
    if (res.status !== 200) failures.push(`${url} → HTTP ${res.status} (기대: 200)`);
  }

  if (failures.length === 0) console.log(`OK  이미지 ${urls.size}개 전부 200`);
  return failures;
}

async function main() {
  if (ROUTES.length !== EXPECTED_ROUTE_COUNT) {
    throw new Error(
      `ROUTES 가 ${ROUTES.length}개인데 EXPECTED_ROUTE_COUNT 는 ${EXPECTED_ROUTE_COUNT}다. ` +
        `라우트를 늘렸으면 이 수도 같이 올려라 (PR2-SMOKE §2-1).`,
    );
  }

  const failures = [
		...(await checkRoutes()),
		...(await checkMuPlugin()),
		...(await checkAssets()),
		...(await checkContactForm()),
	];

  if (failures.length > 0) {
    console.error("\n실패:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n${ROUTES.length}개 라우트 + 뮤플러그인 배선 통과.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
