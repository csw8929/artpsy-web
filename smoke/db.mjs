// L3 헬퍼 — 자리만 만든다. 실제 단언은 PR 7(문의 폼 처리)이 붙인다 (PR2-SMOKE §3).
import { execFileSync } from "node:child_process";

export function dbQuery(sql) {
  return execFileSync("wp-env", ["run", "cli", "wp", "db", "query", sql, "--skip-column-names"], {
    encoding: "utf8",
  });
}

// 뮤플러그인이 pre_wp_mail 을 걸었는지만 본다 — 이 PR 에서 확인하는 전부다 (PR2-SMOKE §3).
export function muPluginLoaded() {
  const out = execFileSync(
    "wp-env",
    ["run", "cli", "wp", "eval", 'echo has_filter( "pre_wp_mail" ) ? "yes" : "no";'],
    { encoding: "utf8" },
  );
  return out.includes("yes");
}
