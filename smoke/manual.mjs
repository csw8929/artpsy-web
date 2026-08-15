// 매뉴얼이 적은 주소가 **실제로 열리는가**. tests/manual.test.js 가 글자를 코드와 맞추고,
// 여기서 그 주소에 실제로 들어가 본다 (PR12-MANUAL §6-1·2·6).
//
// 매뉴얼은 이 저장소에서 가장 빨리 썩는 문서다. 썩어도 아무것도 안 깨지므로 아무도 모른다 —
// 그래서 **문서에서 주소를 뽑아 열어 보는 것**이 이 검사의 전부다.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = process.env.WP_BASE_URL ?? "http://localhost:8888";
const EDITOR_LOGIN = "artpsy_smoke_manual_editor";

function evalPhp(php) {
  return execFileSync("wp-env", ["run", "cli", "wp", "eval", php], { encoding: "utf8" });
}

function sentinel(out, name) {
  const found = out.match(new RegExp(`${name}=([^\\n]*)`));
  if (!found) throw new Error(`${name} 을 못 읽었다.\n${out}`);
  return found[1].trim();
}

/** 관리 화면은 auth 쿠키를 본다. logged_in 만으로는 로그인으로 튕긴다. */
function cookiesFor(userId) {
  const out = evalPhp(
    `$exp = time() + 3600;
     echo "AUTH=" . AUTH_COOKIE . "=" . wp_generate_auth_cookie( ${userId}, $exp, "auth" ) . "\\n";
     echo "LOGGED=" . LOGGED_IN_COOKIE . "=" . wp_generate_auth_cookie( ${userId}, $exp, "logged_in" );`,
  );
  return `${sentinel(out, "AUTH")}; ${sentinel(out, "LOGGED")}`;
}

async function open(path, cookie) {
  const res = await fetch(new URL(path, BASE), { headers: { cookie }, redirect: "manual" });
  return { status: res.status, body: res.status === 200 ? await res.text() : "" };
}

export async function checkManual() {
  const failures = [];

  const manual = readFileSync(
    new URL("../docs/20260815_관리자-매뉴얼.md", import.meta.url),
    "utf8",
  );

  const paths = [...new Set([...manual.matchAll(/`(\/wp-admin\/[^`]+)`/g)].map((m) => m[1]))];

  if (paths.length < 4) {
    return [`매뉴얼에서 관리 화면 주소를 ${paths.length}개만 뽑았다 — 이 검사가 아무것도 안 재고 있다.`];
  }

  const adminId = sentinel(
    evalPhp(
      `$a = get_users( array( "role" => "administrator", "number" => 1, "fields" => "ID" ) );
       echo "ADMIN=" . ( $a ? $a[0] : 0 );`,
    ),
    "ADMIN",
  );

  if (adminId === "0") return ["관리자 계정이 없다 — 이 검사가 성립하지 않는다."];

  const adminCookie = cookiesFor(adminId);

  // ── 1. 매뉴얼이 적은 주소가 관리자에게 전부 열린다 ──────────────────────
  for (const path of paths) {
    const { status } = await open(path, adminCookie);
    if (status !== 200) {
      failures.push(`매뉴얼이 적은 ${path} 가 관리자에게 HTTP ${status} 다.`);
    }
  }

  // ── 2. 매뉴얼이 적은 메뉴 이름이 그 화면에 실제로 있다 ──────────────────
  const NAMED = [
    ["/wp-admin/options-general.php?page=artpsy-popup", "메인 팝업"],
    ["/wp-admin/index.php", "artpsy — 문의와 방문"],
  ];

  for (const [path, label] of NAMED) {
    if (!paths.includes(path)) {
      failures.push(`매뉴얼에 ${path} 가 없다 — ${label} 을 찾을 길이 없다.`);
      continue;
    }
    const { status, body } = await open(path, adminCookie);
    if (status === 200 && !body.includes(label)) {
      failures.push(`${path} 에 "${label}" 이 없다 — 매뉴얼이 적은 이름과 화면이 다르다.`);
    }
  }

  // ── 6. 편집자가 못 본다고 적은 것을 실제로 못 보나 ──────────────────────
  const editorId = sentinel(
    evalPhp(
      `$u = get_user_by( "login", "${EDITOR_LOGIN}" );
       $id = $u ? $u->ID : wp_insert_user( array( "user_login" => "${EDITOR_LOGIN}", "user_pass" => wp_generate_password(), "role" => "editor" ) );
       echo "EDITOR=" . ( is_wp_error( $id ) ? 0 : $id );`,
    ),
    "EDITOR",
  );

  if (editorId === "0") {
    failures.push("임시 editor 계정을 못 만들었다 — 권한 설명을 못 잰다.");
  } else {
    try {
      const editorCookie = cookiesFor(editorId);

      // 매뉴얼이 "403 이 나온다" 라고 적어 뒀다. 그 숫자까지 맞는지 본다.
      const inquiry = await open("/wp-admin/edit.php?post_type=artpsy_inquiry", editorCookie);
      if (inquiry.status !== 403) {
        failures.push(`편집자가 문의 목록에서 HTTP ${inquiry.status} 를 받는다 — 매뉴얼은 403 이라고 적었다.`);
      }

      const popup = await open("/wp-admin/options-general.php?page=artpsy-popup", editorCookie);
      if (popup.status === 200) {
        failures.push("편집자가 팝업 설정 화면을 연다 — 매뉴얼은 못 본다고 적었다.");
      }

      // 대시보드는 열리되 위젯이 없어야 한다.
      const dashboard = await open("/wp-admin/index.php", editorCookie);
      if (dashboard.status === 200 && dashboard.body.includes("artpsy — 문의와 방문")) {
        failures.push("편집자 대시보드에 위젯이 보인다 — 매뉴얼은 못 본다고 적었다.");
      }
    } finally {
      evalPhp(
        `require_once ABSPATH . "wp-admin/includes/user.php"; wp_delete_user( ${editorId} ); echo "DELETED=1";`,
      );
    }

    const left = evalPhp(`echo "LEFT=" . ( get_user_by( "login", "${EDITOR_LOGIN}" ) ? "yes" : "no" );`);
    if (sentinel(left, "LEFT") !== "no") failures.push("임시 editor 계정을 못 지웠다.");
  }

  if (failures.length === 0) {
    console.log(`OK  매뉴얼 — 주소 ${paths.length}개 열림 · 메뉴 이름 일치 · 편집자는 403`);
  }
  return failures;
}
