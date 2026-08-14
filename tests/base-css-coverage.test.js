// base.css 전수 대조. src/styles/base.css 의 선택자가 하나도 빠짐없이 테마에서 처리됐는지 본다.
//
// 왜 코드로 내렸나: 같은 모양의 누락이 세 번 났다 (PR-6 · .hero__meta · .card h3). 셋 다
// **선택자 접두가 이미 이식돼 있어서 덮인 것으로 읽힌** 것이다 — `.card` 가 있으니 `.card h3`
// 도 있는 줄 알았다. 세 번을 사람 눈으로 잡았고 네 번째도 눈으로 잡겠다는 것은 계획이 아니다.
//
// 선언 단위까지 안 간다. 선택자 단위면 셋 다 잡힌다 — 그리고 선언 단위는 값 대조가 되어
// theme.json 이 정본인 값을 여기 두 벌로 적게 만든다.
//
// 이 테스트가 닫는 것은 "base.css 에 있는데 테마에서 아무도 안 봤다"뿐이다.
// "옮겼는데 값이 다르다"는 theme-stylesheet.test.js 가, "적용되는가"는 브라우저가 본다.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const baseCss = readFileSync(new URL("../src/styles/base.css", import.meta.url), "utf8");
const themeCss = readFileSync(new URL("../theme/artpsy/style.css", import.meta.url), "utf8");

/**
 * 선택자를 전부 뽑는다. 미디어쿼리 안쪽도 포함한다 — at-rule 은 기록하지 않고 내려간다.
 * 정규식으로 짜지 않는 이유는 theme-stylesheet.test.js 의 mediaBlock 과 같다: 중첩이 있어서
 * 끝 중괄호를 정규식으로 못 찾는다.
 *
 * 선택자 목록은 쉼표로 가른다. 묶는 방식은 표현이지 정체성이 아니다 — 테마가 `img, video` 를
 * 두 규칙으로 갈라 적어도 커버리지는 그대로다. 괄호 안의 쉼표(:is·:not)는 가르지 않는다.
 */
function selectors(css) {
  // 주석은 지우되 줄바꿈은 남긴다. 통째로 지우면 실패 메시지의 줄번호가 원본과 어긋나
  // (base.css:145 가 135 로 나왔다) 안내가 오히려 사람을 엉뚱한 줄로 보낸다.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "));
  const out = [];
  let buf = "";
  let bufStart = 0;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{" || ch === "}" || ch === ";") {
      const prelude = buf.trim();
      if (ch === "{" && prelude && !prelude.startsWith("@")) {
        const line = source.slice(0, bufStart).split("\n").length;
        for (const one of splitList(prelude)) out.push({ selector: one, line });
      }
      buf = "";
      bufStart = i + 1;
      continue;
    }
    if (!buf.trim()) bufStart = i;
    buf += ch;
  }
  return out;
}

function splitList(prelude) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of prelude) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((one) => one.replace(/\s+/g, " ").trim()).filter(Boolean);
}

// ② 이름이 바뀐 짝. 왼쪽이 base.css, 오른쪽이 테마의 선택자다.
const RENAMED = {
  ".journal__title": ".journal__item h3",
};

// ③ 옮길 것이 없는 것. **이유 없이는 못 들어간다** — 이유를 강제하는 것이 이 목록의 값이다.
// 목록에 있다는 것이 "옮겼다"는 뜻은 아니다. 사람이 내린 판정을 코드에 남겨 리뷰 대상으로
// 만드는 것까지가 여기서 되는 것이고, base.css 에 새 규칙이 생기면 목록에 없어서 반드시 터진다.
const UNNEEDED = {
  body: "styles.color·styles.typography 가 body 규칙으로 나온다",
  ".wrap": "settings.layout 의 contentSize/wideSize 와 useRootPaddingAwareAlignments 가 대신한다",
  ".section": "템플릿이 섹션마다 spacing|80 을 padding 으로 준다",
  p: "constrained 레이아웃이 폭을 정한다 — max-width 를 다시 걸면 둘이 싸운다",
  ".display": "styles.elements.h1 이 서체·크기·행간·자간을, styles.css 가 text-wrap: balance 를 낸다",
};

const baseSelectors = selectors(baseCss);
const themeSelectors = new Set(selectors(themeCss).map((one) => one.selector));
// 같은 선택자가 미디어쿼리 안팎에 두 번 나온다 (`*` · `.js [data-reveal]`). 첫 자리를 남긴다 —
// 실패 안내가 가리켜야 할 곳은 규칙이 정의된 자리이지 덮어쓰는 자리가 아니다.
const unique = [];
const seen = new Set();
for (const one of baseSelectors) {
  if (seen.has(one.selector)) continue;
  seen.add(one.selector);
  unique.push(one);
}

describe("base.css 전수 대조 (매핑 §4.2.0)", () => {
  // 파서가 조용히 빈 배열을 내면 아래 it 들이 통째로 사라지고 스위트는 초록으로 지나간다.
  // Phase 1 트리는 고정된 기준선이라 이 수는 움직이지 않는다 — 움직였다면 그것부터 볼 일이다.
  it("선택자를 실제로 뽑았다", () => {
    expect(unique).toHaveLength(34);
    expect(themeSelectors.size).toBeGreaterThan(20);
  });

  for (const { selector, line } of unique) {
    it(`${selector} (base.css:${line})`, () => {
      if (themeSelectors.has(selector)) return;
      if (selector in RENAMED) {
        expect(themeSelectors).toContain(RENAMED[selector]);
        return;
      }
      expect(
        UNNEEDED[selector],
        `base.css:${line} 의 "${selector}" 가 테마에 없다. ` +
          `이식했으면 theme/artpsy/style.css 에 넣고, 이름이 바뀌었으면 RENAMED 에, ` +
          `옮길 것이 없으면 UNNEEDED 에 이유와 함께 적는다.`,
      ).toBeTruthy();
    });
  }

  // 죽은 항목이 남으면 목록이 "일단 통과시키는 서랍"이 된다. 양쪽 다 base.css 에 근거가 있어야 한다.
  it("목록에 죽은 항목이 없다", () => {
    const known = new Set(unique.map((one) => one.selector));
    const orphans = [...Object.keys(RENAMED), ...Object.keys(UNNEEDED)].filter(
      (selector) => !known.has(selector),
    );
    expect(orphans).toEqual([]);
  });

  it("이식된 것이 UNNEEDED 에 들어가 있지 않다", () => {
    // 옮겨 놓고 이유까지 적어 두면 다음 사람이 그 이유를 믿고 지운다.
    const contradictory = Object.keys(UNNEEDED).filter((selector) => themeSelectors.has(selector));
    expect(contradictory).toEqual([]);
  });
});
