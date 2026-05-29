// config.js: shared constants for the "Decanting the Web" visualization.
// One source of truth for colours, fonts and layout so the charts stay coherent.

export const COLOR = {
  bg: "#0a0e16",
  panel: "#121826",
  panelHi: "#18202f",
  ink: "#e7edf5",
  muted: "#8a96a8",
  line: "#1f2a3a",
  grid: "#202b3d",
  // accents (tuned for a dark canvas)
  blue: "#5b9bff",
  orange: "#ff9f45",
  green: "#46d39a",
  purple: "#b98cff",
  teal: "#37c9d6",
  red: "#ff6b6b",
  yellow: "#ffd166",
  pink: "#ff7eb6",
};

// Domain categories → colour (used by the Domain Galaxy + TLD legend).
export const CATEGORY = {
  reference: "#5b9bff",
  news: "#ff6b6b",
  tech: "#37c9d6",
  blog: "#ff9f45",
  social: "#b98cff",
  commerce: "#ffd166",
  gov: "#46d39a",
  edu: "#7ee787",
  academic: "#ff7eb6",
  other: "#8a96a8",
};

export const CATEGORY_LABEL = {
  reference: "Reference / wiki",
  news: "News & media",
  tech: "Tech & software",
  blog: "Blogs & CMS",
  social: "Social & forums",
  commerce: "Commerce",
  gov: "Government",
  edu: "Education",
  academic: "Academic / journals",
  other: "Other",
};

// Sequential ramp for heatmaps (dark-friendly: deep navy → warm).
export const HEAT = ["#101826", "#163a52", "#1f6b6e", "#4fa05a", "#c8c84a", "#ff9f45", "#ff6b6b"];

export const FONT = {
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
};
