// temporal.js: the web through time. Documents/tokens/length across crawl years,
// with an optional zoom to all ~96 Common-Crawl snapshots. Scroll switches the metric;
// buttons let the reader explore freely. Recent years dominate the dataset.

import { COLOR } from "../config.js";
import { tip, fmtInt, fmtCompact, box } from "../utils.js";

export function createTemporal(container, data) {
  const { yearly, dumps } = data;
  const root = d3.select(container);
  root.selectAll("*").remove();

  const controls = root.append("div").attr("class", "chart-controls");
  const METRICS = [
    { key: "docs", label: "Documents", fmt: fmtCompact, color: COLOR.blue },
    { key: "tokens", label: "Tokens", fmt: fmtCompact, color: COLOR.orange },
    { key: "median_tokens", label: "Median length", fmt: fmtInt, color: COLOR.purple },
  ];
  let metric = "docs";
  let gran = "year"; // 'year' | 'dump'
  const mBtns = controls.selectAll("button.metric").data(METRICS).join("button")
    .attr("class", "ctrl-btn metric").classed("is-on", (d) => d.key === metric)
    .text((d) => d.label).on("click", (e, d) => { metric = d.key; sync(); render(true); });
  controls.append("span").attr("class", "ctrl-sep");
  const gBtns = controls.selectAll("button.gran").data([
    { key: "year", label: "By year" }, { key: "dump", label: "By snapshot" },
  ]).join("button").attr("class", "ctrl-btn gran").classed("is-on", (d) => d.key === gran)
    .text((d) => d.label).on("click", (e, d) => { gran = d.key; sync(); render(true); });

  function sync() {
    mBtns.classed("is-on", (d) => d.key === metric);
    gBtns.classed("is-on", (d) => d.key === gran);
  }

  const svg = root.append("svg").attr("class", "chart-svg");
  const g = svg.append("g");
  const M = { top: 18, right: 18, bottom: 64, left: 64 };
  const gx = g.append("g").attr("class", "axis x-axis");
  const gy = g.append("g").attr("class", "axis y-axis");
  const barLayer = g.append("g");
  const yLab = g.append("text").attr("class", "axis-title");

  function render(animate) {
    const b = box(container);
    const W = b.w, H = b.h;
    if (W <= 0 || H <= 0) return;
    svg.attr("width", W).attr("height", H);
    g.attr("transform", `translate(${M.left},${M.top})`);
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
    const m = METRICS.find((d) => d.key === metric);
    const rows = gran === "year" ? yearly : dumps;
    const keyOf = (d) => (gran === "year" ? String(d.year) : d.dump);

    const x = d3.scaleBand().domain(rows.map(keyOf)).range([0, iw]).padding(gran === "year" ? 0.18 : 0.12);
    const y = d3.scaleLinear().domain([0, d3.max(rows, (d) => d[metric])]).nice().range([ih, 0]);
    // colour: years get the metric colour; dumps shade by year (older→newer)
    const yrExtent = d3.extent(rows, (d) => d.year);
    const yrColor = d3.scaleSequential(d3.interpolateViridis).domain([yrExtent[0] - 1, yrExtent[1]]);
    const T = (s) => (animate ? s.transition().duration(650).ease(d3.easeCubicOut) : s);

    const bars = barLayer.selectAll("rect").data(rows, keyOf);
    bars.join(
      (enter) => enter.append("rect").attr("y", ih).attr("height", 0).attr("rx", gran === "year" ? 3 : 1)
        .on("mousemove", (e, d) => {
          const title = gran === "year" ? `Year ${d.year}` : d.dump;
          tip.show(`<b>${title}</b>
            <div class="t-row"><span>documents</span><b>${fmtInt(d.docs)}</b></div>
            <div class="t-row"><span>tokens</span><b>${fmtCompact(d.tokens)}</b></div>
            <div class="t-row"><span>median length</span><b>${fmtInt(d.median_tokens ?? d.mean_tokens)}</b></div>
            <div class="t-row"><span>mean lang score</span><b>${(d.mean_lang).toFixed(3)}</b></div>`, e);
        })
        .on("mouseleave", () => tip.hide()),
      (u) => u, (ex) => ex.remove()
    );
    T(barLayer.selectAll("rect"))
      .attr("x", (d) => x(keyOf(d)))
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(d[metric]))
      .attr("height", (d) => ih - y(d[metric]))
      .attr("fill", (d) => (gran === "year" ? m.color : yrColor(d.year)));

    // x axis: years show all; dumps show year boundaries only
    let xAxis = d3.axisBottom(x);
    if (gran === "dump") {
      const firstOfYear = {};
      rows.forEach((d) => { if (!(d.year in firstOfYear)) firstOfYear[d.year] = d.dump; });
      xAxis = d3.axisBottom(x).tickValues(Object.values(firstOfYear))
        .tickFormat((dn) => rows.find((r) => r.dump === dn).year);
    }
    T(gx.attr("transform", `translate(0,${ih})`)).call(xAxis);
    gx.selectAll("text").attr("transform", gran === "year" ? null : "rotate(-40)")
      .style("text-anchor", gran === "year" ? "middle" : "end");
    T(gy).call(d3.axisLeft(y).ticks(5).tickFormat(m.fmt));
    g.selectAll(".axis text").style("fill", COLOR.muted).style("font-size", gran === "dump" ? "9px" : "11px");
    g.selectAll(".axis line, .axis path").style("stroke", COLOR.line);

    yLab.attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -50)
      .attr("text-anchor", "middle").style("fill", COLOR.muted).style("font-size", "12px")
      .text(m.label + (metric === "median_tokens" ? " (tokens/doc)" : ""));
  }

  render(false);
  return {
    update(step) {
      // 0 docs/year · 1 tokens/year · 2 docs by snapshot
      if (step <= 0) { metric = "docs"; gran = "year"; }
      else if (step === 1) { metric = "tokens"; gran = "year"; }
      else { metric = "docs"; gran = "dump"; }
      sync(); render(true);
    },
    resize() { render(false); },
  };
}
