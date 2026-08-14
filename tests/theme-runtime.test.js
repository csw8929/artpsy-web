// 테마 런타임 배선. 정본은 허브 20260814_phase2-테스트전략과-PR계획.md §6.2 와
// PR10-AMEND 다.
//
// 이 파일의 단언은 전부 정적이다. "이름이 맞다"까지만 말하고 "숫자로 읽힌다"는 브라우저가
// 판정한다 — PR-4 에서 "규칙이 파일에 있다 ≠ 적용된다", PR-5 에서 "속성이 마크업에 있다 ≠
// 발동한다"가 났고 여기가 세 번째 자리다.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const themeDir = new URL("../theme/artpsy/", import.meta.url);
const source = readFileSync(new URL("src/main.js", themeDir), "utf8");
const functionsPhp = readFileSync(new URL("functions.php", themeDir), "utf8");

const DURATION_VAR = "--wp--custom--motion--duration-slow";
// Phase 1 의 이름들. 테마에는 존재하지 않고, 없는 변수는 던지지 않고 빈 문자열을 돌려준다.
const PHASE1_VARS = ["--d-slow", "--d-fast", "--c-paper", "--s-4", "--measure", "--e-out"];

describe("테마 진입점", () => {
  it("base.css 를 import 하지 않는다 — 테마의 시각 값은 theme.json 과 style.css 다", () => {
    expect(source).not.toMatch(/import\s+["'].*base\.css["']/);
  });

  it(`지속 시간을 ${DURATION_VAR} 에서 읽는다`, () => {
    expect(source).toContain(DURATION_VAR);
  });

  for (const name of PHASE1_VARS) {
    it(`Phase 1 이름 ${name} 을 안 쓴다`, () => {
      // 이름이 틀리면 빈 문자열이 오고 parseFloat 이 NaN 이 된다. 던지지 않아서 안 보인다.
      expect(source).not.toContain(`"${name}"`);
    });
  }

  it("읽은 값을 Number.isFinite 로 검사한다 — NaN 을 그대로 쓰지 않는다", () => {
    expect(source).toMatch(/Number\.isFinite\(/);
  });

  it("숫자로 못 읽으면 폴백하고 경고한다 — 백지로 만들지 않는다", () => {
    expect(source).toMatch(/FALLBACK_DURATION_S/);
    expect(source).toMatch(/console\.warn/);
  });

  it("값이 초 단위라는 것이 코드 옆에 있다", () => {
    // parseFloat("0.9s") 가 0.9 이고 GSAP duration 도 초를 받는다. 값 자체는 단위를 안
    // 들고 오므로 ms 를 기대하는 코드가 생기면 1000배가 어긋난다 (PR10-AMEND §3).
    expect(source).toMatch(/초 단위/);
  });

  it("초기화 실패가 정적 상태로 내려간다 — .js 클래스만으로는 부족하다", () => {
    expect(source).toMatch(/classList\.remove\("js"\)/);
    expect(source).toMatch(/stopMotion\(\)/);
  });
});

describe("enqueue 배선", () => {
  it("프런트에 스크립트를 건다", () => {
    expect(functionsPhp).toMatch(/wp_enqueue_script\(/);
    expect(functionsPhp).toMatch(/get_theme_file_uri\(/);
  });

  it("defer 로 건다 — Phase 1 의 type=module 이 기본 defer 였다", () => {
    expect(functionsPhp).toMatch(/'strategy'\s*=>\s*'defer'/);
  });

  it("버전을 붙인다 — 파일명에 해시가 없어 캐시를 이것으로 깬다", () => {
    expect(functionsPhp).toMatch(/wp_get_theme\(\)->get\(\s*'Version'\s*\)/);
  });

  it("번들이 없으면 조용히 넘어가지 않는다", () => {
    expect(functionsPhp).toMatch(/file_exists\(/);
    expect(functionsPhp).toMatch(/build:theme/);
  });
});

describe("빌드 산출물", () => {
  const bundle = new URL("assets/main.js", themeDir);

  it("번들이 있다 — 커밋되지 않으면 테마가 정적으로 내려앉는다", () => {
    expect(existsSync(bundle)).toBe(true);
  });

  it("번들이 테마 변수명을 담는다 — 소스와 산출물이 갈리지 않았다", () => {
    expect(readFileSync(bundle, "utf8")).toContain(DURATION_VAR);
  });

  for (const name of PHASE1_VARS) {
    it(`번들에 Phase 1 이름 ${name} 이 없다`, () => {
      expect(readFileSync(bundle, "utf8")).not.toContain(name);
    });
  }

  it("CSS 를 같이 내보내지 않는다 — theme.json 과 두 벌이 되면 갈라진다", () => {
    const emitted = readdirSync(new URL("assets/", themeDir));
    expect(emitted.filter((name) => name.endsWith(".css"))).toEqual([]);
  });

  it("폰트 자산이 지워지지 않았다 — emptyOutDir 이 꺼져 있어야 한다", () => {
    expect(existsSync(new URL("assets/fonts/", themeDir))).toBe(true);
  });
});
