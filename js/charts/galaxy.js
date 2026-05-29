// galaxy.js: the Domain Galaxy. Every bubble is one of the most-crawled domains,
// sized by volume and coloured by what kind of site it is. Force-packed so it reads
// like a star field. Fully explorable: search to spotlight a domain, click a legend
// swatch to isolate a category, toggle whether size means documents or tokens.

import { COLOR, CATEGORY, CATEGORY_LABEL } from "../config.js";
import { tip, fmtInt, fmtCompact, box } from "../utils.js";

export function createGalaxy(container, data) {
  const nodes = data.top.map((d) => ({ ...d }));
  const root = d3.select(container);
  root.selectAll("*").remove();

  // ── controls: search + size toggle ──
  const controls = root.append("div").attr("class", "chart-controls");
  const search = controls.append("input").attr("class", "ctrl-input")
    .attr("type", "search").attr("placeholder", "search a domain…");
  controls.append("span").attr("class", "ctrl-sep");
  let sizeBy = "docs";
  const sBtns = controls.selectAll("button.size").data([
    { key: "docs", label: "size: documents" }, { key: "tokens", label: "size: tokens" },
  ]).join("button").attr("class", "ctrl-btn size").classed("is-on", (d) => d.key === sizeBy)
    .text((d) => d.label).on("click", (e, d) => { sizeBy = d.key; sBtns.classed("is-on", x => x.key === sizeBy); resize(); });

  const svg = root.append("svg").attr("class", "chart-svg");
  const linkLayer = svg.append("g");
  const nodeLayer = svg.append("g");

  // ── legend ──
  const legend = root.append("div").attr("class", "galaxy-legend");
  let activeCat = null;
  const cats = Array.from(new Set(nodes.map((d) => d.category)));
  legend.selectAll("div.lg").data(cats).join("div").attr("class", "lg")
    .each(function (c) {
      const el = d3.select(this);
      el.append("span").attr("class", "sw").style("background", CATEGORY[c] || COLOR.muted);
      el.append("span").text(CATEGORY_LABEL[c] || c);
    })
    .on("click", (e, c) => { activeCat = activeCat === c ? null : c; applyFocus(); legend.selectAll(".lg").classed("dim", (d) => activeCat && d !== activeCat); });

  let sim, r, W, H, colored = false, focusTop = false;

  function radiusScale() {
    const max = d3.max(nodes, (d) => d[sizeBy]);
    return d3.scaleSqrt().domain([0, max]).range([3, Math.min(54, (Math.min(W, H) || 400) / 9)]);
  }

  function resize() {
    const b = box(container);
    W = b.w; H = b.h;
    if (W <= 0 || H <= 0) return;
    svg.attr("width", W).attr("height", H);
    r = radiusScale();
    nodes.forEach((d) => (d.r = r(d[sizeBy])));

    if (sim) sim.stop();
    // centering forces + collision = a stable packed cluster (no charge: positive
    // many-body would collapse the cluster, negative would fight the centering).
    sim = d3.forceSimulation(nodes)
      .force("x", d3.forceX(W / 2).strength(0.05))
      .force("y", d3.forceY(H / 2).strength(0.07))
      .force("collide", d3.forceCollide((d) => d.r + 1.6).strength(0.9))
      .alpha(0.9).alphaDecay(0.026).on("tick", ticked);

    draw();
  }

  function draw() {
    const sel = nodeLayer.selectAll("g.node").data(nodes, (d) => d.domain);
    const enter = sel.enter().append("g").attr("class", "node").style("cursor", "pointer")
      .on("mousemove", (e, d) =>
        tip.show(`<b>${d.domain}</b><div class="t-sub">${CATEGORY_LABEL[d.category] || d.category} · .${d.tld}</div>
          <div class="t-row"><span>documents</span><b>${fmtInt(d.docs)}</b></div>
          <div class="t-row"><span>tokens</span><b>${fmtCompact(d.tokens)}</b></div>
          <div class="t-row"><span>median length</span><b>${fmtInt(d.median_tokens)} tok</b></div>`, e))
      .on("mouseleave", () => tip.hide());
    enter.append("circle");
    enter.append("text").attr("class", "node-label").attr("text-anchor", "middle").attr("dy", "0.34em");
    sel.exit().remove();

    nodeLayer.selectAll("g.node").select("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => (colored ? (CATEGORY[d.category] || COLOR.muted) : COLOR.blue))
      .attr("fill-opacity", 0.82)
      .attr("stroke", (d) => (colored ? (CATEGORY[d.category] || COLOR.muted) : COLOR.blue))
      .attr("stroke-opacity", 0.9).attr("stroke-width", 1);
    nodeLayer.selectAll("g.node").select("text.node-label")
      .style("fill", "#0a0e16").style("font-weight", 600)
      .style("font-size", (d) => Math.max(7, Math.min(13, d.r / 2.6)) + "px")
      .style("pointer-events", "none")
      .text((d) => (d.r > 22 ? d.domain.replace(/^www\.|\.(com|org|net|gov|edu)$/g, "") : ""));
    applyFocus();
  }

  function ticked() {
    nodeLayer.selectAll("g.node").attr("transform", (d) => {
      d.x = Math.max(d.r, Math.min(W - d.r, d.x));
      d.y = Math.max(d.r, Math.min(H - d.r, d.y));
      return `translate(${d.x},${d.y})`;
    });
  }

  function applyFocus() {
    const q = (search.property("value") || "").trim().toLowerCase();
    const ranked = focusTop ? nodes.slice().sort((a, b) => b[sizeBy] - a[sizeBy]).slice(0, 12) : null;
    const topSet = ranked ? new Set(ranked.map((d) => d.domain)) : null;
    nodeLayer.selectAll("g.node").each(function (d) {
      const matchSearch = !q || d.domain.toLowerCase().includes(q);
      const matchCat = !activeCat || d.category === activeCat;
      const matchTop = !topSet || topSet.has(d.domain);
      const on = matchSearch && matchCat && matchTop;
      d3.select(this).attr("opacity", on ? 1 : 0.12)
        .select("circle").attr("stroke-width", q && matchSearch && q.length > 1 ? 2.4 : 1);
    });
  }

  search.on("input", applyFocus);
  resize();

  return {
    update(step) {
      // 0 mono bubbles · 1 colour by category · 2 size by tokens · 3 spotlight giants
      colored = step >= 1;
      focusTop = step >= 3;
      const newSize = step >= 2 ? "tokens" : "docs";
      if (newSize !== sizeBy) { sizeBy = newSize; sBtns.classed("is-on", (d) => d.key === sizeBy); resize(); }
      else draw();
    },
    resize,
  };
}
