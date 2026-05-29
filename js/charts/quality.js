// quality.js — the quality landscape: a 2-D heatmap of language score × token count.
// Where do FineWeb's documents actually live? Scroll spotlights the dominant cell
// (confident, medium-length prose) and the short-document row where the classifier
// is least sure. Hover any cell for its exact count.

import { COLOR, HEAT } from "../config.js";
import { tip, fmtInt, fmtPct, box } from "../utils.js";

export function createQuality(container, data) {
  const root = d3.select(container);
  root.selectAll("*").remove();
  const svg = root.append("svg").attr("class", "chart-svg");
  const g = svg.append("g");
  const M = { top: 22, right: 26, bottom: 64, left: 96 };
  const cellLayer = g.append("g");
  const gx = g.append("g").attr("class", "axis x-axis");
  const gy = g.append("g").attr("class", "axis y-axis");
  const xLab = g.append("text").attr("class", "axis-title");
  const yLab = g.append("text").attr("class", "axis-title");
  let highlight = "none"; // none | peak | shortvar

  const total = d3.sum(data.grid.flat());
  const maxV = d3.max(data.grid.flat());
  // flatten into cells (row = lang bin, col = tok bin)
  const cells = [];
  data.grid.forEach((row, ri) => row.forEach((v, ci) => cells.push({ ri, ci, v })));
  // dominant cell
  const peak = cells.reduce((a, b) => (b.v > a.v ? b : a), cells[0]);

  const color = d3.scaleSequential().domain([0, Math.sqrt(maxV)]).interpolator(
    d3.scaleLinear().domain(d3.range(HEAT.length).map((i) => i / (HEAT.length - 1))).range(HEAT)
  );
  const colorOf = (v) => (v === 0 ? "#0e1422" : color(Math.sqrt(v)));

  function render(animate) {
    const b = box(container);
    const W = b.w, H = b.h;
    if (W <= 0 || H <= 0) return;
    svg.attr("width", W).attr("height", H);
    g.attr("transform", `translate(${M.left},${M.top})`);
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;

    const x = d3.scaleBand().domain(d3.range(data.tok_labels.length)).range([0, iw]).padding(0.06);
    const y = d3.scaleBand().domain(d3.range(data.lang_labels.length)).range([ih, 0]).padding(0.06);
    const T = (s) => (animate ? s.transition().duration(550) : s);

    const sel = cellLayer.selectAll("g.cell").data(cells, (d) => d.ri + "-" + d.ci);
    const enter = sel.enter().append("g").attr("class", "cell").style("cursor", "pointer")
      .on("mousemove", (e, d) =>
        tip.show(`<b>score ${data.lang_labels[d.ri]} · ${data.tok_labels[d.ci]} tok</b>
          <div class="t-row"><span>documents</span><b>${fmtInt(d.v)}</b></div>
          <div class="t-row"><span>share</span><b>${fmtPct(d.v / total)}</b></div>`, e))
      .on("mouseleave", () => tip.hide());
    enter.append("rect").attr("rx", 2);
    enter.append("text").attr("text-anchor", "middle").attr("dy", "0.34em");
    sel.exit().remove();

    const all = cellLayer.selectAll("g.cell");
    all.select("rect")
      .attr("x", (d) => x(d.ci)).attr("y", (d) => y(d.ri))
      .attr("width", x.bandwidth()).attr("height", y.bandwidth())
      .attr("fill", (d) => colorOf(d.v))
      .attr("stroke", (d) => isHi(d) ? COLOR.ink : "transparent").attr("stroke-width", 2);
    T(all).attr("opacity", (d) => (highlight === "none" || isHi(d) ? 1 : 0.25));
    all.select("text")
      .attr("x", (d) => x(d.ci) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.ri) + y.bandwidth() / 2)
      .style("font-size", Math.min(12, x.bandwidth() / 4.5) + "px")
      .style("fill", (d) => (d.v > maxV * 0.5 ? "#0a0e16" : "rgba(231,237,245,.8)"))
      .style("pointer-events", "none")
      .text((d) => (d.v > total * 0.004 ? d3.format("~s")(d.v) : ""));

    gx.attr("transform", `translate(0,${ih})`).call(
      d3.axisBottom(x).tickFormat((i) => data.tok_labels[i]));
    gx.selectAll("text").attr("transform", "rotate(-35)").style("text-anchor", "end");
    gy.call(d3.axisLeft(y).tickFormat((i) => data.lang_labels[i]));
    g.selectAll(".axis text").style("fill", COLOR.muted).style("font-size", "10.5px");
    g.selectAll(".axis line, .axis path").style("stroke", "transparent");

    xLab.attr("x", iw / 2).attr("y", ih + 54).attr("text-anchor", "middle")
      .style("fill", COLOR.muted).style("font-size", "12px").text("Token count bin");
    yLab.attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -82)
      .attr("text-anchor", "middle").style("fill", COLOR.muted).style("font-size", "12px")
      .text("Language-score bin");
  }

  function isHi(d) {
    if (highlight === "peak") return d.ri === peak.ri && d.ci === peak.ci;
    if (highlight === "shortvar") return d.ci === 0; // shortest-token column
    return false;
  }

  render(false);
  return {
    update(step) { highlight = step <= 0 ? "none" : step === 1 ? "peak" : "shortvar"; render(true); },
    resize() { render(false); },
  };
}
