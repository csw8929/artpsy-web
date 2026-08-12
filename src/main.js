import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./styles/base.css";
import "./vitals.js";

gsap.registerPlugin(ScrollTrigger);

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
  const duration = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--d-slow"),
  );

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
