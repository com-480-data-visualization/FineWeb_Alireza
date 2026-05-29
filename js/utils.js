// utils.js: small shared helpers: data loading, number formatting, a tooltip
// singleton, a responsive-redraw hook, and a debounce. No framework, just D3 + DOM.

/** Fetch + parse a JSON file from /data, with a helpful error. */
export async function loadJSON(name) {
  const res = await fetch(`data/${name}`);
  if (!res.ok) throw new Error(`Could not load data/${name} (${res.status})`);
  return res.json();
}

/** Load every dataset the site needs, in parallel. Returns a keyed object. */
export async function loadAll() {
  const files = {
    summary: "summary.json",
    funnel: "funnel.json",
    tokenHist: "token_hist.json",
    langHist: "lang_hist.json",
    yearly: "yearly.json",
    dumps: "dumps.json",
    domains: "domains.json",
    lorenz: "lorenz.json",
    cumulative: "cumulative_tokens.json",
    tld: "tld.json",
    quality: "quality_heatmap.json",
    charsPerToken: "chars_per_token.json",
    meta: "meta.json",
  };
  const entries = await Promise.all(
    Object.entries(files).map(async ([k, f]) => [k, await loadJSON(f)])
  );
  return Object.fromEntries(entries);
}

// ── number formatters ──────────────────────────────────────────────────────
export const fmtInt = d3.format(",");
export const fmtPct = d3.format(".1%");
export const fmtPct0 = d3.format(".0%");

/** Compact token/count formatter: 1_234_567 → "1.2M". */
export function fmtCompact(n) {
  if (n == null || isNaN(n)) return "n/a";
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}

// ── tooltip singleton ───────────────────────────────────────────────────────
let _tip;
function tipEl() {
  if (!_tip) {
    _tip = document.createElement("div");
    _tip.className = "tooltip";
    _tip.setAttribute("role", "status");
    document.body.appendChild(_tip);
  }
  return _tip;
}
export const tip = {
  show(html, event) {
    const el = tipEl();
    el.innerHTML = html;
    el.style.opacity = 1;
    this.move(event);
  },
  move(event) {
    const el = tipEl();
    const pad = 14;
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = event.clientX + pad, y = event.clientY + pad;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = event.clientY - h - pad;
    el.style.left = x + "px";
    el.style.top = y + "px";
  },
  hide() {
    if (_tip) _tip.style.opacity = 0;
  },
};

// ── misc ─────────────────────────────────────────────────────────────────────
export function debounce(fn, ms = 150) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/** Re-run `fn` (a draw function) whenever `el` resizes. Returns a disconnect fn. */
export function onResize(el, fn) {
  const ro = new ResizeObserver(debounce(() => fn(), 120));
  ro.observe(el);
  return () => ro.disconnect();
}

/** Measure a container's inner box (minus a small pad). */
export function box(el, pad = 0) {
  const r = el.getBoundingClientRect();
  return { w: Math.max(0, r.width - pad * 2), h: Math.max(0, r.height - pad * 2) };
}

/** Linear interpolation helper for scroll-driven values. */
export const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
