/**
 * Field-shaped instrumentation for the three budgets Phase 1 committed to.
 * web-vitals 6.x, attribution build — "slow" is not actionable on its own, so
 * the LCP element, the shifting element, and the interaction target are read
 * out alongside the numbers.
 *
 * Deliberately unconditional: no dev-only branch. A build that is measured and
 * a build that ships must be the same build, or the numbers describe something
 * nobody will ever load. Removing this belongs to the end of Phase 1.
 *
 * Values go to the console and to an on-screen overlay — the overlay is what
 * lets a run be evidenced with a single screenshot.
 */
import { onCLS, onINP, onLCP } from "web-vitals/attribution";

// The Phase 1 budgets (75th percentile). Field thresholds, applied here to a
// single lab run, so treat a pass as "not obviously broken", not as met.
const BUDGET = { LCP: 2500, INP: 200, CLS: 0.1 };

const overlay = document.createElement("div");
overlay.id = "vitals";
overlay.setAttribute("aria-hidden", "true");

// Styles live here rather than in base.css: this is instrumentation, not part
// of the design system, and none of it maps to theme.json in Phase 2. Fixed
// and pointer-events:none so it can neither shift layout nor absorb the clicks
// INP is trying to measure.
overlay.style.cssText = [
  "position:fixed",
  "left:0",
  "bottom:0",
  "z-index:9999",
  "pointer-events:none",
  "font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace",
  "background:rgba(20,18,15,0.86)",
  "color:#f7f5f2",
  "padding:8px 10px",
  "max-width:min(28rem,100vw)",
  "white-space:pre-wrap",
  "word-break:break-all",
].join(";");

const rows = new Map();

function render() {
  overlay.textContent = ["LCP", "INP", "CLS"]
    .map((name) => rows.get(name) ?? `${name}  —`)
    .join("\n");
}

function report(metric) {
  const attribution = metric.attribution ?? {};
  const isCLS = metric.name === "CLS";

  const value = isCLS ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`;
  const verdict = metric.value <= BUDGET[metric.name] ? "PASS" : "FAIL";

  let source;
  if (metric.name === "LCP") {
    source = attribution.url || attribution.target;
  } else if (isCLS) {
    source = attribution.largestShiftTarget;
  } else {
    source = attribution.interactionTarget;
  }

  rows.set(metric.name, `${metric.name}  ${value}  ${verdict}  ${source || "—"}`);
  render();

  console.log(`[vitals] ${metric.name} ${value} ${verdict} (${metric.rating})`, attribution);
}

// reportAllChanges: the overlay has to show a value as soon as one exists.
// Without it LCP and CLS only report when the page is hidden, which is after
// the screenshot has been taken.
const options = { reportAllChanges: true };
onLCP(report, options);
onINP(report, options);
onCLS(report, options);

render();
document.body.append(overlay);
