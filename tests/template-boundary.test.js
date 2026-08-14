// templates/index.html 의 편집 경계와 정렬. 정본은 허브
// md/architect/20260814_phase2-편집경계-설계.md §3 과 매핑 §3.6-A 다.
//
// 섹션마다·덩어리마다 내려가서 단언한다. "몇 개 있다"로 세면 섹션 하나가 빠져도 안 죽는다
// (MyPrivate#6). 그래서 먼저 트리를 파싱하고, 이름으로 찾아 각각을 본다.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const markup = readFileSync(
  new URL("../theme/artpsy/templates/index.html", import.meta.url),
  "utf8",
);

/** 블록 주석을 중첩까지 살려서 트리로 읽는다. 어느 섹션의 것인지가 단언의 절반이다. */
function parseBlocks(source) {
  const pattern = /<!--\s*(\/)?wp:([a-z0-9/-]+)\s*(\{[\s\S]*?\})?\s*(\/)?-->/g;
  const root = { name: "root", attrs: {}, children: [] };
  const stack = [root];

  for (const match of source.matchAll(pattern)) {
    const [, closing, name, json, selfClosing] = match;
    if (closing) {
      stack.pop();
      continue;
    }
    const node = { name, attrs: json ? JSON.parse(json) : {}, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }

  expect(stack).toHaveLength(1); // 열고 닫힌 짝이 맞다
  return root;
}

const tree = parseBlocks(markup);

const classesOf = (node) => String(node.attrs.className ?? "").split(/\s+/).filter(Boolean);
const hasClass = (node, name) => classesOf(node).includes(name);

function walk(node, visit) {
  for (const child of node.children) {
    visit(child);
    walk(child, visit);
  }
}

function collect(predicate) {
  const found = [];
  walk(tree, (node) => {
    if (predicate(node)) found.push(node);
  });
  return found;
}

const sections = collect((node) => node.name === "group" && node.attrs.tagName === "section");
const sectionName = (node) => node.attrs.anchor ?? classesOf(node)[0] ?? "(이름 없음)";

describe("트리 골격", () => {
  it("섹션이 다섯이다 — 히어로 · PHILOSOPHY · 프로그램 · 저널 · CONTACT", () => {
    expect(sections.map(sectionName)).toEqual([
      "hero",
      "philosophy",
      "programs",
      "journal",
      "contact",
    ]);
  });

  it("모든 섹션이 main 안에 있다", () => {
    const main = tree.children.find((node) => node.attrs.tagName === "main");
    expect(main).toBeDefined();
    expect(main.children.filter((node) => node.attrs.tagName === "section")).toHaveLength(
      sections.length,
    );
  });
});

describe("섹션 잠금 (설계 §3) — 섹션마다 내려간다", () => {
  for (const section of sections) {
    it(`${sectionName(section)} 이 삭제·이동 금지다`, () => {
      expect(section.attrs.lock).toEqual({ move: true, remove: true });
    });
  }
});

describe("폭 사슬 (매핑 §3.6-A) — 조상이 좁으면 alignwide 가 무효다", () => {
  // main 이 constrained 라 align 없는 자식은 contentSize(34rem=544px)로 잘리고,
  // 그 안의 alignwide 는 544 를 기준으로 계산된다. 실측에서 h1 이 1440 에서 544px 였다.
  // Phase 1 의 .section 은 폭 제한이 없고 안쪽 .wrap(82rem)이 폭을 정한다 — 그 구조를 옮긴다.
  for (const section of sections) {
    it(`${sectionName(section)} 이 main 의 contentSize 를 벗어난다`, () => {
      expect(section.attrs.align).toBe("full");
    });
  }

  // 섹션의 직계 자식만 본다. 카드·저널 항목도 contentOnly 지만 그것들은 그리드 아이템이라
  // wide 가 아니어야 한다 — 처음에 전수로 잡았다가 그 다섯이 걸렸다.
  it("wrap 이 일곱이다 — 고정 덩어리 5 + 반복 영역 2", () => {
    expect(sections.flatMap((section) => section.children)).toHaveLength(7);
  });

  for (const section of sections) {
    for (const wrap of section.children) {
      const label = `${sectionName(section)}/${classesOf(wrap).join(".") || "contentOnly"}`;
      it(`${label} 이 wide 다 — 여기가 좁으면 안쪽 alignwide 가 따라 좁아진다`, () => {
        expect(wrap.attrs.align).toBe("wide");
      });
    }
  }
});

describe("고정 덩어리 (설계 §2.1-A) — 섹션마다 내려간다", () => {
  for (const section of sections) {
    const fixed = section.children.filter((node) => node.attrs.templateLock === "contentOnly");

    it(`${sectionName(section)} 에 contentOnly 덩어리가 있다`, () => {
      expect(fixed.length).toBeGreaterThan(0);
    });

    it(`${sectionName(section)} 의 고정 블록이 전부 순서 변경 금지다`, () => {
      // contentOnly 는 순서 변경을 막지 않는다 (설계 §2.3, tester 실측). lock 이 따로 필요하다.
      // 하나라도 빠지면 그 블록만 드래그된다 — 개수로 세면 안 잡힌다.
      const unlocked = fixed
        .flatMap((chunk) => chunk.children)
        .filter((node) => node.attrs.lock?.move !== true)
        .map((node) => `${node.name}(${classesOf(node).join(".") || "-"})`);
      expect(unlocked).toEqual([]);
    });
  }
});

describe("반복 영역 (설계 §3) — 영역마다 내려간다", () => {
  const repeats = collect((node) => hasClass(node, "grid"));

  it("반복 영역이 둘이다 — 프로그램 카드 · 저널", () => {
    expect(repeats).toHaveLength(2);
  });

  for (const area of repeats) {
    const label = classesOf(area).join(".");

    it(`${label} 이 allowedBlocks 로 받을 블록을 좁힌다`, () => {
      // 전역 필터만으로는 카드 목록에 문단이 들어가는 것을 못 막는다 (설계 §3.1).
      expect(area.attrs.allowedBlocks).toEqual(["core/group"]);
    });

    it(`${label} 자신은 잠기지 않는다 — 항목 추가·삭제가 A안의 존재 이유다`, () => {
      expect(area.attrs.templateLock).toBeUndefined();
      expect(area.attrs.lock).toBeUndefined();
    });

    it(`${label} 의 항목이 전부 contentOnly 다`, () => {
      const loose = area.children
        .filter((node) => node.attrs.templateLock !== "contentOnly")
        .map((node) => classesOf(node).join(".") || node.name);
      expect(loose).toEqual([]);
    });
  }
});

describe("align: wide (매핑 §3.6-A) — 제목마다 내려간다", () => {
  // contentSize 가 34rem 이라 명시하지 않으면 디스플레이 헤드라인도 34rem 에서 줄바꿈된다.
  // 한글 2줄 튜닝은 더 넓은 폭에서 맞춘 값이라 그대로 두면 3줄로 깨진다.
  const headings = collect((node) => node.name === "heading");
  const topLevel = headings.filter((node) => (node.attrs.level ?? 2) <= 2);

  it("h1·h2 가 다섯이다 — 섹션마다 하나", () => {
    expect(topLevel).toHaveLength(5);
  });

  for (const heading of topLevel) {
    const level = heading.attrs.level ?? 2;
    it(`h${level} "${heading.attrs.className ?? ""}" 에 align: wide 가 있다`, () => {
      expect(heading.attrs.align).toBe("wide");
    });
  }

  it("카드 안의 h3 에는 align 이 없다 — 읽기 폭을 따른다", () => {
    const cardHeadings = headings.filter((node) => node.attrs.level === 3);
    expect(cardHeadings.length).toBeGreaterThan(0);
    expect(cardHeadings.filter((node) => node.attrs.align !== undefined)).toEqual([]);
  });
});

describe("마크업과 HTML 이 어긋나지 않는다", () => {
  // 블록 속성과 직렬화된 HTML 이 다르면 에디터가 블록 검증에서 죽는다.
  it("anchor 를 선언한 섹션이 같은 id 를 내보낸다", () => {
    for (const section of sections) {
      if (!section.attrs.anchor) continue;
      expect(markup).toContain(`id="${section.attrs.anchor}"`);
    }
  });

  it("align: wide 를 선언한 제목이 alignwide 클래스를 내보낸다", () => {
    const wide = collect((node) => node.name === "heading" && node.attrs.align === "wide");
    expect(markup.match(/class="wp-block-heading alignwide/g) ?? []).toHaveLength(wide.length);
  });

  it("align: full 을 선언한 섹션이 alignfull 클래스를 내보낸다", () => {
    const full = sections.filter((node) => node.attrs.align === "full");
    expect(markup.match(/wp-block-group alignfull/g) ?? []).toHaveLength(full.length);
  });
});
