// language.js: "Is it really English?" The fastText language-score histogram.
// Mass piles up near 1.0; a hard filter sits at 0.65. Scroll highlights the
// confident spike, then the murky tail (code-heavy / multilingual / borderline pages).

import { COLOR } from "../config.js";
import { tip, fmtInt, fmtPct, box } from "../utils.js";

export function createLanguage(container, data) {
  const root = d3.select(container);
  root.selectAll("*").remove();
  const svg = root.append("svg").attr("class", "chart-svg");
  const g = svg.append("g");
  const M = { top: 18, right: 22, bottom: 46, left: 60 };
  const gx = g.append("g").attr("class", "axis x-axis");
  const gy = g.append("g").attr("class", "axis y-axis");
  const barLayer = g.append("g");
  const overlay = g.append("g");
  const xLab = g.append("text").attr("class", "axis-title");
  const yLab = g.append("text").attr("class", "axis-title");
  let highlight = "none"; // none | confident | tail

  const bins = data.counts.map((c, i) => ({ x0: data.edges[i], x1: data.edges[i + 1], c }));

  function render(animate) {
    const b = box(container);
    const W = b.w, H = b.h;
    if (W <= 0 || H <= 0) return;
    svg.attr("width", W).attr("height", H);
    g.attr("transform", `translate(${M.left},${M.top})`);
    const iw = W - M.left - M.right, ih = H - M.top - M.bottom;

    const x = d3.scaleLinear().domain([0.65, 1.0]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, d3.max(data.counts)]).nice().range([ih, 0]);
    const T = (s) => (animate ? s.transition().duration(600).ease(d3.easeCubicOut) : s);

    const bars = barLayer.selectAll("rect").data(bins, (d, i) => i);
    bars.join(
      (enter) => enter.append("rect")
        .on("mousemove", (e, bd) =>
          tip.show(`<b>score ${bd.x0.toFixed(3)}-${bd.x1.toFixed(3)}</b>
            <div class="t-row"><span>documents</span><b>${fmtInt(bd.c)}</b></div>`, e))
        .on("mouseleave", () => tip.hide()),
      (u) => u, (ex) => ex.remove()
    );
    T(barLayer.selectAll("rect"))
      .attr("x", (b) => x(b.x0) + 0.5)
      .attr("width", (b) => Math.max(0.6, x(b.x1) - x(b.x0) - 1))
      .attr("y", (b) => y(b.c))
      .attr("height", (b) => ih - y(b.c))
      .attr("fill", (b) => {
        if (highlight === "confident") return b.x0 >= 0.95 ? COLOR.green : "rgba(70,211,154,.25)";
        if (highlight === "tail") return b.x1 <= 0.95 ? COLOR.orange : "rgba(70,211,154,.25)";
        return COLOR.green;
      });

    T(gx.attr("transform", `translate(0,${ih})`)).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format(".2f")));
    T(gy).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("~s")));
    g.selectAll(".axis text").style("fill", COLOR.muted).style("font-size", "11px");
    g.selectAll(".axis line, .axis path").style("stroke", COLOR.line);

    xLab.attr("x", iw / 2).attr("y", ih + 38).attr("text-anchor", "middle")
      .style("fill", COLOR.muted).style("font-size", "12px").text("fastText English language score");
    yLab.attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -46)
      .attr("text-anchor", "middle").style("fill", COLOR.muted).style("font-size", "12px")
      .text("Number of documents");

    // filter threshold marker at 0.65 (left edge)
    let thr = overlay.selectAll(".thr").data([data.threshold]);
    thr = thr.join((enter) => {
      const grp = enter.append("g").attr("class", "thr");
      grp.append("line").attr("y1", 0).attr("y2", ih).attr("stroke", COLOR.red)
        .attr("stroke-width", 1.6).attr("stroke-dasharray", "5 4");
      grp.append("text").attr("y", 12).attr("fill", COLOR.red).style("font-size", "11px")
        .style("font-weight", 600).attr("text-anchor", "start").text("filter ≥ 0.65");
      return grp;
    });
    thr.select("line").attr("x1", x(0.65)).attr("x2", x(0.65));
    thr.select("text").attr("x", x(0.65) + 5);

    // annotation badge for confident fraction
    overlay.selectAll(".badge").data(highlight === "confident" ? [data.frac_ge["0.95"]] : [])
      .join(
        (enter) => enter.append("text").attr("class", "badge").attr("opacity", 0)
          .attr("text-anchor", "end").style("font-size", "13px").style("font-weight", 700)
          .style("fill", COLOR.green),
        (u) => u, (ex) => ex.remove()
      )
      .attr("x", iw - 6).attr("y", 16)
      .text((d) => `${fmtPct(d)} of docs score ≥ 0.95`)
      .transition().duration(500).attr("opacity", 1);
  }

  render(false);
  return {
    update(step) {
      highlight = step <= 0 ? "none" : step === 1 ? "confident" : "tail";
      render(true);
    },
    resize() { render(false); },
  };
}
