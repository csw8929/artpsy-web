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
  // derived 는 값이 같지 않고 유도된다. 여기서 빼되 조용히 빠지지 않게 아래에서 센다.
  const compared = Object.entries(TOKEN_MAP).filter(
    ([, entry]) => entry.bucket !== "X" && entry.path && !entry.derived,
  );

  it("유도 항목이 정확히 하나다 — 새로 생기면 유도 단언도 같이 생겨야 한다", () => {
    const derived = Object.entries(TOKEN_MAP)
      .filter(([, entry]) => entry.derived)
      .map(([token]) => token);
    expect(derived).toEqual(["--page-max"]);
  });

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

describe("유도 — wideSize (매핑 §3.6.2)", () => {
  // --page-max 는 .wrap 의 border-box max-width 라 거터를 포함한 바깥 폭이고,
  // wideSize 는 안쪽 폭이다. 같은 숫자를 넣으면 1280 이상에서 2×거터만큼 넓어진다
  // (tester 실측 1184 vs 1312).
  //
  // 82 − 2×4 = 74 가 성립하는 것은 wideSize 가 구속이 되는 구간에서 거터가 clamp 상한에
  // 고정되기 때문이다. 두 상수가 맞물린 결과라 --s-5 를 바꾸면 조용히 틀린다 —
  // 화면은 멀쩡히 뜨고 폭만 어긋난다. 그래서 유도를 여기서 다시 계산한다.
  const rem = (value) => {
    const match = String(value).trim().match(/^(-?[\d.]+)rem$/);
    if (!match) throw new Error(`rem 이 아니다: ${value}`);
    return Number.parseFloat(match[1]);
  };

  /** --gutter 의 clamp 세 번째 인자가 상한이다. 그 값이 참조하는 토큰을 되짚는다. */
  function gutterMaxRem() {
    const clamp = TOKENS["--gutter"].match(/^clamp\((.+)\)$/);
    expect(clamp, "--gutter 가 clamp 가 아니다").not.toBeNull();

    const upper = clamp[1].split(",").at(-1).trim();
    const ref = upper.match(/^var\(\s*(--[a-z0-9-]+)\s*\)$/);
    expect(ref, `--gutter 상한이 토큰 참조가 아니다: ${upper}`).not.toBeNull();

    return rem(TOKENS[ref[1]]);
  }

  it("유도식이 tokens.css 의 값에서 나온다", () => {
    expect(rem(TOKENS["--page-max"])).toBe(82);
    expect(gutterMaxRem()).toBe(4);
  });

  it("theme.json 의 wideSize 가 유도값과 같다", () => {
    const expected = rem(TOKENS["--page-max"]) - 2 * gutterMaxRem();
    expect(themeJson.settings.layout.wideSize).toBe(`${expected}rem`);
  });

  it("contentSize 는 --measure 그대로다 — 유도가 아니다", () => {
    // 읽기 폭은 바깥/안쪽 구분이 없다. 여기까지 유도로 만들면 없는 결합을 만든다.
    expect(themeJson.settings.layout.contentSize).toBe(TOKENS["--measure"]);
  });
});
