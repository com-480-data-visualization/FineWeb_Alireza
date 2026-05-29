// scroller.js — a tiny scrollytelling controller built on IntersectionObserver.
// No external dependency. Two pieces:
//   1. setupScroller(onActivate): fires when a `.step` crosses the viewport centre,
//      reporting which chart it belongs to and the step index.
//   2. revealOnScroll(): adds `.in-view` to `[data-reveal]` elements as they appear,
//      for lightweight fade-in animations (hero, section intros, outro).

/**
 * @param {(chart:string, step:number, el:HTMLElement)=>void} onActivate
 * Steps live in `.scrolly[data-chart]` blocks; each `.step[data-step]` triggers
 * when it overlaps a thin band at the vertical centre of the viewport.
 */
export function setupScroller(onActivate) {
  const steps = Array.from(document.querySelectorAll(".scrolly .step"));
  if (!steps.length) return null;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const step = e.target;
        const scrolly = step.closest(".scrolly");
        if (!scrolly) continue;
        const chart = scrolly.dataset.chart;
        const idx = +step.dataset.step;

        // single active step per scrolly block (for text styling)
        scrolly.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
        step.classList.add("is-active");

        onActivate(chart, idx, step);
      }
    },
    // a 0-height band at the vertical centre → exactly one active step
    { rootMargin: "-48% 0px -48% 0px", threshold: 0 }
  );

  steps.forEach((s) => observer.observe(s));
  return observer;
}

/** Fade-in `[data-reveal]` elements when they scroll into view (once). */
export function revealOnScroll() {
  const els = document.querySelectorAll("[data-reveal]");
  if (!els.length) return;
  const obs = new IntersectionObserver(
    (entries, o) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          o.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
  );
  els.forEach((el) => obs.observe(el));
}

/** Smooth-scroll to an element id (used by the "start" button + nav dots). */
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
