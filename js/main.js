// main.js: orchestrator. Loads the aggregates, fills the narrative stat slots,
// mounts each chart into its sticky container, and wires scroll → chart.update(step).

import { loadAll, fmtInt, fmtCompact, fmtPct, debounce } from "./utils.js";
import { setupScroller, revealOnScroll, scrollToId } from "./scroller.js";

import { createFunnel } from "./charts/funnel.js";
import { createDistribution } from "./charts/distribution.js";
import { createLanguage } from "./charts/language.js";
import { createTemporal } from "./charts/temporal.js";
import { createGalaxy } from "./charts/galaxy.js";
import { createConcentration } from "./charts/concentration.js";
import { createQuality } from "./charts/quality.js";

const FACTORIES = {
  funnel: (el, d) => createFunnel(el, d.funnel),
  distribution: (el, d) => createDistribution(el, d.tokenHist),
  language: (el, d) => createLanguage(el, d.langHist),
  temporal: (el, d) => createTemporal(el, { yearly: d.yearly, dumps: d.dumps }),
  galaxy: (el, d) => createGalaxy(el, d.domains),
  concentration: (el, d) => createConcentration(el, { lorenz: d.lorenz, cumulative: d.cumulative }),
  quality: (el, d) => createQuality(el, d.quality),
};

const instances = {};

function fillStats(d) {
  const STAT = {
    total_tokens: "15T",                       // full FineWeb (headline)
    subset_tokens: "10B",                       // this subset
    sample_docs: fmtInt(d.summary.sample_docs),
    n_dumps: d.summary.n_dumps,
    n_unique_domains: fmtInt(d.summary.n_unique_domains),
    median_tokens: fmtInt(d.summary.median_tokens),
    mean_tokens: fmtInt(Math.round(d.summary.mean_tokens)),
    gini: d.lorenz.gini.toFixed(3),
    frac95: fmtPct(d.summary.frac_lang_ge_095),
    year_min: d.summary.year_min,
    year_max: d.summary.year_max,
    cov25: fmtInt(d.cumulative.markers["0.25"]),
    cov50: fmtInt(d.cumulative.markers["0.50"]),
    cov90: fmtInt(d.cumulative.markers["0.90"]),
    chars_per_token: d.summary.median_chars_per_token,
    raw_tokens: "100T",
    final_tokens: "15T",
    removed_pct: "85%",
  };
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const key = el.dataset.stat;
    if (key in STAT) el.textContent = STAT[key];
  });
}

function mountCharts(d) {
  document.querySelectorAll(".scrolly[data-chart]").forEach((scrolly) => {
    const key = scrolly.dataset.chart;
    const holder = scrolly.querySelector(".chart-holder");
    if (holder && FACTORIES[key]) {
      try {
        instances[key] = FACTORIES[key](holder, d);
      } catch (err) {
        console.error(`Failed to mount chart "${key}"`, err);
      }
    }
  });
}

function wireNav() {
  // section nav dots
  const dots = document.querySelectorAll(".nav-dot");
  dots.forEach((dot) => dot.addEventListener("click", () => scrollToId(dot.dataset.target)));
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          dots.forEach((dt) => dt.classList.toggle("is-active", dt.dataset.target === e.target.id));
        }
      });
    },
    { rootMargin: "-50% 0px -50% 0px" }
  );
  sections.forEach((s) => navObs.observe(s));

  // scroll progress bar
  const bar = document.querySelector(".scroll-progress");
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.transform = `scaleX(${p})`;
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // hero "start" button
  const start = document.querySelector("[data-scroll-to]");
  if (start) start.addEventListener("click", () => scrollToId(start.dataset.scrollTo));
}

async function init() {
  const loader = document.getElementById("loader");
  try {
    const d = await loadAll();
    fillStats(d);
    mountCharts(d);
    wireNav();

    setupScroller((chart, step) => {
      const inst = instances[chart];
      if (inst && typeof inst.update === "function") inst.update(step);
    });
    revealOnScroll();

    window.addEventListener("resize", debounce(() => {
      Object.values(instances).forEach((i) => i.resize && i.resize());
    }, 160));

    if (loader) loader.classList.add("hidden");
  } catch (err) {
    console.error(err);
    if (loader) loader.innerHTML = `<div class="loader-err">Could not load the data.<br>
      <span>Serve the folder over HTTP (see README): opening index.html directly will block fetch().</span><br>
      <code>${err.message}</code></div>`;
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
