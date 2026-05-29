// distribution.js — how long is a web document? Token-count histogram with a
// linear↔log toggle. Scroll drives the narrative (linear → median → log → long tail);
// the user can also flip the scale manually with the buttons. Hover a bar for counts.

import { COLOR } from "../config.js";
import { tip, fmtInt, fmtCompact, box } from "../utils.js";

export function createDistribution(container, data) {
  const root = d3.select(container);
  root.selectAll("*").remove();

  // ── manual controls ──
  const controls = root.append("div").attr("class", "chart-controls");
  let mode = "linear";       // 'linear' | 'log'
  let highlight = "none";     // 'none' | 'median' | 'tail'
  const btnLin = controls.append("button").attr("class", "ctrl-btn is-on").text("Linear");
  const btnLog = controls.append("button").attr("class", "ctrl-btn").text("Log scale");
  btnLin.on("click", () => setMode("linear", true));
  btnLog.on("click", () => setMode("log", true));

  const svg = root.append("svg").attr("class", "chart-svg");
  const g = svg.append("g");
  const M = { top: 18, right: 20, bottom: 46, left: 60 };
  const gx = g.append("g").attr("class", "axis x-axis");
  const gy = g.append("g").attr("class", "axis y-axis");
  const barLayer = g.append("g");
  const overlay = g.append("g");
  const xLab = g.append("text").attr("class", "axis-title");
  const yLab = g.append("text").attr("class", "axis-title");

  function setMode(m, manual) {
    mode = m;
    btnLin.classed("is-on", m === "linear");
    btnLog.classed("is-on", m === "log");
    if (manual) highlight = "none";
    render(true);
  }

  function render(animate) {
    const b = box(container);
    const W = b.w, H = b.h;
    if (W <= 0 || H <= 0) return;
    svg.attr("width", W).attr("height", H);
    g.attr("transform", `translate(${M.left},${M.top})`);
    const iw = W - M.left - M.right;
    const ih = H - M.top - M.bottom;

    const d = data[mode];
    const edges = d.edges, counts = d.counts;
    const bins = counts.map((c, i) => ({ x0: edges[i], x1: edges[i + 1], c }));
    const maxC = d3.max(counts);

    const x = mode === "log"
      ? d3.scaleLog().domain([Math.max(1, edges[0]), edges[edges.length - 1]]).range([0, iw]).clamp(true)
      : d3.scaleLinear().domain([0, edges[edges.length - 1]]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, maxC]).nice().range([ih, 0]);

    const T = (sel) => (animate ? sel.transition().duration(600).ease(d3.easeCubicOut) : sel);

    // bars
    const bars = barLayer.selectAll("rect").data(bins, (b, i) => i);
    bars.join(
      (enter) => enter.append("rect").attr("y", ih).attr("height", 0)
        .attr("fill", COLOR.blue)
        .on("mousemove", (e, bd) => {
          const lbl = mode === "log"
            ? `${fmtCompact(bd.x0)}–${fmtCompact(bd.x1)} tokens`
            : `${Math.round(bd.x0)}–${Math.round(bd.x1)} tokens`;
          tip.show(`<b>${lbl}</b><div class="t-row"><span>documents</span><b>${fmtInt(bd.c)}</b></div>`, e);
        })
        .on("mouseleave", () => tip.hide()),
      (u) => u, (ex) => ex.remove()
    );
    T(barLayer.selectAll("rect"))
      .attr("x", (b) => x(Math.max(mode === "log" ? 1 : 0, b.x0)) + 0.5)
      .attr("width", (b) => Math.max(0.6, x(b.x1) - x(Math.max(mode === "log" ? 1 : 0, b.x0)) - 1))
      .attr("y", (b) => y(b.c))
      .attr("height", (b) => ih - y(b.c))
      .attr("fill", (b) => {
        if (highlight === "tail" && b.x0 >= 2000) return COLOR.orange;
        return mode === "log" ? COLOR.teal : COLOR.blue;
      });

    // axes
    const xAxis = mode === "log"
      ? d3.axisBottom(x).ticks(6, "~s")
      : d3.axisBottom(x).ticks(7).tickFormat(fmtCompact);
    T(gx.attr("transform", `translate(0,${ih})`)).call(xAxis);
    T(gy).call(d3.axisLeft(y).ticks(5).tickFormat(fmtCompact));
    styleAxes();

    xLab.attr("x", iw / 2).attr("y", ih + 38).attr("text-anchor", "middle")
      .text(mode === "log" ? "Token count per document (log scale)" : "Token count per document");
    yLab.attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -46)
      .attr("text-anchor", "middle").text("Number of documents");

    // median marker
    overlay.selectAll(".median-line").data(highlight === "median" || highlight === "tail" ? [data.median] : [])
      .join(
        (enter) => {
          const grp = enter.append("g").attr("class", "median-line").attr("opacity", 0);
          grp.append("line").attr("y1", 0).attr("y2", ih).attr("stroke", COLOR.red)
            .attr("stroke-width", 1.6).attr("stroke-dasharray", "5 4");
          grp.append("text").attr("y", -2).attr("fill", COLOR.red)
            .style("font-size", "11px").style("font-weight", 600).attr("text-anchor", "middle");
          return grp;
        },
        (u) => u, (ex) => ex.remove()
      );
    const ml = overlay.select(".median-line");
    if (!ml.empty()) {
      const mx = x(data.median);
      ml.select("line").attr("x1", mx).attr("x2", mx);
      ml.select("text").attr("x", mx).text(`median ${data.median}`);
      T(ml).attr("opacity", 1);
    }

    function styleAxes() {
      g.selectAll(".axis text").style("fill", COLOR.muted).style("font-size", "11px");
      g.selectAll(".axis line, .axis path").style("stroke", COLOR.line);
      g.selectAll(".axis-title").style("fill", COLOR.muted).style("font-size", "12px");
    }
  }

  render(false);

  return {
    update(step) {
      // 0 linear · 1 linear+median · 2 log · 3 log+tail
      if (step <= 0) { mode = "linear"; highlight = "none"; }
      else if (step === 1) { mode = "linear"; highlight = "median"; }
      else if (step === 2) { mode = "log"; highlight = "none"; }
      else { mode = "log"; highlight = "tail"; }
      btnLin.classed("is-on", mode === "linear");
      btnLog.classed("is-on", mode === "log");
      render(true);
    },
    resize() { render(false); },
  };
}
