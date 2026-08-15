// L3 — 관리자 화면과 방문 집계. 판정 여덟 (PR11-ADMIN §5).
//
// **6(개인정보 0)을 코드 읽기로 안 때운다.** `$_SERVER['REMOTE_ADDR']` 를 안 썼다는 것과
// DB 에 없다는 것은 다르다 — 옵션 값을 실제로 꺼내서 본다.
//
// 4·5(카운트)는 **반증이 쉬운 자리**라 세는 조건을 뒤집었을 때 실패하는 것까지 여기서
// 재지는 않는다(그건 손으로 돌린다). 대신 **증가와 비증가를 같은 회차에서** 잰다 —
// "안 는다" 만 재면 아무 일도 안 일어나는 것과 구분이 안 된다.
import { execFileSync } from "node:child_process";

const BASE = process.env.WP_BASE_URL ?? "http://localhost:8888";
const OPTION = "artpsy_visits";
const EDITOR_LOGIN = "artpsy_smoke_admin_editor";

function evalPhp(php) {
  return execFileSync("wp-env", ["run", "cli", "wp", "eval", php], { encoding: "utf8" });
}

function sentinel(out, name) {
  const found = out.match(new RegExp(`${name}=([^\\n]*)`));
  if (!found) throw new Error(`${name} 을 못 읽었다.\n${out}`);
  return found[1].trim();
}

function today() {
  return sentinel(evalPhp(`echo "TODAY=" . current_time( "Y-m-d" );`), "TODAY");
}

function visitsRaw() {
  // 직렬화된 원본을 그대로 받는다. 여기서 IP·UA 가 있는지를 본다.
  return sentinel(
    evalPhp(`echo "RAW=" . wp_json_encode( get_option( "${OPTION}", array() ) );`),
    "RAW",
  );
}

function countFor(day) {
  const raw = JSON.parse(visitsRaw());
  return Number(raw[day] ?? 0);
}

