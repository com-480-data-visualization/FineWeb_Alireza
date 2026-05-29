// concentration.js: "a few domains rule them all." Two linked views of inequality:
//   • Lorenz curve of documents-per-domain with the Gini coefficient.
//   • Cumulative token coverage: how few domains it takes to reach 25/50/75/90% of tokens.
// Scroll moves between them; the user can also toggle. Hover reads off the exact share.

import { COLOR } from "../config.js";
import { tip, fmtInt, fmtPct, fmtPct0, box } from "../utils.js";

export function createConcentration(container, data) {
  const { lorenz, cumulative } = data;
  const root = d3.select(container);
  root.selectAll("*").remove();

  const controls = root.append("div").attr("class", "chart-controls");
  let mode = "lorenz"; // 'lorenz' | 'coverage'
  const btns = controls.selectAll("button").data([
    { key: "lorenz", label: "Lorenz curve" }, { key: "coverage", label: "Token coverage" },
  ]).join("button").attr("class", "ctrl-btn").classed("is-on", (d) => d.key === mode)
    .text((d) => d.label).on("click", (e, d) => { mode = d.key; btns.classed("is-on", x => x.key === mode); render(true); });

  const svg = root.append("svg").attr("class", "chart-svg");
  const g = svg.append("g");
  const M = { top: 22, right: 24, bottom: 52, left: 64 };
  const gx = g.append("g").attr("class", "axis x-axis");
  const gy = g.append("g").attr("class", "axis y-axis");
  const plot = g.append("g");
  const xLab = g.append("text").attr("class", "axis-title");
  const yLab = g.append("text").attr("class", "axis-title");
  const focus = g.append("g").style("pointer-events", "none").attr("opacity", 0);
  focus.append("circle").attr("r", 4.5).attr("fill", COLOR.yellow);
  focus.append("line").attr("class", "fx").attr("stroke", COLOR.yellow).attr("stroke-dasharray", "3 3").attr("stroke-opacity", .5);
  focus.append("line").attr("class", "fy").attr("stroke", COLOR.yellow).attr("stroke-dasharray", "3 3").attr("stroke-opacity", .5);

  function render(animate) {
    const b = box(container);
    const W = b.w, H = b.h;
    if (W <= 0 || H <= 0) return;
    svg.attr("width", W).attr("height", H);
    g.attr("transform", `translate(${M.left},${M.top})`);
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
    const T = (s) => (animate ? s.transition().duration(650).ease(d3.easeCubicOut) : s);
    plot.selectAll("*").interrupt();

    if (mode === "lorenz") renderLorenz(iw, ih, T);
    else renderCoverage(iw, ih, T);
  }

  function renderLorenz(iw, ih, T) {
    const x = d3.scaleLinear().domain([0, 1]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, 1]).range([ih, 0]);
    const line = d3.line().x((d) => x(d.x)).y((d) => y(d.y)).curve(d3.curveMonotoneX);
    const area = d3.area().x((d) => x(d.x)).y0((d) => y(d.x)).y1((d) => y(d.y)).curve(d3.curveMonotoneX);

    plot.selectAll(".cov").remove();
    // equality line
    let eq = plot.selectAll(".equality").data([0]);
    eq = eq.join((en) => en.append("line").attr("class", "equality"));
    eq.attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(1)).attr("y2", y(1))
      .attr("stroke", COLOR.muted).attr("stroke-dasharray", "4 4").attr("stroke-width", 1);
    // inequality area
    let ar = plot.selectAll(".lz-area").data([lorenz.points]);
    ar = ar.join((en) => en.append("path").attr("class", "lz-area").attr("fill", COLOR.blue).attr("opacity", 0.14));
    ar.attr("d", area);
    // lorenz curve
    let ln = plot.selectAll(".lz-line").data([lorenz.points]);
    ln = ln.join((en) => en.append("path").attr("class", "lz-line").attr("fill", "none")
      .attr("stroke", COLOR.blue).attr("stroke-width", 2.4));
    ln.attr("d", line);
    // gini label
    let gl = plot.selectAll(".gini").data([lorenz.gini]);
    gl = gl.join((en) => en.append("text").attr("class", "gini"));
    gl.attr("x", x(0.05)).attr("y", y(0.92)).style("fill", COLOR.blue).style("font-weight", 700)
      .style("font-size", "15px").text((d) => `Gini = ${d.toFixed(3)}`);

    T(gx.attr("transform", `translate(0,${ih})`)).call(d3.axisBottom(x).ticks(6).tickFormat(fmtPct0));
    T(gy).call(d3.axisLeft(y).ticks(6).tickFormat(fmtPct0));
    styleAxes();
    xLab.attr("x", iw / 2).attr("y", ih + 42).attr("text-anchor", "middle").text("Cumulative share of domains (smallest → largest)");
    yLab.attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -50).attr("text-anchor", "middle").text("Cumulative share of documents");

    // hover read-out
    const bis = d3.bisector((d) => d.x).left;
    svg.on("mousemove.lz", (e) => {
      const mx = d3.pointer(e, g.node())[0];
      const xv = x.invert(Math.max(0, Math.min(iw, mx)));
      const i = Math.max(1, Math.min(lorenz.points.length - 1, bis(lorenz.points, xv)));
      const p = lorenz.points[i];
      focus.attr("opacity", 1);
      focus.select("circle").attr("cx", x(p.x)).attr("cy", y(p.y));
      focus.select(".fx").attr("x1", x(p.x)).attr("x2", x(p.x)).attr("y1", y(p.y)).attr("y2", ih);
      focus.select(".fy").attr("x1", 0).attr("x2", x(p.x)).attr("y1", y(p.y)).attr("y2", y(p.y));
      tip.show(`<b>Bottom ${fmtPct0(p.x)} of domains</b>
        <div class="t-row"><span>hold just</span><b>${fmtPct(p.y)}</b></div>
        <div class="t-sub">of all documents</div>`, e);
    }).on("mouseleave.lz", () => { focus.attr("opacity", 0); tip.hide(); });
  }

  function renderCoverage(iw, ih, T) {
    svg.on("mousemove.lz", null).on("mouseleave.lz", null);
    focus.attr("opacity", 0);
    const pts = cumulative.points;
    const x = d3.scaleLog().domain([1, cumulative.n_domains]).range([0, iw]).clamp(true);
    const y = d3.scaleLinear().domain([0, 1]).range([ih, 0]);
    const line = d3.line().x((d) => x(d.rank)).y((d) => y(d.frac)).curve(d3.curveMonotoneX);

    plot.selectAll(".equality,.lz-area,.lz-line,.gini").remove();
    let ar = plot.selectAll(".cov.area").data([pts]);
    ar = ar.join((en) => en.append("path").attr("class", "cov area").attr("fill", COLOR.orange).attr("opacity", 0.13));
    ar.attr("d", d3.area().x((d) => x(d.rank)).y0(ih).y1((d) => y(d.frac)).curve(d3.curveMonotoneX));
    let ln = plot.selectAll(".cov.line").data([pts]);
    ln = ln.join((en) => en.append("path").attr("class", "cov line").attr("fill", "none")
      .attr("stroke", COLOR.orange).attr("stroke-width", 2.4));
    ln.attr("d", line);

    // marker lines for 25/50/75/90%
    const mk = Object.entries(cumulative.markers).map(([frac, rank]) => ({ frac: +frac, rank }));
    const ms = plot.selectAll("g.mk").data(mk, (d) => d.frac);
    const me = ms.enter().append("g").attr("class", "cov mk");
    me.append("line").attr("class", "mh");
    me.append("line").attr("class", "mv");
    me.append("circle").attr("r", 4).attr("fill", COLOR.yellow);
    me.append("text").attr("class", "mt");
    const all = plot.selectAll("g.mk");
    all.select(".mh").attr("x1", 0).attr("x2", (d) => x(d.rank)).attr("y1", (d) => y(d.frac)).attr("y2", (d) => y(d.frac))
      .attr("stroke", COLOR.yellow).attr("stroke-opacity", .35).attr("stroke-dasharray", "3 3");
    all.select(".mv").attr("x1", (d) => x(d.rank)).attr("x2", (d) => x(d.rank)).attr("y1", (d) => y(d.frac)).attr("y2", ih)
      .attr("stroke", COLOR.yellow).attr("stroke-opacity", .35).attr("stroke-dasharray", "3 3");
    all.select("circle").attr("cx", (d) => x(d.rank)).attr("cy", (d) => y(d.frac));
    all.select(".mt").attr("x", (d) => x(d.rank) + 7).attr("y", (d) => y(d.frac) - 7)
      .style("fill", COLOR.ink).style("font-size", "11px").style("font-weight", 600)
      .text((d) => `${fmtPct0(d.frac)} → ${fmtInt(d.rank)} domains`);

    T(gx.attr("transform", `translate(0,${ih})`)).call(d3.axisBottom(x).ticks(6, "~s"));
    T(gy).call(d3.axisLeft(y).ticks(6).tickFormat(fmtPct0));
    styleAxes();
    xLab.attr("x", iw / 2).attr("y", ih + 42).attr("text-anchor", "middle").text("Number of top domains (log scale)");
    yLab.attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -50).attr("text-anchor", "middle").text("Cumulative share of tokens");
  }

  function styleAxes() {
    g.selectAll(".axis text").style("fill", COLOR.muted).style("font-size", "11px");
    g.selectAll(".axis line, .axis path").style("stroke", COLOR.line);
    g.selectAll(".axis-title").style("fill", COLOR.muted).style("font-size", "12px");
  }

  render(false);
  return {
    update(step) { mode = step >= 2 ? "coverage" : "lorenz"; btns.classed("is-on", (d) => d.key === mode); render(true); },
    resize() { render(false); },
  };
}
