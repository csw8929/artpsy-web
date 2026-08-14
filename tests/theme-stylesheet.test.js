// theme/artpsy/style.css 계약. 매핑 §4.2 가 "theme.json 에 슬롯이 없다"로 판정한 것들이
// 실제로 여기 있는지 본다.
//
// 규칙마다 따로 단언한다. "몇 개 있다"로 세면 하나가 빠져도 안 죽는다 — PR-3 의 fontFace 가
// 정확히 그 모양이었다 (MyPrivate#6).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../theme/artpsy/style.css", import.meta.url), "utf8");
const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** 선언 블록의 본문을 꺼낸다. 공백 차이로 실패하지 않도록 접는다. */
function bodyOf(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = withoutComments.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

describe("테마 헤더", () => {
  it("Theme Name 이 있다 — 블록 테마의 필수 조건이다", () => {
    expect(css).toMatch(/^\/\*[\s\S]*Theme Name:\s*artpsy/m);
  });
});

describe("시트가 실릴 배선이 있다", () => {
  // 파일에 규칙이 있는 것과 규칙이 적용되는 것은 다르다. 아래 단언들은 전부 파일의 텍스트를
  // 보므로 그 차이를 못 잡는다 — 처음에 이 배선이 없어서 셋 다 통과하면서 하나도 발동하지
  // 않았다 (ARTPSY-68R). 정적으로 닫을 수 있는 것은 "거는 코드가 있는가"까지다.
  const functionsPhp = readFileSync(
    new URL("../theme/artpsy/functions.php", import.meta.url),
    "utf8",
  );

  it("프런트에 enqueue 한다 — 블록 테마라도 자동으로 걸리지 않는다", () => {
    expect(functionsPhp).toMatch(/wp_enqueue_scripts/);
    expect(functionsPhp).toMatch(/wp_enqueue_style\(\s*[\s\S]*get_stylesheet_uri\(\)/);
  });

  it("에디터 캔버스에도 건다 — .link·.grid 는 편집자가 보면서 고친다", () => {
    // PR-4 에서는 안 걸었다. 그 시트의 셋(Lenis·reveal 초기 상태·reduced-motion)은
    // 편집자가 에디터에서 볼 것이 아니었기 때문이다. .link 와 .grid 가 들어오면서
    // 기준이 뒤집혔다 — 캔버스와 프런트가 갈리면 잘못된 미리보기를 보고 카피를 다듬는다.
    //
    // 시트를 가르지 않는다. 프런트 전용 규칙은 캔버스에서 매칭할 것이 없다
    // (tester 실측: canvasHasJs false · matchesRule 0). 가르는 값이 그 무해함보다 크다.
    expect(functionsPhp).toMatch(/add_editor_style\(\s*'style\.css'\s*\)/);
  });
});

describe("Lenis 연동 (매핑 §4.2)", () => {
  // 선택자는 Lenis 가 붙이는 것이라 우리가 이름을 정하지 않는다. 바뀌면 연동이 끊긴다.
  it("html.lenis 의 height 가 auto 다", () => {
    expect(bodyOf("html.lenis body")).toMatch(/height:\s*auto/);
  });

  it("lenis-smooth 가 네이티브 스무스 스크롤을 끈다", () => {
    expect(bodyOf(".lenis.lenis-smooth")).toMatch(/scroll-behavior:\s*auto\s*!important/);
  });

  it("lenis-stopped 가 overflow 를 잠근다", () => {
    expect(bodyOf(".lenis.lenis-stopped")).toMatch(/overflow:\s*hidden/);
  });
});

describe("reveal 초기 상태 (매핑 §4.2)", () => {
  it(".js 가 붙었을 때만 숨긴다 — JS 실패가 백지가 되지 않게", () => {
    const body = bodyOf(".js [data-reveal]");
    expect(body).toMatch(/opacity:\s*0/);
  });

  it("이동 거리가 리터럴로 남아 있다 — 연출 튜닝 상수는 토큰화하지 않는다 (매핑 §4.4)", () => {
    expect(bodyOf(".js [data-reveal]")).toMatch(/transform:\s*translateY\(1\.25rem\)/);
  });
});

describe("모션 감소 (매핑 §4.2 · 프로젝트 CLAUDE.md)", () => {
  // theme.json 에 미디어쿼리 문법이 없어서 이 블록은 스타일시트 말고 갈 곳이 없다.
  // 심리상담 도메인이라 빠지면 안 된다.
  /**
   * 중첩 규칙이 있어서 정규식으로 끝 중괄호를 찾을 수 없다. 여는 중괄호부터 짝을 세어
   * 잘라낸다. 처음에 정규식으로 짰다가 이 블록을 통째로 못 찾았다.
   */
  function mediaBlock(condition) {
    const head = withoutComments.indexOf(condition);
    if (head === -1) return null;
    const open = withoutComments.indexOf("{", head);
    if (open === -1) return null;

    let depth = 0;
    for (let i = open; i < withoutComments.length; i += 1) {
      if (withoutComments[i] === "{") depth += 1;
      else if (withoutComments[i] === "}") {
        depth -= 1;
        if (depth === 0) return withoutComments.slice(open + 1, i);
      }
    }
    return null;
  }

  const block = mediaBlock("prefers-reduced-motion");

  it("블록이 존재한다", () => {
    expect(block).not.toBeNull();
  });

  it("reveal 을 보이는 상태로 되돌린다 — 없으면 콘텐츠가 숨은 채로 남는다", () => {
    expect(block).toMatch(/\.js \[data-reveal\][\s\S]*opacity:\s*1/);
    expect(block).toMatch(/\.js \[data-reveal\][\s\S]*transform:\s*none/);
  });

  it("전역 전환을 억제한다 — 없으면 다른 전환이 계속 돈다", () => {
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });
});

describe("토큰 참조", () => {
  it("모든 var() 참조가 --wp-- 변수다 — Phase 1 토큰 이름은 테마에 없다", () => {
    const refs = [...withoutComments.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]);
    const stale = refs.filter((name) => !name.startsWith("--wp--"));
    expect(stale).toEqual([]);
  });
});