export async function checkAdmin() {
  const failures = [];
  const day = today();

  // 자르기 시험이 과거 날짜 40개를 심는다. 안 되돌리면 **대시보드에 지어낸 방문
  // 이력이 남는다** — 이 PR 이 "숫자는 그 자체로 신뢰를 요구한다" 로 시작한 자리라
  // 검사가 그 신뢰를 먼저 깨면 안 된다.
  //
  // 값을 JS 로 들고 갔다 오지 않는다. JSON 을 PHP 소스에 끼워 넣는 순간 인용 규칙이
  // 하나 더 생기고, 그것이 틀리면 **복구가 조용히 실패한다**(실제로 한 번 그랬다).
  // WP 옵션에 그대로 옮겨 두는 것이 왕복이 없다.
  const snapshot = visitsRaw();
  evalPhp(`update_option( "${OPTION}_smoke_backup", get_option( "${OPTION}", array() ) ); echo "BACKED=1";`);

  // ── 4. 프런트를 한 번 열면 오늘 수가 정확히 1 는다 ──────────────────────
  const before = countFor(day);
  await fetch(new URL("/", BASE));
  const afterFront = countFor(day);

  if (afterFront - before !== 1) {
    failures.push(`프런트를 한 번 열었는데 오늘 수가 ${afterFront - before} 늘었다 — 1 이어야 한다.`);
  }

  // ── 5. "우리가 우리를 센다" 를 막는다 ───────────────────────────────────
  //
  // /wp-admin/ 을 치는 것만으로는 **아무것도 안 재진다.** template_redirect 가 wp-admin ·
  // wp-login · REST 에서 아예 안 돌기 때문이다 — 실제로 is_admin() 가드를 떼고 반증했더니
  // 아무 일도 안 일어났다. 그 가드는 훅을 옮기는 사람에게 남기는 표시이지 지금 막고 있는
  // 것이 아니다.
  //
  // 지금 막고 있는 것은 **로그인한 사람의 프런트 조회**이고, 그것이 이 판정의 실체다.
  await fetch(new URL("/wp-admin/", BASE));
  await fetch(new URL("/wp-login.php", BASE));
  const afterAdminUrls = countFor(day);

  if (afterAdminUrls !== afterFront) {
    failures.push(`관리 화면 URL 로 수가 ${afterAdminUrls - afterFront} 늘었다 — 0 이어야 한다.`);
  }

  const cookie = evalPhp(
    `$admins = get_users( array( "role" => "administrator", "number" => 1, "fields" => "ID" ) );
     if ( ! $admins ) { echo "COOKIE=none"; } else {
       $expiry = time() + 3600;
       echo "COOKIE=" . LOGGED_IN_COOKIE . "=" . wp_generate_auth_cookie( $admins[0], $expiry, "logged_in" );
     }`,
  );
  const cookieHeader = sentinel(cookie, "COOKIE");

  if (cookieHeader === "none") {
    failures.push("관리자 계정이 없어 로그인 상태를 못 만든다 — 이 판정이 무의미해진다.");
  } else {
    await fetch(new URL("/", BASE), { headers: { cookie: cookieHeader } });
    const afterLoggedIn = countFor(day);

    if (afterLoggedIn !== afterAdminUrls) {
      failures.push(
        `로그인한 채로 프런트를 열었는데 수가 ${afterLoggedIn - afterAdminUrls} 늘었다 — 0 이어야 한다.`,
      );
    }
  }

  // ── 6. 저장된 값에 개인정보가 없다 ──────────────────────────────────────
  const raw = visitsRaw();
  const parsed = JSON.parse(raw);
  const keys = Object.keys(parsed);

  if (keys.length === 0) {
    failures.push("방문 옵션이 비어 있다 — 위 판정이 아무것도 안 재고 있다.");
  }

  for (const key of keys) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      failures.push(`방문 옵션의 키가 날짜가 아니다: ${key} — 무엇을 모으고 있나.`);
    }
    if (typeof parsed[key] !== "number") {
      failures.push(`방문 옵션의 값이 수가 아니다: ${key} → ${JSON.stringify(parsed[key])}`);
    }
  }

  // 값 전체를 문자열로 훑는다. IP 형태·UA 문자열이 어디에도 없어야 한다.
  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(raw)) {
    failures.push(`방문 옵션에 IP 로 보이는 값이 있다: ${raw.slice(0, 120)}`);
  }
  if (/Mozilla|Chrome|Safari|bot/i.test(raw)) {
    failures.push(`방문 옵션에 User-Agent 로 보이는 값이 있다: ${raw.slice(0, 120)}`);
  }

  // ── 8. N일 넘으면 잘린다 ────────────────────────────────────────────────
  const kept = sentinel(
    evalPhp(
      `$v = get_option( "${OPTION}", array() );
       for ( $i = 1; $i <= 40; $i++ ) { $v[ gmdate( "Y-m-d", strtotime( "-{$i} days" ) ) ] = $i; }
       update_option( "${OPTION}", $v );
       echo "SEEDED=" . count( $v );`,
    ),
    "SEEDED",
  );

  if (Number(kept) <= 30) {
    failures.push(`자르기 시험용 씨앗이 ${kept}개다 — 30 을 넘겨야 자르는 것이 보인다.`);
  }

  await fetch(new URL("/", BASE));
  const trimmed = JSON.parse(visitsRaw());
  const days = Number(sentinel(evalPhp(`echo "DAYS=" . ARTPSY_VISITS_DAYS;`), "DAYS"));

  if (Object.keys(trimmed).length > days) {
    failures.push(`방문 옵션이 ${Object.keys(trimmed).length}일치다 — ${days}일 넘으면 잘려야 한다.`);
  }
  if (!(day in trimmed)) {
    failures.push("자른 뒤 오늘이 사라졌다 — 최근 것부터 남겨야 한다.");
  }

  // ── 3. 위젯 권한 — 실제 계정으로 ────────────────────────────────────────
  const probe = evalPhp(
    `$u = get_user_by( "login", "${EDITOR_LOGIN}" );
     $id = $u ? $u->ID : wp_insert_user( array( "user_login" => "${EDITOR_LOGIN}", "user_pass" => wp_generate_password(), "role" => "editor" ) );
     $admins = get_users( array( "role" => "administrator", "number" => 1, "fields" => "ID" ) );
     echo "EDITOR=" . ( is_wp_error( $id ) ? "error" : ( user_can( $id, "manage_options" ) ? "yes" : "no" ) ) . "\\n";
     echo "ADMIN=" . ( $admins && user_can( $admins[0], "manage_options" ) ? "yes" : "no" ) . "\\n";
     echo "EDITOR_ID=" . ( is_wp_error( $id ) ? 0 : $id );`,
  );

  if (sentinel(probe, "EDITOR") !== "no") {
    failures.push("editor 가 manage_options 를 갖는다 — 위젯이 보인다.");
  }
  if (sentinel(probe, "ADMIN") !== "yes") {
    failures.push("관리자가 manage_options 를 못 갖는다 — 닫다가 다 막았다.");
  }

  const editorId = sentinel(probe, "EDITOR_ID");
  if (editorId !== "0") {
    evalPhp(
      `require_once ABSPATH . "wp-admin/includes/user.php"; wp_delete_user( ${editorId} ); echo "DELETED=1";`,
    );
    const left = evalPhp(`echo "LEFT=" . ( get_user_by( "login", "${EDITOR_LOGIN}" ) ? "yes" : "no" );`);
    if (sentinel(left, "LEFT") !== "no") failures.push("임시 editor 계정을 못 지웠다.");
  }

  // ── 1·2. 상태와 목록 열 ─────────────────────────────────────────────────
  const inquiry = evalPhp(
    `$id = wp_insert_post( array( "post_type" => "artpsy_inquiry", "post_status" => "private", "post_title" => "smoke-admin-probe" ), true );
     if ( ! is_wp_error( $id ) ) { update_post_meta( $id, "_artpsy_email", "probe@artpsy.example" ); }
     echo "ID=" . ( is_wp_error( $id ) ? 0 : $id );`,
  );
  const inquiryId = sentinel(inquiry, "ID");

  if (inquiryId === "0") {
    failures.push("상태 시험용 문의를 못 만들었다.");
  } else {
    const flow = evalPhp(
      `echo "DEFAULT=" . artpsy_inquiry_status( ${inquiryId} ) . "\\n";
       update_post_meta( ${inquiryId}, ARTPSY_INQUIRY_STATUS_META, "open" );
       echo "AFTER=" . artpsy_inquiry_status( ${inquiryId} ) . "\\n";
       update_post_meta( ${inquiryId}, ARTPSY_INQUIRY_STATUS_META, "nonsense" );
       echo "BAD=" . artpsy_inquiry_status( ${inquiryId} ) . "\\n";
       echo "COLUMNS=" . implode( ",", array_keys( apply_filters( "manage_artpsy_inquiry_posts_columns", array( "title" => "제목", "date" => "날짜" ) ) ) );`,
    );

    if (sentinel(flow, "DEFAULT") !== "new") {
      failures.push(`메타가 없을 때 기본 상태가 ${sentinel(flow, "DEFAULT")} 다 — new 여야 한다.`);
    }
    if (sentinel(flow, "AFTER") !== "open") {
      failures.push("상태를 바꿨는데 다시 읽으면 안 바뀌어 있다.");
    }
    if (sentinel(flow, "BAD") !== "new") {
      failures.push("없는 상태가 그대로 읽힌다 — 셋 밖으로 새면 목록 필터가 못 잡는다.");
    }

    const columns = sentinel(flow, "COLUMNS").split(",");
    for (const need of ["artpsy_email", "artpsy_status"]) {
      if (!columns.includes(need)) failures.push(`목록 열에 ${need} 가 없다: ${columns.join(",")}`);
    }
    if (columns[columns.length - 1] !== "date") {
      failures.push(`날짜 열이 맨 뒤가 아니다: ${columns.join(",")}`);
    }

    evalPhp(`wp_delete_post( ${inquiryId}, true ); echo "CLEANED=1";`);
    const left = evalPhp(`echo "LEFT=" . ( get_post( ${inquiryId} ) ? "yes" : "no" );`);
    if (sentinel(left, "LEFT") !== "no") failures.push("시험용 문의를 못 지웠다.");
  }

  // 회차 시작 상태로 되돌린다.
  evalPhp(
    `update_option( "${OPTION}", get_option( "${OPTION}_smoke_backup", array() ) );
     delete_option( "${OPTION}_smoke_backup" );
     echo "RESTORED=1";`,
  );

  if (visitsRaw() !== snapshot) {
    failures.push("방문 옵션을 회차 시작 상태로 못 되돌렸다 — 지어낸 이력이 대시보드에 남는다.");
  }

  if (failures.length === 0) {
    console.log("OK  관리 — 상태 3 · 목록 열 · 위젯 권한 · 방문 +1/로그인 0 · 개인정보 0 · 30일 자르기");
  }
  return failures;
}
