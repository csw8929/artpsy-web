// theme.json 계약 테스트. 설계 정본은 허브
// md/architect/20260814_phase2-테스트전략과-PR계획.md §3.1 이고,
// 잠금 목록의 정본은 md/architect/20260811_artpsy-theme-json-매핑.md §5.2 다.
//
// 값을 하나씩 하드코딩해 비교하지 않고 규칙을 단언한다. 프리셋이 늘어나도 규칙은 남아야
// 하기 때문이다. 예외는 slug 집합과 잠금 목록 — 그 둘은 "정확히 이것"이 곧 계약이다.
//
// 아직 이식되지 않은 것(PR-3)은 `it.fails`로 둔다. 조용히 빼면 없는 단언이 되고,
// 그냥 실패로 두면 스위트가 빨간 채로 머지된다. `it.fails`는 지금 실패하는 것을
// 기록하면서 **이식이 끝나는 순간 초록이 되어 스위트를 깨뜨린다** — 그때 `.fails`를
// 떼는 것이 PR-3의 마지막 한 줄이다.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const themeJson = JSON.parse(
  readFileSync(new URL("../theme/artpsy/theme.json", import.meta.url), "utf8"),
);

const settings = themeJson.settings ?? {};

/** 점 경로로 값을 꺼낸다. 없으면 undefined — 없는 것과 false 인 것을 구분하기 위해서다. */
function at(object, path) {
  return path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), object);
}

const slugsOf = (presets) => (presets ?? []).map((preset) => preset.slug);

describe("(a) 프리셋 개수와 slug 집합", () => {
  const cases = [
    { path: "color.palette", count: 5, slugs: ["paper", "ink", "ink-soft", "ink-faint", "accent"] },
    { path: "typography.fontSizes", count: 5, slugs: ["meta", "body", "lead", "heading", "display"] },
    { path: "spacing.spacingSizes", count: 8, slugs: ["10", "20", "30", "40", "50", "60", "70", "80"] },
  ];

  for (const { path, count, slugs } of cases) {
    it(`${path} 은 ${count} 개다`, () => {
      expect(at(settings, path)).toHaveLength(count);
    });

    it(`${path} 의 slug 집합이 정확히 일치한다`, () => {
      expect(slugsOf(at(settings, path)).sort()).toEqual([...slugs].sort());
    });
  }

  // PR-3 미이식. 설계 §5(다).
  it.fails("typography.fontFamilies 는 display·body 2개다", () => {
    const families = at(settings, "typography.fontFamilies");
    expect(families).toHaveLength(2);
    expect(slugsOf(families).sort()).toEqual(["body", "display"]);
  });
});

