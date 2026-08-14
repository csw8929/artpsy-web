// @vitest-environment jsdom
//
// 이슈 #1 회귀 — 초기화가 중간에 죽었을 때 글이 사라지지 않는가.
//
// 재발하면 안 되는 것은 "`.js` 클래스가 안 떨어지는 것"이 아니다. GSAP 은 트윈을 만드는
// 순간 대상에 인라인 `opacity: 0` 을 쓰고 인라인은 스타일시트를 이긴다. 그래서 클래스만
// 떼면 던지기 전에 도달한 요소는 그대로 숨은 채로 남는다 — 37개 중 10개가 사라졌던 것이
// 그 모양이다 (`src/main.js:140-148`).
//
// 그래서 두 번째 단언(`stopMotion()` 이 실제로 돌았는가)이 이 파일의 본론이다.
// 첫 번째만 보면 이슈 #1 이 그대로 재발해도 통과한다.
//
// `main.js` 는 초기화를 모듈 최상위에서 돌리므로 import 이 곧 진입점이다. 프로덕션 코드에
// export 를 더하지 않는다 — 테스트를 위해 프로덕션을 고치는 것은 마지막 수단이고,
// 여기서는 필요가 없다.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { throwOnToCall: 0, toCalls: 0 };

  const applyVars = (selectorOrEl, vars) => {
    const targets =
      typeof selectorOrEl === "string"
        ? Array.from(document.querySelectorAll(selectorOrEl))
        : [selectorOrEl].filter(Boolean);
    for (const el of targets) {
      if (vars.opacity !== undefined) el.style.opacity = String(vars.opacity);
      if (vars.willChange !== undefined) el.style.willChange = String(vars.willChange);
    }
  };

  const gsap = {
    registerPlugin: vi.fn(),
    utils: { toArray: (selector) => Array.from(document.querySelectorAll(selector)) },
    // 실물처럼 트윈 생성 시점에 인라인 opacity: 0 을 쓴다. 이 한 줄이 없으면 이 파일은
    // 이슈 #1 을 재현하지 못한다 — 무엇을 복구해야 하는지가 사라지기 때문이다.
    to: vi.fn((target, vars) => {
      state.toCalls += 1;
      if (vars?.scrollTrigger) applyVars(target, { opacity: 0 });
      if (state.throwOnToCall && state.toCalls === state.throwOnToCall) {
        throw new Error("트윈 생성 실패 (주입)");
      }
    }),
    set: vi.fn((target, vars) => applyVars(target, vars)),
    killTweensOf: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
  };

  const ScrollTrigger = { getAll: vi.fn(() => []), update: vi.fn(), refresh: vi.fn() };

  class Lenis {
    constructor() { this.raf = vi.fn(); this.on = vi.fn(); this.destroy = vi.fn(); this.scrollTo = vi.fn(); }
  }

  return { state, gsap, ScrollTrigger, Lenis };
});

vi.mock("gsap", () => ({ default: mocks.gsap, gsap: mocks.gsap }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: mocks.ScrollTrigger }));
vi.mock("lenis", () => ({ default: mocks.Lenis }));

/** matchMedia 는 jsdom 에 없다. main.js:9 가 최상위에서 부르므로 없으면 거기서 죽는다. */
function stubMatchMedia(matches) {
  window.matchMedia = vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const revealOpacities = () =>
  Array.from(document.querySelectorAll("[data-reveal]")).map((el) => el.style.opacity);

beforeEach(() => {
  // 초기화가 import 부수효과라 모듈 캐시를 비우지 않으면 두 번째 테스트에서 아무 일도
  // 일어나지 않는다.
  vi.resetModules();
  vi.clearAllMocks();
  mocks.state.throwOnToCall = 0;
  mocks.state.toCalls = 0;

  document.documentElement.className = "";
  document.body.innerHTML = `
    <section class="hero"><img class="hero__media" /></section>
    <p data-reveal>하나</p>
    <p data-reveal>둘</p>
    <p data-reveal>셋</p>
  `;
  vi.spyOn(console, "error").mockImplementation(() => {});
  stubMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("초기화가 중간에 죽는 경로", () => {
  // 첫 요소는 성공하고 그다음에 던진다. 전부 실패하는 것보다 실제 사고에 가깝다 —
  // 이슈 #1 이 "37개 중 10개가 숨은 채"였다.
  const injectThrow = () => { mocks.state.throwOnToCall = 2; };

  it("js 클래스가 떨어진다", async () => {
    injectThrow();
    await import("../src/main.js");
    expect(document.documentElement.classList.contains("js")).toBe(false);
  });

  it("stopMotion 이 돈다 — gsap.set(..., opacity: 1) 이 불린다", async () => {
    injectThrow();
    await import("../src/main.js");
    expect(mocks.gsap.set).toHaveBeenCalledWith(
      "[data-reveal]",
      expect.objectContaining({ opacity: 1, y: 0 }),
    );
  });

  it("던지기 전에 도달한 요소가 숨은 채로 남지 않는다", async () => {
    // 위 단언의 효과를 DOM 으로 본다. 다만 이 테스트는 목이 실물 GSAP 처럼 트윈 생성 시점에
    // 인라인 opacity: 0 을 쓴다는 데 기댄다 — 실물 확인은 브라우저 하네스의 V-1 이다.
    injectThrow();
    await import("../src/main.js");
    expect(revealOpacities()).toEqual(["1", "1", "1"]);
  });

  it("원인이 콘솔에 남는다", async () => {
    injectThrow();
    await import("../src/main.js");
    expect(console.error).toHaveBeenCalled();
  });
});

describe("정상 경로", () => {
  it("js 클래스가 남아 있고 복구가 돌지 않는다", async () => {
    await import("../src/main.js");
    expect(document.documentElement.classList.contains("js")).toBe(true);
    expect(mocks.gsap.set).not.toHaveBeenCalledWith(
      "[data-reveal]",
      expect.objectContaining({ opacity: 1 }),
    );
    expect(console.error).not.toHaveBeenCalled();
  });

  it("reveal 마다 트윈이 하나씩 만들어진다 — 던질 기회가 실제로 있었다", async () => {
    // toArray 가 빈 배열을 돌려주면 위 주입은 아무것도 하지 않고, 실패 경로 테스트가
    // 통과하는 것처럼 보인다. 루프가 실제로 돌았다는 것을 여기서 고정한다.
    await import("../src/main.js");
    expect(mocks.state.toCalls).toBe(4); // reveal 3 + 히어로 패럴랙스 1
  });
});
