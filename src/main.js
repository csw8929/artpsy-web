import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./styles/base.css";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Marks that JS is driving the reveals. Without it the CSS keeps content
// visible, so a script failure degrades to a static page instead of a blank one.
document.documentElement.classList.add("js");

/**
 * Lenis owns the scroll position and GSAP owns the clock. Letting both run
 * their own rAF loop makes ScrollTrigger read a stale position for one frame,
 * which shows up as jitter on pinned or parallaxed elements.
 */
function initSmoothScroll() {
  const lenis = new Lenis({ autoRaf: false, lerp: 0.1 });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

function initReveals() {
  const targets = gsap.utils.toArray("[data-reveal]");

  // One ScrollTrigger per element is fine at this page size; batch() is the
  // move once a page has dozens of them.
  targets.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}

function initHeroParallax() {
  const media = document.querySelector(".hero__media");
  if (!media) return;

  gsap.to(media, {
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

if (reduceMotion) {
  // No smooth scroll, no parallax. Reveals are already neutralised in CSS.
  gsap.set("[data-reveal]", { opacity: 1, y: 0 });
} else {
  initSmoothScroll();
  initReveals();
  initHeroParallax();
}