describe("(b) 크기 프리셋 순서", () => {
  // 배열 순서가 곧 편집자 화면의 순서다. fontSizes 는 WP 가 약칭(S·M·L…)까지 붙여서
  // 뒤집히면 `S` 를 눌러 가장 큰 글자가 나왔고(ARTPSY-41), spacingSizes 는 약칭이 없을
  // 뿐 표시 순서가 배열 순서인 것이 같다(ARTPSY-42).
  //
  // 규칙은 배열 이름이 아니라 값의 성질로 가른다 — 이름으로 갈랐다가 spacingSizes 가
  // 통째로 비어 있었다.
  //   ① 리터럴 값: 계산된 최소값 오름차순
  //   ② 합성 값(첫 인자가 다른 프리셋 참조): 배열 끝에 모인다. 서로의 순서는 묻지 않는다
  // 어느 쪽인지는 값 자신이 말하므로 슬러그를 적지 않는다. 다음 합성값이 생겨도 그대로 된다.
  const REM_PX = 16;

  const isComposite = (size) => /var\(\s*--wp--preset--/.test(String(size));

  /** clamp(a, b, c) 면 a 를, 단일값이면 그 값을 rem 수치로 정규화한다. */
  function minRem(size) {
    const clamped = String(size).match(/^clamp\(\s*([^,]+),/);
    const raw = (clamped ? clamped[1] : String(size)).trim();
    const numeric = Number.parseFloat(raw);
    if (Number.isNaN(numeric)) {
      throw new Error(`정규화할 수 없는 크기: ${size}`);
    }
    if (raw.endsWith("px")) return numeric / REM_PX;
    if (raw.endsWith("rem") || raw.endsWith("em")) return numeric;
    throw new Error(`rem·px 가 아닌 단위라 순서를 비교할 수 없다: ${size}`);
  }

  it("정규화가 clamp 와 단일값 양쪽을 다룬다", () => {
    expect(minRem("clamp(2.25rem, 5.2vw, 4.75rem)")).toBe(2.25);
    expect(minRem("1rem")).toBe(1);
    expect(minRem("16px")).toBe(1);
  });

  it("합성값 판별이 프리셋 참조만 잡는다", () => {
    expect(isComposite("clamp(var(--wp--preset--spacing--50), 12vh, var(--wp--preset--spacing--70))")).toBe(true);
    expect(isComposite("clamp(2.25rem, 5.2vw, 4.75rem)")).toBe(false);
    expect(isComposite("1rem")).toBe(false);
  });

  for (const path of ["typography.fontSizes", "spacing.spacingSizes"]) {
    describe(path, () => {
      const presets = at(settings, path) ?? [];
      const literals = presets.filter((preset) => !isComposite(preset.size));

      it("리터럴 프리셋이 작은 것부터 오름차순이다", () => {
        const mins = literals.map((preset) => minRem(preset.size));
        expect(mins).toEqual([...mins].sort((a, b) => a - b));
      });

      it("같은 크기가 둘 이상 없다 — 고를 때 구분되지 않는다", () => {
        const mins = literals.map((preset) => minRem(preset.size));
        expect(new Set(mins).size).toBe(mins.length);
      });

      it("합성값이 배열 끝에 모인다", () => {
        // 합성값이 램프 한가운데 끼면 컨트롤 가운데에 "섹션"이 뜬다. 제외만 하면
        // 그 배치가 통과해버리므로, 위치를 따로 단언한다.
        const flags = presets.map((preset) => isComposite(preset.size));
        const first = flags.indexOf(true);
        const tail = first === -1 ? [] : flags.slice(first);
        expect(tail.every(Boolean)).toBe(true);
      });
    });
  }
});

describe("(c) 잠금 목록 — 매핑 §5.2 전수 대조", () => {
  // §5.2 를 그대로 옮긴다. 전부 false 가 아니다 — padding·margin·blockGap 은 true 이고
  // (프리셋 선택은 허용), units 는 배열이다. "모두 false" 루프를 돌리면 여기서 틀린다.
  // §5.2 의 `border.*` 한 줄은 실제 키 넷으로 편다.
  const LOCKS = [
    ["color.custom", false],
    ["color.customGradient", false],
    ["color.customDuotone", false],
    ["color.defaultPalette", false],
    ["color.defaultGradients", false],
    ["color.defaultDuotone", false],

    ["typography.customFontSize", false],
    ["typography.defaultFontSizes", false],
    ["typography.fontStyle", false],
    ["typography.fontWeight", false],
    ["typography.lineHeight", false],
    ["typography.letterSpacing", false],
    ["typography.textTransform", false],
    ["typography.textDecoration", false],
    ["typography.dropCap", false],
    ["typography.fluid", false],

    ["spacing.customSpacingSize", false],
    ["spacing.defaultSpacingSizes", false],
    ["spacing.units", ["rem"]],
    ["spacing.padding", true],
    ["spacing.margin", true],
    ["spacing.blockGap", true],

    ["border.color", false],
    ["border.radius", false],
    ["border.style", false],
    ["border.width", false],
  ];

  for (const [path, expected] of LOCKS) {
    it(`${path} === ${JSON.stringify(expected)}`, () => {
      expect(at(settings, path)).toEqual(expected);
    });
  }

  it("목록이 조용히 줄어들지 않았다", () => {
    // §5.2 의 23줄에서 border.* 한 줄이 키 넷으로 펴진 수다. 이 수가 줄면 위 루프가
    // 도는 횟수도 같이 줄어 아무도 실패하지 않는다.
    expect(LOCKS).toHaveLength(26);
  });
});

describe("(d) 부재 단언", () => {
  it("appearanceTools 가 없다", () => {
    // 켜면 WP 버전이 편집 경계를 조용히 바꾼다 (매핑 원칙 3). false 로 적는 것도 아니고
    // 키 자체가 없어야 한다.
    expect("appearanceTools" in settings).toBe(false);
  });

  it("typography.fluid 가 false 다", () => {
    expect(at(settings, "typography.fluid")).toBe(false);
  });

  const DEFAULTS = [
    "color.defaultPalette",
    "color.defaultGradients",
    "color.defaultDuotone",
    "typography.defaultFontSizes",
    "spacing.defaultSpacingSizes",
  ];

  for (const path of DEFAULTS) {
    it(`${path} 가 false 다`, () => {
      expect(at(settings, path)).toBe(false);
    });
  }

  it("version 이 3 이다", () => {
    expect(themeJson.version).toBe(3);
  });

  it("$schema 가 있다", () => {
    expect(typeof themeJson.$schema).toBe("string");
    expect(themeJson.$schema.length).toBeGreaterThan(0);
  });
});

describe("(e) custom 변수 이름 유도", () => {
  // 매핑 §3.1 의 주의: custom.color.paperDeep 은 --wp--custom--color--paper-deep 으로
  // 나온다. 이 규칙이 사람 눈에만 있으면 paper_deep·paperdeep 오타가 조용히 지나간다.
  // WP 가 실제로 그 이름을 출력하는지는 재지 않는다 — §9 스파이크에서 확인된 규칙이고,
  // 매 커밋마다 wp-env 를 띄울 이유가 없다.
  const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

  function customVarNames(custom) {
    const names = [];
    for (const [group, entries] of Object.entries(custom ?? {})) {
      for (const key of Object.keys(entries ?? {})) {
        names.push(`--wp--custom--${kebab(group)}--${kebab(key)}`);
      }
    }
    return names.sort();
  }

  it("유도 함수가 camelCase 를 kebab-case 로 옮긴다", () => {
    expect(kebab("paperDeep")).toBe("paper-deep");
    expect(kebab("durationSlow")).toBe("duration-slow");
    expect(kebab("lineHeight")).toBe("line-height");
    expect(kebab("tight")).toBe("tight");
  });

  it("지금 들어 있는 custom 키가 기대한 변수명으로 유도된다", () => {
    expect(customVarNames(settings.custom)).toEqual([
      "--wp--custom--letter-spacing--display",
      "--wp--custom--line-height--normal",
      "--wp--custom--line-height--tight",
    ]);
  });

  // PR-3 미이식. 매핑 §6 골격 + 설계 §5(나) 의 C 버킷 판정을 합친 목표 집합이다.
  it.fails("이식이 끝나면 custom 이 목표 집합과 일치한다", () => {
    expect(customVarNames(settings.custom)).toEqual([
      "--wp--custom--color--line",
      "--wp--custom--color--paper-deep",
      "--wp--custom--font-size--card",
      "--wp--custom--letter-spacing--display",
      "--wp--custom--letter-spacing--heading",
      "--wp--custom--letter-spacing--meta",
      "--wp--custom--line-height--heading",
      "--wp--custom--line-height--normal",
      "--wp--custom--line-height--tight",
      "--wp--custom--motion--duration-fast",
      "--wp--custom--motion--duration-slow",
      "--wp--custom--motion--ease-out",
    ]);
  });
});
