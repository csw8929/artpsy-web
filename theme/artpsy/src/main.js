// 테마 런타임. src/main.js 를 테마용으로 옮긴 것이고 두 벌이다 — src/ 는 Phase 1 트리라
// 기준선이 걸려 있어 건드리지 않는다. 폰트 자산이 두 벌인 것과 같은 자리이고, Phase 1 트리를
// 걷을 때 원본 자리가 정해진다.
//
// 원본과 다른 곳은 둘뿐이다.
//   1. base.css 를 import 하지 않는다 — 테마의 시각 값은 theme.json 과 style.css 가 정본이다
//   2. 지속 시간 토큰 이름이 테마 변수명이다 (아래)
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";


gsap.registerPlugin(ScrollTrigger);

// Phase 1 에서는 --d-slow 였다. 테마에서 그 이름은 존재하지 않고, 없는 변수는 던지지 않고
// 빈 문자열을 돌려준다 — parseFloat 이 NaN 을 받고 애니메이션만 조용히 이상해진다.
// 오타가 눈에 안 띄는 형태라 이름을 상수로 고정하고 읽은 값을 검사한다.
const DURATION_VAR = "--wp--custom--motion--duration-slow";

// 이 값은 초 단위다 (0.9s -> 0.9). GSAP duration 도 초를 받아서 맞는데, 값 자체는 단위를
// 들고 오지 않는다 — ms 를 기대하는 코드가 생기면 1000배가 어긋나고 NaN 처럼 눈에 띄지 않는다.
const FALLBACK_DURATION_S = 0.9;

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

// Marks that JS is driving the reveals. Without it the CSS keeps content
// visible, so a script failure degrades to a static page instead of a blank one.
document.documentElement.classList.add("js");

let lenis = null;
let lenisRaf = null;

/**
 * Lenis owns the scroll position and GSAP owns the clock. Letting both run
 * their own rAF loop makes ScrollTrigger read a stale position for one frame,
 * which shows up as jitter on pinned or parallaxed elements.
 */
function initSmoothScroll() {
  lenis = new Lenis({ autoRaf: false, lerp: 0.1 });
  lenisRaf = (time) => lenis.raf(time * 1000);

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);
}

/**
 * The browser's own hash jump would move scrollTop behind Lenis's back, so
 * in-page anchors have to go through Lenis instead. Delegated rather than
 * bound per link: Phase 2 generates these links from the CMS.
 */
function initAnchorScroll() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || !lenis) return;

    const hash = link.getAttribute("href");
    if (hash.length < 2) return;   // bare "#" is not a valid selector

    const target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    lenis.scrollTo(target);
  });
}

function initReveals() {
  const targets = gsap.utils.toArray("[data-reveal]");

  // Read once. Pulling this inside the loop would force a style recalc per
  // tween for a value that cannot change between them.
  const raw = getComputedStyle(document.documentElement).getPropertyValue(DURATION_VAR);
  const parsed = parseFloat(raw);

  // 백지로 만들지 않는다. 대신 조용히 넘어가지도 않는다 — 이름이 틀리면 여기서 말한다.
  const duration = Number.isFinite(parsed) ? parsed : FALLBACK_DURATION_S;
  if (!Number.isFinite(parsed)) {
    console.warn(`[artpsy] ${DURATION_VAR} 를 숫자로 읽지 못했다 (${JSON.stringify(raw)}). ${FALLBACK_DURATION_S}s 로 진행한다.`);
  }

  // One ScrollTrigger per element is fine at this page size; batch() is the
  // move once a page has dozens of them.
  targets.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration,
      // Must stay in step with --e-out in tokens.css. See the note there.
      ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}

function initHeroParallax() {
  const media = document.querySelector(".hero__media");
  if (!media) return;

  gsap.to(media, {
    // Coupled to `inset: -10% 0` on .hero__media (base.css). The media is 120%
    // of the hero, so 12% of its own height is 14.4% of the hero — more than
    // the 10% of headroom above it. It only stays hidden because that offset is
    // reached past 0.69 of the scrub, by which point the hero top is off
    // screen. Change any one of the three and a gap opens at the hero top.
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
      // Holding a compositor layer past the hero costs GPU memory for nothing.
      onToggle: (self) =>
        gsap.set(media, { willChange: self.isActive ? "transform" : "auto" }),
    },
  });
}

/**
 * Turning motion reduction on mid-visit has to take effect without a reload —
 * asking for one is close enough to ignoring the setting, and on this domain a
 * user reaching for it has usually already been made uncomfortable.
 *
 * The reverse direction is deliberately not handled: restoring motion is not
 * the safe direction, and supporting it would mean making init re-entrant.
 */
function stopMotion() {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
  // Killing the trigger does not stop a reveal that is already mid-flight; it
  // would keep animating past the gsap.set below and read as one last bounce.
  gsap.killTweensOf("[data-reveal]");

  if (lenis) {
    gsap.ticker.remove(lenisRaf);
    lenis.destroy();
    lenis = null;
  }

  gsap.set("[data-reveal]", { opacity: 1, y: 0 });
  gsap.set(".hero__media", { willChange: "auto" });
}

if (motionQuery.matches) {
  // No smooth scroll, no parallax. Reveals are already neutralised in CSS.
  gsap.set("[data-reveal]", { opacity: 1, y: 0 });
} else {
  try {
    initSmoothScroll();
    initAnchorScroll();
    initReveals();
    initHeroParallax();

    // Trigger positions are measured against the pre-swap layout; a webfont
    // landing later shifts the document height and leaves them stale.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  } catch (err) {
    // First, so the cause survives even if the teardown below throws too.
    console.error(err);
    // Dropping .js releases `.js [data-reveal] { opacity: 0 }` — but that alone
    // is not enough. Creating a scrollTrigger tween writes `opacity: 0` inline
    // on its target immediately, and inline beats the stylesheet, so every
    // element reached before the throw would stay hidden. stopMotion's
    // `gsap.set(..., {opacity: 1})` overwrites those inline values, which is
    // why the recovery reuses it rather than clearing props: clearProps would
    // leave the already-created triggers armed, and they would hide the
    // content again on scroll. This lands in the same state as the
    // reduced-motion path, so there is one failure state to test, not four.
    document.documentElement.classList.remove("js");
    stopMotion();
  }

  motionQuery.addEventListener("change", (event) => {
    if (event.matches) stopMotion();
  });
}
