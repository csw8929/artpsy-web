// L3 — "보내면 남고, 안 보내야 할 것은 안 남는다". 이 프로젝트의 첫 L3 다.
//
// 여덟 판정이 전부 여기 있다 (PR7-FORM-PROCESS §5). 다섯은 **안 늘어나는 것**을 재는데,
// 그건 "아무 일도 안 일어남" 과 구분이 안 되므로 **유효한 제출이 실제로 늘리는 것**을
// 같은 회차에서 같이 잰다 — 그것이 없으면 이 검사는 전부 통과하면서 아무것도 안 잰다.
//
// wp-env 의 출력에 스피너·안내가 섞이므로 값은 전부 표식(`SENTINEL=...`)으로 받는다.
// 숫자를 정규식으로 주워 담으면 다음 버전의 안내 문구 하나에 조용히 틀린다.
import { execFileSync } from "node:child_process";

const BASE = process.env.WP_BASE_URL ?? "http://localhost:8888";
const CONTACT = `${BASE}/contact/`;

function evalPhp(php) {
  return execFileSync("wp-env", ["run", "cli", "wp", "eval", php], { encoding: "utf8" });
}

function sentinel(out, name) {
  const found = out.match(new RegExp(`${name}=([^\\s]*)`));
  if (!found) throw new Error(`${name} 을 못 읽었다.\n${out}`);
  return found[1];
}

function inquiryIds() {
  const out = evalPhp(
    `$ids = get_posts( array( 'post_type' => 'artpsy_inquiry', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids' ) ); echo "IDS=" . ( $ids ? implode( ",", $ids ) : "none" );`,
  );
  const raw = sentinel(out, "IDS");
  return raw === "none" ? [] : raw.split(",").map(Number);
}

async function formPage() {
  const res = await fetch(CONTACT);
  const body = await res.text();
  const nonce = body.match(/name="artpsy_contact_nonce"[^>]*value="([^"]+)"/);
  return { body, nonce: nonce ? nonce[1] : null };
}

async function submit(fields) {
  return fetch(CONTACT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ artpsy_contact: "1", ...fields }).toString(),
    redirect: "manual",
  });
}

const VALID = {
  artpsy_name: "스모크 확인",
  artpsy_email: "smoke@artpsy.example",
  artpsy_message: "이것은 smoke 가 만든 문의다. 끝나면 지운다.",
  artpsy_consent: "1",
};

