// 메인 팝업의 L3. 판정 여섯 중 넷을 여기서 재고, 둘(JS 없이 닫기 · 살균)은 브라우저가
// 필요해서 따로 잰다 (PR9-POPUP §5).
//
// 이 검사는 옵션을 켰다 껐다 한다. **회차 시작 상태로 되돌리고 나온다** — 안 그러면
// 다음 사람이 팝업이 켜진 사이트를 받는다.
import { execFileSync } from "node:child_process";

const BASE = process.env.WP_BASE_URL ?? "http://localhost:8888";

const KEYS = [
  "artpsy_popup_enabled",
  "artpsy_popup_title",
  "artpsy_popup_body",
  "artpsy_popup_link_url",
  "artpsy_popup_link_label",
];

function evalPhp(php) {
  return execFileSync("wp-env", ["run", "cli", "wp", "eval", php], { encoding: "utf8" });
}

function sentinel(out, name) {
  const found = out.match(new RegExp(`${name}=([^\\n]*)`));
  if (!found) throw new Error(`${name} 을 못 읽었다.\n${out}`);
  return found[1].trim();
}

function setOptions(values) {
  const php = Object.entries(values)
    .map(([k, v]) => `update_option( "${k}", ${JSON.stringify(String(v))} );`)
    .join(" ");
  evalPhp(`${php} echo "SET=1";`);
}

function readOptions() {
  const out = evalPhp(
    KEYS.map((k) => `echo "${k}=" . get_option( "${k}", "" ) . "\\n";`).join(" "),
  );
  return Object.fromEntries(KEYS.map((k) => [k, sentinel(out, k)]));
}

async function body(path) {
  const res = await fetch(new URL(path, BASE));
  return { status: res.status, html: await res.text() };
}

const TITLE = "스모크 공지";
const BODY = "<p>이것은 smoke 가 켠 팝업이다. 끝나면 되돌린다.</p>";
const XSS = '<p>본문</p><script>window.__artpsy_popup_xss = 1;</script>';

export async function checkPopup() {
  const failures = [];
  const before = readOptions();

  try {
    // ── 1. 기본 — 옵션이 꺼져 있으면 마크업 자체가 없다 ──────────────────
    setOptions({ artpsy_popup_enabled: "" });
    const off = await body("/");
    if (off.html.includes("artpsy-popup")) {
      failures.push("팝업이 꺼져 있는데 마크업이 나간다 — 기본이 꺼짐이어야 한다.");
    }

    // ── 2. 켜면 설정한 값이 그대로 나온다 ────────────────────────────────
    setOptions({
      artpsy_popup_enabled: "1",
      artpsy_popup_title: TITLE,
      artpsy_popup_body: BODY,
      artpsy_popup_link_url: "",
      artpsy_popup_link_label: "",
    });

    const on = await body("/");
    if (!on.html.includes('id="artpsy-popup"')) failures.push("켰는데 팝업 마크업이 없다.");
    if (!on.html.includes(TITLE)) failures.push("팝업 제목이 설정한 값과 다르다.");
    if (!on.html.includes("smoke 가 켠 팝업")) failures.push("팝업 본문이 설정한 값과 다르다.");

    // 닫기가 진짜 폼이어야 한다. 핸들러에만 걸려 있으면 JS 가 죽었을 때 안 닫힌다.
    if (!/<form method="dialog"/.test(on.html)) {
      failures.push("닫기가 <form method=\"dialog\"> 가 아니다 — JS 없이 못 닫는다.");
    }

    // 접근 가능한 이름. 아이콘만 있는 닫기 버튼은 이름이 없다.
    if (!on.html.includes('aria-labelledby="artpsy-popup-title"')) {
      failures.push("팝업에 접근 가능한 이름이 없다.");
    }

    // ── 4. 다섯 페이지에는 켜도 안 나온다 ────────────────────────────────
    for (const path of ["/philosophy/", "/contact/", "/journal/"]) {
      const other = await body(path);
      if (other.html.includes("artpsy-popup")) {
        failures.push(`${path} 에 팝업이 나온다 — 메인에만 나와야 한다.`);
      }
    }

    // ── 6. 살균 — 저장 콜백을 안 타는 경로로 넣는다 ──────────────────────
    // update_option 은 register_setting 의 sanitize_callback 을 안 탄다. 저장에서만
    // 걸러 두면 CLI 로 넣은 <script> 가 그대로 나간다 — 그래서 출력에서도 거른다.
    setOptions({ artpsy_popup_body: XSS });
    const injected = await body("/");
    if (/<script>window\.__artpsy_popup_xss/.test(injected.html)) {
      failures.push("본문의 <script> 가 그대로 나간다 — 출력 살균이 없다.");
    }
    if (!injected.html.includes("본문")) {
      failures.push("살균이 본문까지 지웠다 — wp_kses_post 가 아니라 통째로 지운 것이다.");
    }

    // ── 3. 다시 끄면 사라진다 ────────────────────────────────────────────
    setOptions({ artpsy_popup_enabled: "" });
    const offAgain = await body("/");
    if (offAgain.html.includes("artpsy-popup")) {
      failures.push("껐는데 팝업이 그대로 나온다.");
    }
  } finally {
    // 회차 시작 상태로 되돌린다.
    setOptions(before);
  }

  const after = readOptions();
  for (const key of KEYS) {
    if (after[key] !== before[key]) {
      failures.push(`${key} 를 원래 값으로 못 되돌렸다: "${before[key]}" → "${after[key]}"`);
    }
  }

  if (failures.length === 0) {
    console.log("OK  메인 팝업 — 기본 꺼짐 · 켜면 값 그대로 · 메인에만 · 살균 · 다시 꺼짐");
  }
  return failures;
}
