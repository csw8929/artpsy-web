// tokens.css ↔ theme.json 대조. 설계 §3.2 가 이 Phase 최대의 조용한 실패 후보로 꼽은 자리다.
// 두 파일이 갈라져도 화면은 멀쩡히 뜨고 톤만 무너지므로, 갈라지는 순간을 코드가 잡아야 한다.
//
//   ① tokens.css 의 모든 토큰이 매핑표에 있다 — 미분류는 실패
//   ② P·C 토큰의 값이 theme.json 의 해당 경로와 문자열로 같다
//   ③ styles.* 의 leaf 문자열이 var(--wp-- 를 최소 하나 포함한다
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TOKEN_MAP, cssVarOf } from "./token-map.js";

const themeJson = JSON.parse(
  readFileSync(new URL("../theme/artpsy/theme.json", import.meta.url), "utf8"),
);

/** tokens.css 의 :root 선언을 읽는다. 값이 여러 줄에 걸치는 것이 있어 공백을 접는다. */
function readTokens() {
  const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const tokens = {};
  for (const [, name, value] of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[name] = value.replace(/\s+/g, " ").trim();
  }
  return tokens;
}

const TOKENS = readTokens();

/** settings.color.palette[paper].color 형태의 경로를 따라간다. */
function valueAt(path) {
  let node = themeJson;
  for (const step of path.split(".")) {
    if (node == null) return undefined;
    const indexed = step.match(/^(\w+)\[([^\]]+)\]$/);
    if (indexed) {
      const list = node[indexed[1]];
      if (!Array.isArray(list)) return undefined;
      node = list.find((entry) => entry.slug === indexed[2]);
      continue;
    }
    node = node[step];
  }
  return node;
}

/**
 * tokens.css 의 값에 들어 있는 토큰 참조를 WP 변수 참조로 바꾼다.
 * --section-y 와 --gutter 가 다른 토큰을 참조하는 합성값이라 이것 없이는 ②가 성립하지 않는다.
 * 치환표는 만들지 않는다 — 매핑표에서 유도한다.
 */
function toWpVars(value) {
  return value.replace(/var\(\s*(--[a-z0-9-]+)\s*\)/g, (whole, token) => {
    const wpVar = cssVarOf(TOKEN_MAP[token]?.path);
    return wpVar ? `var(${wpVar})` : whole;
  });
}

describe("① tokens.css 의 모든 토큰이 매핑표에 있다", () => {
  it("미분류 토큰이 없다", () => {
    const unmapped = Object.keys(TOKENS).filter((token) => !(token in TOKEN_MAP));
    expect(unmapped).toEqual([]);
  });

  it("매핑표에 tokens.css 에 없는 토큰이 없다 — 표가 앞서가지 않는다", () => {
    const stale = Object.keys(TOKEN_MAP).filter((token) => !(token in TOKENS));
    expect(stale).toEqual([]);
  });

  it("모든 항목이 아는 버킷을 갖는다", () => {
    const buckets = Object.values(TOKEN_MAP).map((entry) => entry.bucket);
    expect(buckets.every((bucket) => ["P", "C", "S", "X"].includes(bucket))).toBe(true);
  });

  it("X 가 아닌 항목은 전부 path 를 갖는다", () => {
    const missing = Object.entries(TOKEN_MAP)
      .filter(([, entry]) => entry.bucket !== "X" && !entry.path)
      .map(([token]) => token);
    expect(missing).toEqual([]);
  });
});

describe("② 토큰 값이 theme.json 과 같다", () => {
  const compared = Object.entries(TOKEN_MAP).filter(
    ([, entry]) => entry.bucket !== "X" && entry.path,
  );

  for (const [token, entry] of compared) {
    const check = () => {
      expect(valueAt(entry.path)).toBe(toWpVars(TOKENS[token]));
    };
    // pending 은 매핑이 정해졌는데 theme.json 에 아직 없는 것이다. 조용히 빼면 없는 단언이
    // 되고, 그냥 실패로 두면 스위트가 빨간 채로 머지된다. it.fails 는 PR-3 이 채우는 순간
    // 초록이 되어 스위트를 깨뜨린다 — 그때 이 플래그를 지우는 것이 마지막 한 줄이다.
    (entry.pending ? it.fails : it)(`${token} → ${entry.path}`, check);
  }

  it("치환이 합성값을 실제로 바꾼다", () => {
    expect(toWpVars("clamp(var(--s-2), 5vw, var(--s-5))")).toBe(
      "clamp(var(--wp--preset--spacing--20), 5vw, var(--wp--preset--spacing--50))",
    );
  });

  it("목적지가 없는 토큰 참조는 그대로 둔다 — 조용히 지우지 않는다", () => {
    expect(toWpVars("var(--nope)")).toBe("var(--nope)");
  });
});

describe("③ styles 의 leaf 가 리터럴이 아니라 변수 참조다", () => {
  // 예외는 둘뿐이고 새로 만들지 않는다 (ARTPSY-58 §4.2).
  //   styles.css        — X 버킷. 한글 조판 규칙이고 애초에 CSS 텍스트라 var() 대상이 아니다
  //   *.fontWeight      — 토큰이 없다. 값이 하나뿐이고 §5.2 가 컨트롤을 잠가 고를 수 없다
  const EXCEPTIONS = [/^css$/, /\.fontWeight$/];

  function leaves(node, path = []) {
    if (typeof node === "string") return [[path.join("."), node]];
    if (node && typeof node === "object") {
      return Object.entries(node).flatMap(([key, child]) => leaves(child, [...path, key]));
    }
    return [];
  }

  const checked = leaves(themeJson.styles ?? {}).filter(
    ([path]) => !EXCEPTIONS.some((exception) => exception.test(path)),
  );

  it("검사 대상이 비어 있지 않다", () => {
    // 예외가 늘어나 대상이 0개가 되면 이 describe 는 아무것도 안 하면서 초록이 된다.
    expect(checked.length).toBeGreaterThan(0);
  });

  for (const [path, value] of checked) {
    it(`styles.${path}`, () => {
      expect(value).toMatch(/var\(--wp--/);
    });
  }

  it("예외가 정확히 둘이다", () => {
    expect(EXCEPTIONS).toHaveLength(2);
  });
});
