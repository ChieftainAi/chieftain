// Canvas colour tokens.
//
// Everything drawn in CSS resolves through the :root block in styles.css. Canvas cannot, so
// this module reads those same custom properties once at load and hands them to the drawing
// code as plain strings. That keeps one source of truth: change a token in styles.css and the
// wheel, the reels, the curve and the candlesticks all follow.
//
// Only the canonical token names are read. The legacy felt-and-brass aliases are declared as
// `var(--accent)` chains, and getPropertyValue returns those unresolved, so asking for them
// here would hand canvas the literal string "var(--accent)". The fallbacks below are the
// same values the stylesheet ships with, used when there is no document at all (headless).
const FALLBACK = {
  bg: "#181818",
  surface1: "#212121",
  surface2: "#1d1d1d",
  surface3: "#292929",
  ink: "#f0f0f0",
  inkDim: "#b8b8b8",
  inkFaint: "#9a9a9a",
  accent: "#6366f1",
  accent2: "#6366f1",
  accentLit: "#818cf8",
  hot: "#d39a6a",
  hot2: "#c9a961",
  success: "#80b28d",
  successLit: "#9ac7a6",
  red: "#eb7485",
  redLit: "#f0919e",
  blue: "#7fb0cf",
  line: "#292929",
  line2: "#333333",
  metalLit: "#7a7a7a",
  metal: "#4a4a4a",
  metalDim: "#2e2e2e",
};

const VAR = {
  bg: "--bg", surface1: "--surface-1", surface2: "--surface-2", surface3: "--surface-3",
  ink: "--ink", inkDim: "--ink-dim", inkFaint: "--ink-faint",
  accent: "--accent", accent2: "--accent-2", accentLit: "--accent-lit",
  hot: "--hot", hot2: "--hot-2",
  success: "--success", successLit: "--success-lit",
  red: "--red", redLit: "--red-lit", blue: "--blue",
  line: "--line", line2: "--line-2",
  metalLit: "--metal-lit", metal: "--metal", metalDim: "--metal-dim",
};

function read() {
  const out = { ...FALLBACK };
  if (typeof document === "undefined" || !document.documentElement) return out;
  let cs;
  try { cs = getComputedStyle(document.documentElement); } catch { return out; }
  if (!cs) return out;
  for (const [key, name] of Object.entries(VAR)) {
    const v = (cs.getPropertyValue(name) || "").trim();
    // A value still containing var() never made it through the cascade; keep the fallback.
    if (v && !v.includes("var(")) out[key] = v;
  }
  return out;
}

export const C = read();

/** rgba() from any of the tokens above, for glows and washes. */
export function alpha(hex, a) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return `rgba(99,102,241,${a})`;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Mix two token colours, 0 = a, 1 = b. Used for metal and felt ramps. */
export function mix(a, b, t) {
  const pa = (a || "").replace("#", ""), pb = (b || "").replace("#", "");
  if (pa.length !== 6 || pb.length !== 6) return a;
  const na = parseInt(pa, 16), nb = parseInt(pb, 16);
  const ch = (sh) => Math.round((((na >> sh) & 255) * (1 - t)) + (((nb >> sh) & 255) * t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
