// 문의를 누가 볼 수 있는지 **실제 계정으로** 잰다.
//
// 역할표를 외워서 단언하지 않는다. `editor` 가 무엇을 갖는지는 코어가 정하고 버전마다
// 바뀔 수 있는데, 여기서 지켜야 하는 것은 "editor 가 무슨 권한을 갖는가" 가 아니라
// **"editor 가 상담 문의를 못 읽는가"** 다 (PR8-CONTACT-EXTRAS §5).
//
// 닫는 쪽만 재면 "전부 막았는데 통과" 가 된다. 관리자가 읽는 것을 같은 회차에서 같이
// 재는 것이 그 구멍을 닫는다 — smoke/contact.mjs 가 "유효한 제출이 실제로 늘린다" 를
// 같이 재는 것과 같은 형태다.
import { execFileSync } from "node:child_process";

const LOGIN = "artpsy_smoke_editor";

function evalPhp(php) {
  return execFileSync("wp-env", ["run", "cli", "wp", "eval", php], { encoding: "utf8" });
}

function sentinel(out, name) {
  const found = out.match(new RegExp(`${name}=([^\\s]*)`));
  if (!found) throw new Error(`${name} 을 못 읽었다.\n${out}`);
  return found[1];
}

export function checkInquiryCaps() {
  const failures = [];

  // 임시 editor 를 만든다. 있으면 그대로 쓴다 — 회차마다 계정이 쌓이지 않게.
  const made = evalPhp(
    `$u = get_user_by( "login", "${LOGIN}" );
     if ( ! $u ) { $id = wp_insert_user( array( "user_login" => "${LOGIN}", "user_pass" => wp_generate_password(), "role" => "editor" ) ); }
     else { $id = $u->ID; }
     echo is_wp_error( $id ) ? "EDITOR_ID=error" : "EDITOR_ID=" . $id;`,
  );
  const editorId = sentinel(made, "EDITOR_ID");
  if (editorId === "error") return ["임시 editor 계정을 못 만들었다 — 권한을 잴 수 없다."];

  const probe = evalPhp(
    `$obj = get_post_type_object( "artpsy_inquiry" );
     $admin = get_users( array( "role" => "administrator", "number" => 1, "fields" => "ID" ) );
     $admin_id = $admin ? $admin[0] : 0;
     echo "CAP=" . $obj->cap->edit_posts;
     echo " READCAP=" . $obj->cap->read_private_posts;
     echo " EDITOR_LIST=" . ( user_can( ${editorId}, $obj->cap->edit_posts ) ? "yes" : "no" );
     echo " EDITOR_READ=" . ( user_can( ${editorId}, $obj->cap->read_private_posts ) ? "yes" : "no" );
     echo " ADMIN_ID=" . $admin_id;
     echo " ADMIN_LIST=" . ( $admin_id && user_can( $admin_id, $obj->cap->edit_posts ) ? "yes" : "no" );
     echo " ADMIN_READ=" . ( $admin_id && user_can( $admin_id, $obj->cap->read_private_posts ) ? "yes" : "no" );`,
  );

  // 매핑이 실제로 걸렸는지부터 본다. 안 걸렸으면 아래 넷이 무엇을 재는지가 달라진다.
  if (sentinel(probe, "CAP") !== "manage_options") {
    failures.push(`문의 목록 권한이 manage_options 가 아니라 ${sentinel(probe, "CAP")} 다.`);
  }

  if (sentinel(probe, "ADMIN_ID") === "0") {
    failures.push("관리자 계정을 못 찾았다 — 아래 판정이 무의미해진다.");
  }

  const CASES = [
    ["EDITOR_LIST", "no", "editor 가 문의 목록에 들어간다"],
    ["EDITOR_READ", "no", "editor 가 사설 문의를 읽는다"],
    ["ADMIN_LIST", "yes", "관리자가 문의 목록에 못 들어간다 — 닫다가 다 막았다"],
    ["ADMIN_READ", "yes", "관리자가 사설 문의를 못 읽는다 — 닫다가 다 막았다"],
  ];

  for (const [key, want, complaint] of CASES) {
    if (sentinel(probe, key) !== want) failures.push(complaint);
  }

  // 계정을 지우고 나온다. 확인이 상태를 남기지 않는다.
  evalPhp(
    `require_once ABSPATH . "wp-admin/includes/user.php";
     wp_delete_user( ${editorId} );
     echo "DELETED=" . ( get_user_by( "login", "${LOGIN}" ) ? "no" : "yes" );`,
  );

  const left = evalPhp(`echo "LEFT=" . ( get_user_by( "login", "${LOGIN}" ) ? "yes" : "no" );`);
  if (sentinel(left, "LEFT") !== "no") {
    failures.push("임시 editor 계정을 못 지웠다.");
  }

  if (failures.length === 0) {
    console.log("OK  문의 권한 — editor 는 못 읽고 관리자는 읽는다");
  }
  return failures;
}
