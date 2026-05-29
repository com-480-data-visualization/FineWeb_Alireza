// funnel.js: the FineWeb curation funnel: 100T raw Common Crawl distilled to 15T.
// Scroll reveals each filtering stage; the taper shows how much survives. Hovering a
// stage explains what it removes. This is the data-story's signature visual.

import { COLOR } from "../config.js";
import { tip, fmtPct, box } from "../utils.js";

export function createFunnel(container, data) {
  const stages = data.stages;
  const RAW = stages[0].tokens;
  const root = d3.select(container);
  let step = 0;
  let svg, g, defs, W, H;
  const M = { top: 28, right: 24, bottom: 20, left: 24 };

  root.selectAll("*").remove();
  svg = root.append("svg").attr("class", "chart-svg");
  defs = svg.append("defs");

  // vertical gradient blue→green across the funnel
  const grad = defs.append("linearGradient").attr("id", "funnelGrad")
    .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
  grad.append("stop").attr("offset", "0%").attr("stop-color", COLOR.blue);
  grad.append("stop").attr("offset", "55%").attr("stop-color", COLOR.teal);
  grad.append("stop").attr("offset", "100%").attr("stop-color", COLOR.green);

  g = svg.append("g");
  const sideLayer = g.append("g").attr("class", "funnel-sides");
  const barLayer = g.append("g").attr("class", "funnel-bars");
  const labLayer = g.append("g").attr("class", "funnel-labels");
  const annLayer = g.append("g").attr("class", "funnel-annotations");

  function render(animate) {
    const b = box(container);
    W = b.w; H = b.h;
    if (W <= 0 || H <= 0) return;
    svg.attr("width", W).attr("height", H);
    g.attr("transform", `translate(${M.left},${M.top})`);
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;

    const n = stages.length;
    const barH = Math.min(46, (ih / n) * 0.62);
    const gap = (ih - barH * n) / (n - 1);
    const yOf = (i) => i * (barH + gap) + barH / 2;
    const cx = iw / 2;
    const wScale = d3.scaleLinear().domain([0, RAW]).range([0, iw * 0.92]);
    const half = (i) => wScale(stages[i].tokens) / 2;
    const T = (sel) => (animate ? sel.transition().duration(650).ease(d3.easeCubicOut) : sel);

    // visibility driven by scroll step
    const visible = (i) => i <= step;

    // ── funnel sides (polygons connecting consecutive bars) ──
    const sideData = d3.range(n - 1).map((i) => ({
      i,
      pts: [
        [cx - half(i), yOf(i) + barH / 2],
        [cx + half(i), yOf(i) + barH / 2],
        [cx + half(i + 1), yOf(i + 1) - barH / 2],
        [cx - half(i + 1), yOf(i + 1) - barH / 2],
      ],
    }));
    const sides = sideLayer.selectAll("polygon").data(sideData, (d) => d.i);
    sides.join(
      (enter) => enter.append("polygon").attr("fill", "url(#funnelGrad)").attr("opacity", 0),
      (update) => update,
      (exit) => exit.remove()
    );
    T(sideLayer.selectAll("polygon"))
      .attr("points", (d) => d.pts.map((p) => p.join(",")).join(" "))
      .attr("opacity", (d) => (visible(d.i + 1) ? 0.16 : 0));

    // ── stage bars ──
    const bars = barLayer.selectAll("g.stage").data(stages, (d, i) => i);
    const barsEnter = bars.enter().append("g").attr("class", "stage")
      .style("cursor", "pointer")
      .on("mousemove", (e, d) => {
        const i = stages.indexOf(d);
        tip.show(
          `<b>${d.name}</b><div class="t-sub">${d.short}</div>
           <div class="t-row"><span>Tokens</span><b>${d.tokens}T</b></div>
           <div class="t-row"><span>of raw crawl</span><b>${fmtPct(d.tokens / RAW)}</b></div>
           ${i > 0 ? `<div class="t-row"><span>removed here</span><b style="color:${COLOR.red}">−${(stages[i - 1].tokens - d.tokens).toFixed(1)}T</b></div>` : ""}
           <div class="t-note">${d.note}</div>`,
          e
        );
      })
      .on("mouseleave", () => tip.hide());
    barsEnter.append("rect").attr("rx", 7);

    const allBars = barLayer.selectAll("g.stage");
    T(allBars).attr("opacity", (d, i) => (visible(i) ? 1 : 0))
      .attr("transform", (d, i) => `translate(0,${visible(i) ? 0 : 14})`);
    T(allBars.select("rect"))
      .attr("x", (d, i) => cx - half(i))
      .attr("y", (d, i) => yOf(i) - barH / 2)
      .attr("width", (d, i) => half(i) * 2)
      .attr("height", barH)
      .attr("fill", (d, i) => (i === n - 1 ? COLOR.green : "url(#funnelGrad)"))
      .attr("stroke", (d, i) => (i === n - 1 ? COLOR.green : "none"))
      .attr("stroke-width", 2)
      .style("filter", (d, i) => (i === n - 1 && visible(i) ? "drop-shadow(0 0 14px rgba(70,211,154,.55))" : "none"));

    // ── labels (name + token count) ──
    const labs = labLayer.selectAll("g.lab").data(stages, (d, i) => i);
    const labsEnter = labs.enter().append("g").attr("class", "lab").style("pointer-events", "none");
    labsEnter.append("text").attr("class", "f-name");
    labsEnter.append("text").attr("class", "f-tok");
    const allLabs = labLayer.selectAll("g.lab");
    allLabs.select(".f-name")
      .attr("x", cx).attr("y", (d, i) => yOf(i) - 2)
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .style("font-size", "13px").style("font-weight", 600).style("fill", COLOR.ink)
      .text((d) => d.name);
    allLabs.select(".f-tok")
      .attr("x", cx).attr("y", (d, i) => yOf(i) + 14)
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .style("font-size", "11px").style("fill", "rgba(255,255,255,.78)")
      .text((d) => `${d.tokens}T tokens`);
    T(allLabs).attr("opacity", (d, i) => (visible(i) ? 1 : 0));

    // ── removed-token annotations (right side) ──
    const annData = d3.range(1, n).map((i) => ({
      i, y: (yOf(i - 1) + yOf(i)) / 2,
      removed: stages[i - 1].tokens - stages[i].tokens,
    })).filter((d) => d.removed > 0.01);
    const anns = annLayer.selectAll("text").data(annData, (d) => d.i);
    anns.join(
      (enter) => enter.append("text").attr("opacity", 0)
        .attr("text-anchor", "start").style("font-size", "11px")
        .style("font-weight", 600).style("fill", COLOR.red),
      (u) => u, (ex) => ex.remove()
    );
    T(annLayer.selectAll("text"))
      .attr("x", iw - 4).attr("y", (d) => d.y)
      .attr("text-anchor", "end")
      .attr("opacity", (d) => (visible(d.i) ? 0.95 : 0))
      .text((d) => `−${d.removed.toFixed(1)}T`);
  }

  render(false);

  return {
    update(s) { step = Math.max(0, Math.min(stages.length - 1, s)); render(true); },
    resize() { render(false); },
  };
}