export async function checkContactSubmission() {
  const failures = [];
  const before = inquiryIds();

  // 알림 훅 발동을 옵션으로 관측한다. 선언이 아니라 발동을 재려고 PR 2 가 깔아 둔 것이다.
  evalPhp(`delete_option( "artpsy_smoke_last_mail" ); echo "RESET=1";`);

  // ── 1. 폼과 nonce 가 응답에 있다 ────────────────────────────────────────
  const { nonce } = await formPage();
  if (!nonce) return ["/contact/ 에 nonce 가 없다 — 아래 판정이 전부 무의미해진다."];

  // ── 2·3. 유효한 제출 → 302 → 행이 하나 는다 ────────────────────────────
  const sent = await submit({ ...VALID, artpsy_contact_nonce: nonce });
  if (sent.status !== 302) {
    failures.push(`유효한 제출이 302 가 아니라 ${sent.status} 다 — 새로고침이 재전송이 된다.`);
  }

  const location = sent.headers.get("location") ?? "";
  if (!location.includes("artpsy_sent=1")) {
    failures.push(`리다이렉트가 성공 표식을 안 달았다: ${location || "(없음)"}`);
  }

  if (location) {
    const followed = await fetch(location);
    const body = await followed.text();
    if (!body.includes("contact-form__sent")) {
      failures.push("따라간 페이지에 성공 표식이 없다.");
    }
  }

  const afterValid = inquiryIds();
  const created = afterValid.filter((id) => !before.includes(id));

  if (created.length !== 1) {
    failures.push(`유효한 제출로 문의가 ${created.length}개 늘었다 — 정확히 1 이어야 한다.`);
  }

  // ── 3. 저장된 값이 보낸 것과 같다 ──────────────────────────────────────
  if (created.length === 1) {
    const id = created[0];
    const out = evalPhp(
      `$p = get_post( ${id} ); echo "TITLE=" . $p->post_title . " STATUS=" . $p->post_status . " EMAIL=" . get_post_meta( ${id}, "_artpsy_email", true ) . " BODY=" . ( false !== strpos( $p->post_content, "smoke 가 만든" ) ? "yes" : "no" );`,
    );
    if (sentinel(out, "TITLE") !== "스모크") {
      // 표식이 공백에서 끊기므로 앞부분만 본다. 이름 전체는 아래 BODY 로 대신 확인한다.
      failures.push(`저장된 제목이 보낸 이름과 다르다: ${sentinel(out, "TITLE")}`);
    }
    if (sentinel(out, "STATUS") !== "private") {
      failures.push(`저장된 문의가 private 이 아니다: ${sentinel(out, "STATUS")}`);
    }
    if (sentinel(out, "EMAIL") !== VALID.artpsy_email) {
      failures.push(`저장된 이메일이 다르다: ${sentinel(out, "EMAIL")}`);
    }
    if (sentinel(out, "BODY") !== "yes") {
      failures.push("저장된 본문이 보낸 내용과 다르다.");
    }
  }

  // ── 7. 알림 훅이 발동했다 ──────────────────────────────────────────────
  const mail = evalPhp(
    `$m = get_option( "artpsy_smoke_last_mail" ); echo "MAILED=" . ( $m ? "yes" : "no" );`,
  );
  if (sentinel(mail, "MAILED") !== "yes") {
    failures.push("pre_wp_mail 이 발동하지 않았다 — 알림이 조용히 안 나간 것이다.");
  }

  // ── 8. 저장된 문의가 밖에서 안 보인다 ──────────────────────────────────
  if (created.length === 1) {
    const id = created[0];
    const single = await fetch(`${BASE}/?p=${id}`, { redirect: "manual" });
    if (single.status !== 404) {
      failures.push(`/?p=${id} 가 ${single.status} 다 — 남의 개인정보가 URL 로 열린다.`);
    }

    const rest = await fetch(`${BASE}/wp-json/wp/v2/artpsy_inquiry`);
    if (rest.status !== 404) {
      failures.push(`REST 에 artpsy_inquiry 가 ${rest.status} 로 뜬다 — show_in_rest 가 안 먹었다.`);
    }
  }

  // ── 4·5·6. 안 늘어나야 하는 셋 ─────────────────────────────────────────
  const REJECTED = [
    ["nonce 없이", { ...VALID }],
    ["동의 없이", { ...VALID, artpsy_consent: "", artpsy_contact_nonce: nonce }],
    ["이메일이 틀린", { ...VALID, artpsy_email: "not-an-email", artpsy_contact_nonce: nonce }],
  ];

  let baseline = inquiryIds().length;

  for (const [label, fields] of REJECTED) {
    const res = await submit(fields);
    const body = await res.text();

    if (res.status === 302) {
      failures.push(`${label} 제출이 302 다 — 리다이렉트하면 입력을 잃는다.`);
    }

    const now = inquiryIds().length;
    if (now !== baseline) {
      failures.push(`${label} 제출로 문의가 ${now - baseline}개 늘었다 — 0 이어야 한다.`);
      baseline = now;
    }

    // 6 — 되그리기. 이름과 내용이 남아 있어야 한다. 동의는 일부러 안 되살린다.
    if (label === "이메일이 틀린") {
      if (!body.includes(VALID.artpsy_name)) {
        failures.push("되그린 폼에 이름이 안 남아 있다 — 긴 문의를 다시 쓰게 된다.");
      }
      if (!body.includes("smoke 가 만든")) {
        failures.push("되그린 폼에 문의 내용이 안 남아 있다.");
      }
      if (/id="artpsy-consent"[^>]*checked/.test(body)) {
        failures.push("되그린 폼이 동의를 되살렸다 — 동의는 매번 새로 받아야 한다.");
      }
    }
  }

  // ── 뒷정리. 이 검사가 만든 것만 지운다 ─────────────────────────────────
  const leftovers = inquiryIds().filter((id) => !before.includes(id));
  if (leftovers.length > 0) {
    evalPhp(
      leftovers.map((id) => `wp_delete_post( ${id}, true );`).join(" ") + ` echo "CLEANED=${leftovers.length}";`,
    );
  }

  const still = inquiryIds().filter((id) => !before.includes(id));
  if (still.length > 0) {
    failures.push(`smoke 가 만든 문의 ${still.length}개를 못 지웠다: ${still.join(",")}`);
  }

  if (failures.length === 0) {
    console.log("OK  문의 처리 — 저장 1 · 거절 3 · 알림 발동 · 밖에서 안 보임");
  }
  return failures;
}
