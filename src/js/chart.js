// Candlestick and price-chart rendering for the chart-literacy tiers.
//
// Two rules this module is built around.
//
// First, every series is generated from a SEEDED generator, so a given spec always draws the
// identical chart. A check question that asks "what is the drawdown here" would be worthless
// if the chart were different on every render, and the answer is computed from the same data
// the player is looking at rather than stored beside it.
//
// Second, the underlying process is an honest random walk with an optional drift. There is no
// hand-drawn head-and-shoulders anywhere in here. When tier five says the patterns are mostly
// in you, it can only say that truthfully if the charts really are coin flips — so they are,
// and the player is invited to find the textbook formations in them, which they will.
import { C, alpha } from "./theme.js";

const UP = C.successLit;
const DOWN = C.redLit;
const GRID = "rgba(255,255,255,0.07)";
const AXIS = C.inkFaint;
const INK = C.inkDim;
const BRASS = C.accent;
const BRASS_LIT = C.accentLit;
const BLUE = C.blue;

/** Deterministic PRNG, so a spec and its chart are the same thing every time. */
export function rng(seed) {
  let a = (seed | 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gaussFrom = (r) => {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/**
 * An OHLC series from a geometric random walk. Each bar is built from a handful of intra-bar
 * ticks, so the high and low are genuinely the extremes of a path rather than invented padding
 * around the close — which is what makes the wicks mean anything.
 */
export function ohlc({ seed = 1, bars = 40, drift = 0, vol = 0.015, start = 100,
                       gapAt = null, gapBy = 0, volSeries = null } = {}) {
  const r = rng(seed);
  const out = [];
  let price = start;
  for (let i = 0; i < bars; i++) {
    if (gapAt !== null && i === gapAt) price *= 1 + gapBy;
    const o = price;
    const stepVol = volSeries ? volSeries(i, vol) : vol;
    let hi = o, lo = o, p = o;
    const ticks = 6;
    for (let k = 0; k < ticks; k++) {
      p *= 1 + drift / ticks + gaussFrom(r) * (stepVol / Math.sqrt(ticks));
      hi = Math.max(hi, p);
      lo = Math.min(lo, p);
    }
    const c = p;
    // Volume rises with the size of the move, which is the real empirical relationship.
    const move = Math.abs(c / o - 1);
    const v = (0.55 + r() * 0.5 + move / Math.max(stepVol, 1e-6) * 0.22);
    out.push({ o, h: hi, l: lo, c, v, gap: gapAt !== null && i === gapAt });
    price = c;
  }
  return out;
}

export function sma(data, n, key = "c") {
  return data.map((_, i) => {
    if (i < n - 1) return null;
    let s = 0;
    for (let k = i - n + 1; k <= i; k++) s += data[k][key];
    return s / n;
  });
}

/** Peak-to-trough fall from the running high, as a positive fraction. */
export function maxDrawdown(closes) {
  let peak = -Infinity, worst = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    worst = Math.max(worst, (peak - c) / peak);
  }
  return worst;
}

/** Annualised-ish realized volatility from closes, in percent per bar. */
export function realizedVol(closes) {
  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const varr = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  return Math.sqrt(varr);
}

// ---------------------------------------------------------------- canvas plumbing

function setup(canvas, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 520;
  const height = h || Math.round(w * 0.52);
  canvas.style.height = height + "px";
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;                    // no canvas (headless) — callers degrade quietly
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, height);
  return { ctx, w, h: height };
}

const font = (ctx, size, weight = 400) => {
  ctx.font = `${weight} ${size}px "JetBrains Mono", ui-monospace, monospace`;
};

function frame(ctx, box, { yLo, yHi, log = false, ticks = 4, fmtY = (v) => v.toFixed(0) }) {
  const { x, y, w, h } = box;
  const t = (v) => (log ? Math.log(v) : v);
  const lo = t(yLo), hi = t(yHi);
  const py = (v) => y + h - ((t(v) - lo) / (hi - lo || 1)) * h;

  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  font(ctx, 9);
  ctx.fillStyle = AXIS;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= ticks; i++) {
    const frac = i / ticks;
    const val = log ? Math.exp(lo + frac * (hi - lo)) : yLo + frac * (yHi - yLo);
    const yy = Math.round(py(val)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    ctx.fillText(fmtY(val), x + w + 6, yy);
  }
  return py;
}

function candles(ctx, data, box, py, { width } = {}) {
  const bw = width || (box.w / data.length) * 0.66;
  data.forEach((d, i) => {
    const cx = box.x + ((i + 0.5) / data.length) * box.w;
    const up = d.c >= d.o;
    ctx.strokeStyle = up ? UP : DOWN;
    ctx.fillStyle = up ? alpha(C.successLit, 0.3) : alpha(C.redLit, 0.32);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(cx) + 0.5, py(d.h));
    ctx.lineTo(Math.round(cx) + 0.5, py(d.l));
    ctx.stroke();
    const top = py(Math.max(d.o, d.c));
    const bot = py(Math.min(d.o, d.c));
    ctx.beginPath();
    ctx.rect(cx - bw / 2, top, bw, Math.max(1, bot - top));
    ctx.fill();
    ctx.stroke();
  });
}

function line(ctx, values, box, py, color, lw = 1.5) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  let started = false;
  values.forEach((v, i) => {
    if (v == null) return;
    const cx = box.x + ((i + 0.5) / values.length) * box.w;
    if (!started) { ctx.moveTo(cx, py(v)); started = true; }
    else ctx.lineTo(cx, py(v));
  });
  ctx.stroke();
}

function caption(ctx, text, x, y, color = AXIS, size = 9) {
  font(ctx, size);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

const extent = (data) => [
  Math.min(...data.map((d) => d.l ?? d.c)),
  Math.max(...data.map((d) => d.h ?? d.c)),
];
const pad = (lo, hi, f = 0.08) => [lo - (hi - lo) * f, hi + (hi - lo) * f];

// ---------------------------------------------------------------- the kinds

const KINDS = {
  /** One bar, with every part of it named. The whole vocabulary on a single picture. */
  candle(ctx, w, h, spec) {
    const { o, h: hi, l, c } = spec;
    const box = { x: 50, y: 16, w: w - 150, h: h - 40 };
    const [lo2, hi2] = pad(l, hi, 0.16);
    const py = frame(ctx, box, { yLo: lo2, yHi: hi2, ticks: 3 });
    const cx = box.x + box.w * 0.42;
    const bw = Math.min(56, box.w * 0.2);
    const up = c >= o;

    ctx.strokeStyle = up ? UP : DOWN;
    ctx.fillStyle = up ? alpha(C.successLit, 0.32) : alpha(C.redLit, 0.34);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, py(hi)); ctx.lineTo(cx, py(l)); ctx.stroke();
    const top = py(Math.max(o, c)), bot = py(Math.min(o, c));
    ctx.beginPath(); ctx.rect(cx - bw / 2, top, bw, bot - top); ctx.fill(); ctx.stroke();

    const tag = (label, val, yy, color) => {
      ctx.strokeStyle = alpha(C.accent, 0.5);
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + bw / 2 + 4, yy);
      ctx.lineTo(box.x + box.w * 0.82, yy);
      ctx.stroke();
      ctx.setLineDash([]);
      font(ctx, 9, 700);
      ctx.fillStyle = color;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${label} ${val}`, box.x + box.w * 0.82 + 6, yy);
    };
    tag("HIGH", hi, py(hi), INK);
    tag(up ? "CLOSE" : "OPEN", up ? c : o, top, up ? UP : INK);
    tag(up ? "OPEN" : "CLOSE", up ? o : c, bot, up ? INK : DOWN);
    tag("LOW", l, py(l), INK);

    ctx.save();
    ctx.translate(cx - bw / 2 - 10, (top + bot) / 2);
    ctx.rotate(-Math.PI / 2);
    font(ctx, 8, 700);
    ctx.fillStyle = BRASS;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("BODY", 0, 0);
    ctx.restore();
  },

  /** The four shapes that are actually worth being able to name on sight. */
  shapes(ctx, w, h) {
    const items = [
      { o: 100, h: 101, l: 99, c: 100.6, name: "BALANCED", note: "small body, small wicks" },
      { o: 100, h: 108, l: 99.4, c: 100.8, name: "UPPER WICK", note: "pushed up, rejected" },
      { o: 100, h: 100.6, l: 92, c: 99.6, name: "LOWER WICK", note: "sold off, bought back" },
      { o: 100, h: 107.4, l: 99.6, c: 107, name: "FULL BODY", note: "one-way, closed at the top" },
    ];
    const cellW = w / items.length;
    items.forEach((d, i) => {
      const box = { x: i * cellW + 10, y: 14, w: cellW - 20, h: h - 62 };
      const [lo, hi] = pad(92, 108, 0.05);
      const py = (v) => box.y + box.h - ((v - lo) / (hi - lo)) * box.h;
      const cx = box.x + box.w / 2;
      const bw = Math.min(30, box.w * 0.44);
      const up = d.c >= d.o;
      ctx.strokeStyle = up ? UP : DOWN;
      ctx.fillStyle = up ? alpha(C.successLit, 0.32) : alpha(C.redLit, 0.34);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx, py(d.h)); ctx.lineTo(cx, py(d.l)); ctx.stroke();
      const top = py(Math.max(d.o, d.c)), bot = py(Math.min(d.o, d.c));
      ctx.beginPath(); ctx.rect(cx - bw / 2, top, bw, Math.max(1.5, bot - top)); ctx.fill(); ctx.stroke();
      font(ctx, 8, 700);
      ctx.fillStyle = BRASS;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(d.name, cx, box.y + box.h + 8);
      font(ctx, 8);
      ctx.fillStyle = AXIS;
      ctx.fillText(d.note, cx, box.y + box.h + 21);
    });
  },

  /** One series, drawn at three aggregations. The point is that they disagree. */
  timeframe(ctx, w, h, spec) {
    const fine = ohlc({ seed: spec.seed || 3, bars: 96, drift: 0.0012, vol: 0.011 });
    const agg = (n) => {
      const out = [];
      for (let i = 0; i < fine.length; i += n) {
        const chunk = fine.slice(i, i + n);
        if (!chunk.length) break;
        out.push({
          o: chunk[0].o, c: chunk[chunk.length - 1].c,
          h: Math.max(...chunk.map((d) => d.h)), l: Math.min(...chunk.map((d) => d.l)),
        });
      }
      return out;
    };
    const views = [["96 bars", fine], ["24 bars", agg(4)], ["8 bars", agg(12)]];
    const cellW = w / 3;
    const [lo, hi] = pad(...extent(fine));
    views.forEach(([label, data], i) => {
      const box = { x: i * cellW + 12, y: 20, w: cellW - 40, h: h - 46 };
      const py = frame(ctx, box, { yLo: lo, yHi: hi, ticks: 2 });
      candles(ctx, data, box, py);
      caption(ctx, label, box.x, 4, BRASS, 9);
    });
  },

  /** A plain candle series, optionally with volume, a moving average, or a gap. */
  candles(ctx, w, h, spec) {
    const data = ohlc(spec);
    const volH = spec.volume ? Math.round(h * 0.24) : 0;
    const box = { x: 8, y: 14, w: w - 58, h: h - 26 - volH };
    const [lo, hi] = pad(...extent(data));
    const py = frame(ctx, box, { yLo: lo, yHi: hi, fmtY: (v) => v.toFixed(0) });
    candles(ctx, data, box, py);

    if (spec.ma) {
      for (const n of spec.ma) {
        line(ctx, sma(data, n), box, py, BRASS, 1.4);
        const last = sma(data, n).filter((v) => v != null).pop();
        if (last != null) caption(ctx, `${n}-bar average`, box.x + 4, box.y + 2, BRASS);
      }
    }

    if (spec.gapAt != null) {
      const gx = box.x + ((spec.gapAt + 0.5) / data.length) * box.w;
      ctx.strokeStyle = alpha(C.red, 0.6);
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(gx, box.y); ctx.lineTo(gx, box.y + box.h); ctx.stroke();
      ctx.setLineDash([]);
      const prev = data[spec.gapAt - 1], now = data[spec.gapAt];
      if (prev && now) {
        ctx.fillStyle = alpha(C.red, 0.17);
        const top = py(Math.max(prev.c, now.o)), bot = py(Math.min(prev.c, now.o));
        ctx.fillRect(box.x, top, box.w, Math.max(1, bot - top));
        caption(ctx, "no trade ever happened in here", box.x + 6, top - 12, C.redLit);
      }
    }

    if (volH) {
      const vbox = { x: box.x, y: box.y + box.h + 8, w: box.w, h: volH - 12 };
      const vmax = Math.max(...data.map((d) => d.v));
      const bw = (vbox.w / data.length) * 0.66;
      data.forEach((d, i) => {
        const cx = vbox.x + ((i + 0.5) / data.length) * vbox.w;
        const bh = (d.v / vmax) * vbox.h;
        ctx.fillStyle = d.c >= d.o ? alpha(C.successLit, 0.42) : alpha(C.redLit, 0.44);
        ctx.fillRect(cx - bw / 2, vbox.y + vbox.h - bh, bw, bh);
      });
      caption(ctx, "VOLUME", vbox.x + 2, vbox.y - 8, AXIS, 8);
    }
  },

  /** The same 30 years on both axes. Usually the most persuasive card in the tier. */
  logdemo(ctx, w, h, spec) {
    const data = ohlc({ seed: spec.seed || 9, bars: 120, drift: 0.022, vol: 0.026 });
    const closes = data.map((d) => d.c);
    const cellW = w / 2;
    [["LINEAR — looks like a bubble", false], ["LOG — the same data, steady", true]]
      .forEach(([label, isLog], i) => {
        const box = { x: i * cellW + 10, y: 22, w: cellW - 56, h: h - 48 };
        const lo = Math.min(...closes) * 0.9, hi = Math.max(...closes) * 1.1;
        const py = frame(ctx, box, {
          yLo: lo, yHi: hi, log: isLog, ticks: 4,
          fmtY: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)),
        });
        line(ctx, closes, box, py, isLog ? UP : BRASS_LIT, 1.6);
        caption(ctx, label, box.x, 6, isLog ? UP : BRASS_LIT, 9);
      });
  },

  /** Two paths engineered to the same final return, with very different worst stretches. */
  drawdown(ctx, w, h, spec) {
    const calm = ohlc({ seed: spec.seed || 44, bars: 90, drift: 0.004, vol: 0.010 });
    const wild = ohlc({ seed: (spec.seed || 44) + 7, bars: 90, drift: 0.004, vol: 0.038 });
    // Rescale both to finish at exactly the same place, so only the ride differs.
    const norm = (d) => {
      const closes = d.map((x) => x.c);
      const k = 160 / closes[closes.length - 1];
      return closes.map((c) => c * k);
    };
    const a = norm(calm), b = norm(wild);
    const box = { x: 8, y: 26, w: w - 62, h: h - 42 };
    const lo = Math.min(...a, ...b) * 0.94, hi = Math.max(...a, ...b) * 1.04;
    const py = frame(ctx, box, { yLo: lo, yHi: hi, ticks: 4 });
    line(ctx, a, box, py, UP, 1.6);
    line(ctx, b, box, py, DOWN, 1.4);
    caption(ctx, `steady   worst fall ${(maxDrawdown(a) * 100).toFixed(0)}%`, box.x + 4, 4, UP);
    caption(ctx, `violent  worst fall ${(maxDrawdown(b) * 100).toFixed(0)}%`, box.x + 4, 14, DOWN);
    caption(ctx, "identical finish", box.x + box.w - 92, 4, BRASS, 9);
  },

  /** Two pure coin flips. The invitation is to find the textbook patterns in them. */
  randomwalk(ctx, w, h, spec) {
    const cellW = w / 2;
    [0, 1].forEach((i) => {
      const data = ohlc({ seed: (spec.seed || 101) + i * 13, bars: 70, drift: 0, vol: 0.017 });
      const box = { x: i * cellW + 10, y: 22, w: cellW - 52, h: h - 44 };
      const [lo, hi] = pad(...extent(data));
      const py = frame(ctx, box, { yLo: lo, yHi: hi, ticks: 3 });
      candles(ctx, data, box, py);
      caption(ctx, `coin flip #${i + 1} — zero drift`, box.x, 6, AXIS, 9);
    });
  },

  /** Volatility arriving in blocks: the returns bar chart makes it unmistakable. */
  clustering(ctx, w, h, spec) {
    const regime = (i, base) => (Math.floor(i / 22) % 2 === 0 ? base * 0.45 : base * 2.3);
    const data = ohlc({ seed: spec.seed || 61, bars: 132, drift: 0, vol: 0.017, volSeries: regime });
    const box = { x: 8, y: 16, w: w - 58, h: Math.round((h - 30) * 0.56) };
    const [lo, hi] = pad(...extent(data));
    const py = frame(ctx, box, { yLo: lo, yHi: hi, ticks: 3 });
    line(ctx, data.map((d) => d.c), box, py, BRASS_LIT, 1.3);

    const rbox = { x: box.x, y: box.y + box.h + 16, w: box.w, h: h - box.h - 44 };
    const rets = data.map((d, i) => (i === 0 ? 0 : d.c / data[i - 1].c - 1));
    const rmax = Math.max(...rets.map(Math.abs));
    const mid = rbox.y + rbox.h / 2;
    ctx.strokeStyle = GRID;
    ctx.beginPath(); ctx.moveTo(rbox.x, mid); ctx.lineTo(rbox.x + rbox.w, mid); ctx.stroke();
    const bw = Math.max(1, (rbox.w / rets.length) * 0.7);
    rets.forEach((r, i) => {
      const cx = rbox.x + ((i + 0.5) / rets.length) * rbox.w;
      const bh = (Math.abs(r) / rmax) * (rbox.h / 2);
      ctx.fillStyle = r >= 0 ? alpha(C.successLit, 0.68) : alpha(C.redLit, 0.68);
      ctx.fillRect(cx - bw / 2, r >= 0 ? mid - bh : mid, bw, bh);
    });
    caption(ctx, "PER-BAR RETURNS — quiet and violent arrive in blocks", rbox.x + 2, rbox.y - 10, AXIS, 8);
  },

  /**
   * A supplied series rather than a generated one — the player's own bank across spins.
   * Everything else in this module invents its data; this is the one kind that plots yours.
   */
  series(ctx, w, h, spec) {
    const vals = spec.values || [];
    if (vals.length < 2) {
      font(ctx, 11);
      ctx.fillStyle = AXIS;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(spec.empty || "Not enough spins yet", w / 2, h / 2);
      return;
    }
    const box = { x: 8, y: 14, w: w - 58, h: h - 30 };
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const [pLo, pHi] = pad(lo, hi, 0.12);
    const py = frame(ctx, box, {
      yLo: pLo, yHi: pHi, ticks: 4,
      fmtY: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)),
    });

    // the starting level, so gain and loss are readable at a glance
    if (spec.base != null && spec.base >= pLo && spec.base <= pHi) {
      const by = py(spec.base);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(box.x, by); ctx.lineTo(box.x + box.w, by); ctx.stroke();
      ctx.setLineDash([]);
    }

    const up = vals[vals.length - 1] >= (spec.base ?? vals[0]);
    const col = up ? UP : DOWN;
    const px = (i) => box.x + (i / (vals.length - 1)) * box.w;

    ctx.beginPath();
    ctx.moveTo(px(0), box.y + box.h);
    vals.forEach((v, i) => ctx.lineTo(px(i), py(v)));
    ctx.lineTo(px(vals.length - 1), box.y + box.h);
    ctx.closePath();
    ctx.fillStyle = alpha(col, 0.14);
    ctx.fill();

    line(ctx, vals, box, py, col, 2);

    const lastX = px(vals.length - 1), lastY = py(vals[vals.length - 1]);
    ctx.beginPath(); ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
  },

  /** The bell curve laid over an actual fat-tailed sample. */
  tails(ctx, w, h, spec) {
    const r = rng(spec.seed || 23);
    // A normal mixed with a rare high-variance regime: the standard way real returns behave.
    const sample = [];
    for (let i = 0; i < 6000; i++) {
      const jump = r() < 0.03;
      sample.push(gaussFrom(r) * (jump ? 4.2 : 0.82));
    }
    const sd = Math.sqrt(sample.reduce((a, b) => a + b * b, 0) / sample.length);
    const z = sample.map((x) => x / sd);
    const BINS = 61, LIM = 6;
    const hist = new Array(BINS).fill(0);
    for (const v of z) {
      const b = Math.round(((v + LIM) / (2 * LIM)) * (BINS - 1));
      if (b >= 0 && b < BINS) hist[b]++;
    }
    const box = { x: 10, y: 18, w: w - 60, h: h - 40 };
    const top = Math.max(...hist);
    const px = (i) => box.x + (i / (BINS - 1)) * box.w;
    const py = (v) => box.y + box.h - (v / top) * box.h;

    ctx.fillStyle = alpha(C.blue, 0.36);
    hist.forEach((v, i) => {
      const bw = box.w / BINS;
      ctx.fillRect(px(i) - bw / 2, py(v), bw * 0.9, box.y + box.h - py(v));
    });

    // The normal curve scaled to the same area, which is where the tails part company.
    ctx.strokeStyle = BRASS_LIT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < BINS; i++) {
      const x = -LIM + (i / (BINS - 1)) * 2 * LIM;
      const dens = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
      const scaled = dens * z.length * (2 * LIM / BINS);
      const yy = py(scaled);
      i ? ctx.lineTo(px(i), yy) : ctx.moveTo(px(i), yy);
    }
    ctx.stroke();

    const beyond = z.filter((v) => Math.abs(v) > 4).length;
    ctx.strokeStyle = alpha(C.red, 0.55);
    ctx.setLineDash([3, 3]);
    [-4, 4].forEach((s) => {
      const x = px(((s + LIM) / (2 * LIM)) * (BINS - 1));
      ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke();
    });
    ctx.setLineDash([]);
    caption(ctx, "actual returns", box.x + 4, 2, BLUE);
    caption(ctx, "the normal curve everyone assumes", box.x + 92, 2, BRASS_LIT);
    caption(ctx, `beyond ±4σ: ${beyond} days here, ≈0 under the bell curve`,
      box.x + 4, box.y + box.h + 6, C.redLit);
  },
};

/** Draw a spec into a canvas. Returns false where there is no 2D context to draw into. */
export function draw(canvas, spec) {
  if (!canvas || !spec) return false;
  const s = setup(canvas, spec.h);
  if (!s) return false;
  const kind = KINDS[spec.kind];
  if (!kind) return false;
  kind(s.ctx, s.w, s.h, spec);
  return true;
}

/** Mount every [data-chart] in a container, and keep them sharp across resizes. */
export function mountCharts(root, specs) {
  const nodes = [...root.querySelectorAll("[data-chart]")];
  const paint = () => nodes.forEach((n) => {
    const spec = specs[n.dataset.chart];
    if (spec) draw(n, spec);
  });
  paint();
  return paint;
}
