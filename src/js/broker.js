// THE BROKER — a brokerage account simulator.
//
// Built to look and behave like a real retail brokerage, because the lesson only lands if the
// surface is familiar. The layout follows the conventions anyone who has opened a trading app
// will recognise: portfolio value and today's change at the top, a dominant line chart coloured
// by performance, a time-range selector under it, a watchlist down the left, and an order
// ticket on the right that states what the order will cost before you send it.
//
// One deliberate inversion, and it is the whole reason this screen exists. A real brokerage
// hides what it takes from you — the spread is inside the fill price, payment for order flow is
// invisible, and "commission-free" is the headline. This one puts the spread and the commission
// on screen permanently, prices the round trip BEFORE you send it, and runs a shadow portfolio
// that bought the index once and never traded, so you can always see what doing nothing would
// have paid. Everything else is a faithful brokerage. That part is not.
//
// The second lesson, and the reason there are six names rather than one: a portfolio is less
// volatile than the things inside it. That claim is only honest if the instruments are
// genuinely correlated, so they are NOT six independent random walks. They come from a
// one-factor model —
//
//     r_i(t) = beta_i * r_market(t) + idiosyncratic_i(t)
//
// — which is how real equity returns decompose. That gives a true covariance structure, so the
// correlation matrix is measured from the data rather than decorated, and the gap between
// portfolio volatility and the weighted average of single-name volatilities is a real
// diversification benefit rather than a number we assert. `tools/factor.mjs` verifies the
// generator against the closed form; re-run it before ever re-tuning beta or idio.
//
// House rules this is built to (docs/DESIGN.md):
//   - The edge is a REAL, VISIBLE cost, never a rigged draw.
//   - The boring low-fee counterfactual is always shown.
//   - Nothing is redeemable, and P&L here pays NO chips. If trading well paid chips, the Ladder
//     could be ground instead of learned.
//   - No urgency. No clock, no streak, no expiring session.
//
// Market data is GENERATED, not fetched, by policy: every free stock-data tier (Alpha Vantage,
// Finnhub, Polygon, Tiingo) forbids commercial use, and yfinance breaks Yahoo's terms.
// Generation is seeded, so a given market number reproduces an identical market.
import { rng, maxDrawdown, realizedVol } from "./chart.js";
import { C, alpha } from "./theme.js";
import { bumpRounds, noteConcept, fmt } from "./state.js";

// ---------------------------------------------------------------- parameters
const DAYS        = 320;
const WARMUP      = 60;
const START_CASH  = 10000;
const HALF_SPREAD = 0.0008;   // 8bp each way — a realistic retail spread on a liquid name
const COMMISSION  = 2;        // flat, per order
const MKT_DRIFT   = 0.00032;  // ~8%/yr on the market factor
const MKT_VOL     = 0.0082;
const WINDOW      = 120;      // lookback for vol / covariance, in trading days

const UNIVERSE = [
  { id: "HALC", name: "Halcyon Software",    sector: "Technology",  beta: 1.40, idio: 0.0150 },
  { id: "NORB", name: "Northbank Financial", sector: "Financials",  beta: 1.25, idio: 0.0080 },
  { id: "MRDN", name: "Meridian Industrial", sector: "Industrials", beta: 1.05, idio: 0.0070 },
  { id: "ATLS", name: "Atlas Energy",        sector: "Energy",      beta: 0.85, idio: 0.0165 },
  { id: "CRWN", name: "Crown Foods",         sector: "Staples",     beta: 0.55, idio: 0.0055 },
  { id: "VRDT", name: "Verdant Power",       sector: "Utilities",   beta: 0.40, idio: 0.0048 },
];
const BENCH = "CHX-500";
const ANN = Math.sqrt(252);

// Brokerage time ranges, in trading days. ALL is the whole account history.
const RANGES = [["1W", 5], ["1M", 21], ["3M", 63], ["6M", 126], ["ALL", 0]];

// ---------------------------------------------------------------- market
function gauss(r) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildMarket(seed) {
  const r = rng(seed);
  // Volatility clusters on the FACTOR, so every name gets anxious at once — which is exactly
  // the behaviour that makes diversification disappoint people in a crisis.
  const regime = [];
  let v = 1;
  for (let i = 0; i < DAYS; i++) {
    if (r() < 0.02) v = 0.65 + r() * 2.0;
    regime.push(v);
  }
  const factor = [];
  for (let t = 0; t < DAYS; t++) factor.push(MKT_DRIFT + gauss(r) * MKT_VOL * regime[t]);

  const series = {};
  for (const u of UNIVERSE) {
    const ri = rng(seed + u.id.charCodeAt(0) * 7919 + u.id.charCodeAt(1) * 104729);
    const p = [100];
    for (let t = 1; t < DAYS; t++) {
      p.push(p[t - 1] * (1 + u.beta * factor[t] + gauss(ri) * u.idio * regime[t]));
    }
    series[u.id] = p;
  }
  // The index IS the factor compounded: the diversified portfolio whose idiosyncratic risk has
  // been averaged away. It is the line every holding here is measured against.
  const index = [100];
  for (let t = 1; t < DAYS; t++) index.push(index[t - 1] * (1 + factor[t]));
  return { series, index };
}

// ---------------------------------------------------------------- state
let S = null;

function fresh(seed) {
  const { series, index } = buildMarket(seed);
  const pos = {};
  for (const u of UNIVERSE) pos[u.id] = { shares: 0, basis: 0 };
  return {
    seed, series, index, pos,
    i: WARMUP,
    sel: "PORTFOLIO",       // watchlist selection; PORTFOLIO shows your equity vs the index
    side: "BUY",
    range: 63,
    cash: START_CASH,
    feesPaid: 0, spreadPaid: 0, realized: 0, turnover: 0,
    trades: [],
    // Equity sampled once per day, indexed from WARMUP. Without this the account can only ever
    // show a single instant, and the question this screen asks — did your trading beat doing
    // nothing — is a question about a path, not a point.
    curve: [START_CASH],
    benchShares: START_CASH / index[WARMUP],
  };
}

const px       = (id) => S.series[id][S.i];
const ask      = (id) => px(id) * (1 + HALF_SPREAD);
const bid      = (id) => px(id) * (1 - HALF_SPREAD);
const holdVal  = (id) => S.pos[id].shares * px(id);
const invested = () => UNIVERSE.reduce((a, u) => a + holdVal(u.id), 0);
const equity   = () => S.cash + invested();
const bench    = () => S.benchShares * S.index[S.i];
const mark     = () => { S.curve[S.i - WARMUP] = equity(); };
/** Equity on a given day, walking back over any gap. */
const curveAt  = (day) => {
  for (let k = day - WARMUP; k >= 0; k--) if (S.curve[k] !== undefined) return S.curve[k];
  return START_CASH;
};

const money = (n) => {
  // Deliberately NOT state.js's fmt(): that switches to whole numbers above 10,000, so a money
  // panel would print a rounded figure beside a full-precision one and a reader subtracting the
  // visible rows would get a different answer. Every money figure here is 2dp, always.
  const v = Math.round(n * 100) / 100;
  return (v < 0 ? "-" : "") + Math.abs(v).toLocaleString("en-US",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const signed = (n) => (n >= 0 ? "+" : "-") + money(Math.abs(n));
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const spct = (x, d = 2) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(d)}%`;

// ---------------------------------------------------------------- risk maths
function rets(arr, to, n = WINDOW) {
  const from = Math.max(1, to - n + 1);
  const out = [];
  for (let t = from; t <= to; t++) out.push(Math.log(arr[t] / arr[t - 1]));
  return out;
}

function covariance(ids) {
  const R = ids.map((id) => rets(S.series[id], S.i));
  const n = R[0].length;
  const mu = R.map((x) => x.reduce((a, b) => a + b, 0) / n);
  const cov = ids.map(() => ids.map(() => 0));
  for (let a = 0; a < ids.length; a++) {
    for (let b = a; b < ids.length; b++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += (R[a][t] - mu[a]) * (R[b][t] - mu[b]);
      cov[a][b] = cov[b][a] = s / Math.max(1, n - 1);
    }
  }
  return cov;
}

/**
 * The two numbers the analytics exist to put side by side. `blended` is what your holdings'
 * volatility would be if they all moved together — the weighted average of the individual vols,
 * which is what most people unconsciously assume a portfolio inherits. `port` is what it
 * actually is: sqrt(w' Σ w). The gap is diversification, and it is arithmetic, not opinion.
 */
function portfolioRisk() {
  const held = UNIVERSE.filter((u) => S.pos[u.id].shares > 0);
  if (!held.length) return null;
  const ids = held.map((u) => u.id);
  const total = ids.reduce((a, id) => a + holdVal(id), 0);
  if (total <= 0) return null;

  const w = ids.map((id) => holdVal(id) / total);
  const cov = covariance(ids);
  let varp = 0;
  for (let a = 0; a < ids.length; a++)
    for (let b = 0; b < ids.length; b++) varp += w[a] * w[b] * cov[a][b];

  const sd = ids.map((_, a) => Math.sqrt(cov[a][a]));
  const blended = w.reduce((acc, wi, a) => acc + wi * sd[a], 0);
  const port = Math.sqrt(Math.max(0, varp));
  // Inverse Herfindahl: how many equally weighted holdings this concentration is worth.
  const effective = 1 / w.reduce((a, wi) => a + wi * wi, 0);

  return { ids, w, port: port * ANN, blended: blended * ANN,
           benefit: blended > 0 ? (blended - port) / blended : 0,
           effective, maxWeight: Math.max(...w), total };
}

function correlations() {
  const ids = UNIVERSE.map((u) => u.id);
  const cov = covariance(ids);
  const sd = ids.map((_, a) => Math.sqrt(cov[a][a]));
  return ids.map((_, a) => ids.map((__, b) => cov[a][b] / (sd[a] * sd[b] || 1)));
}

// ---------------------------------------------------------------- actions
function buy(id, shares) {
  if (shares <= 0) return false;
  const p = ask(id);
  const cost = shares * p + COMMISSION;
  if (cost > S.cash) return false;
  const spread = shares * (p - px(id));
  S.cash -= cost;
  S.pos[id].shares += shares;
  S.pos[id].basis += cost;
  S.feesPaid += COMMISSION;
  S.spreadPaid += spread;
  S.turnover += shares * p;
  S.trades.push({ day: S.i, id, side: "BUY", shares, px: p, fee: COMMISSION, spread });
  mark();
  noteConcept("broker-first-trade");
  return true;
}

function sell(id, shares) {
  const pos = S.pos[id];
  shares = Math.min(shares, pos.shares);
  if (shares <= 0) return false;
  const p = bid(id);
  const net = shares * p - COMMISSION;
  const spread = shares * (px(id) - p);
  const basisPortion = pos.basis * (shares / pos.shares);
  S.realized += net - basisPortion;
  pos.basis -= basisPortion;
  pos.shares -= shares;
  S.cash += net;
  S.feesPaid += COMMISSION;
  S.spreadPaid += spread;
  S.turnover += shares * p;
  S.trades.push({ day: S.i, id, side: "SELL", shares, px: p, fee: COMMISSION, spread });
  mark();
  return true;
}

/**
 * Equal-weight every name. Sells down first so the cash exists to buy with, and charges full
 * costs on every leg — rebalancing looks free and is not, which is exactly why you are allowed
 * to do it here and then watch the cost panel move.
 */
function rebalance() {
  const target = equity() / UNIVERSE.length;
  for (const u of UNIVERSE) {
    const want = Math.floor(target / px(u.id));
    if (S.pos[u.id].shares > want) sell(u.id, S.pos[u.id].shares - want);
  }
  for (const u of UNIVERSE) {
    const need = Math.floor(target / ask(u.id)) - S.pos[u.id].shares;
    if (need > 0) buy(u.id, need);
  }
  noteConcept("broker-rebalance");
}

function step(n) {
  // Marks every intermediate day, not just the last — stepping 20 days must leave 20 points on
  // the curve or the chart draws a straight line through whatever happened.
  for (let k = 0; k < n && S.i < DAYS - 1; k++) { S.i += 1; mark(); }
  bumpRounds("broker");
}

// ---------------------------------------------------------------- series for display
const isPortfolio = () => S.sel === "PORTFOLIO";

/** The primary series and its benchmark, over the selected range. */
function chartSeries() {
  const span = S.range || (S.i - WARMUP);
  const first = isPortfolio() ? WARMUP : 0;
  const from = Math.max(first, S.range ? S.i - span : first);
  const main = [], base = [];
  for (let d = from; d <= S.i; d++) {
    main.push(isPortfolio() ? curveAt(d) : S.series[S.sel][d]);
    base.push(isPortfolio() ? S.benchShares * S.index[d] : S.index[d]);
  }
  // A price chart rebases the index to the instrument's first visible close so both lines start
  // together. A portfolio chart needs no rebasing: both started from the same cash on day one.
  let out = isPortfolio() ? base : base.map((v) => (v / base[0]) * main[0]);
  if (main.length < 2) { main.push(main[0]); out = [out[0], out[0]]; }
  return { from, main, line2: out };
}

// ---------------------------------------------------------------- chart
let geom = null;   // retained so the hover scrubber can hit-test without recomputing

function paintChart(canvas) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const { from, main, line2 } = chartSeries();
  const bx = 2, by = 10, bw = w - 4, bh = h - 24;

  const all = main.concat(line2);
  let lo = Math.min(...all), hi = Math.max(...all);
  const padY = (hi - lo) * 0.10 || 1;
  lo -= padY; hi += padY;
  const X = (k) => bx + (k / Math.max(1, main.length - 1)) * bw;
  const Y = (v) => by + bh - ((v - lo) / (hi - lo)) * bh;
  geom = { from, main, line2, bx, by, bw, bh, lo, hi, n: main.length, X, Y };

  // The line takes its colour from the period's performance — up is green, down is red. That is
  // the single most recognisable convention in a retail brokerage, and it means the chart says
  // how you did before you have read a number off it.
  const up = main[main.length - 1] >= main[0];
  const tone = up ? C.successLit : C.redLit;

  // Benchmark first, underneath, so it reads as reference rather than as a second position.
  ctx.save();
  ctx.strokeStyle = C.inkFaint; ctx.lineWidth = 1.1; ctx.setLineDash([3, 4]);
  ctx.beginPath();
  line2.forEach((v, k) => (k ? ctx.lineTo(X(k), Y(v)) : ctx.moveTo(X(k), Y(v))));
  ctx.stroke(); ctx.restore();

  // A soft fill under the line, the way every brokerage draws it.
  const grad = ctx.createLinearGradient(0, by, 0, by + bh);
  grad.addColorStop(0, alpha(tone, 0.16));
  grad.addColorStop(1, alpha(tone, 0));
  ctx.beginPath();
  main.forEach((v, k) => (k ? ctx.lineTo(X(k), Y(v)) : ctx.moveTo(X(k), Y(v))));
  ctx.lineTo(X(main.length - 1), by + bh);
  ctx.lineTo(X(0), by + bh);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  main.forEach((v, k) => (k ? ctx.lineTo(X(k), Y(v)) : ctx.moveTo(X(k), Y(v))));
  ctx.strokeStyle = tone; ctx.lineWidth = 2; ctx.lineJoin = "round";
  ctx.stroke();

  // Fills, on a price chart only — they have no meaning on a portfolio curve.
  if (!isPortfolio()) {
    for (const t of S.trades) {
      if (t.id !== S.sel || t.day < from || t.day > S.i) continue;
      ctx.beginPath();
      ctx.arc(X(t.day - from), Y(S.series[S.sel][t.day]), 3.4, 0, Math.PI * 2);
      ctx.fillStyle = t.side === "BUY" ? C.successLit : C.redLit;
      ctx.fill();
      ctx.strokeStyle = C.bg; ctx.lineWidth = 1.4; ctx.stroke();
    }
  }

  // The scrubber, when the pointer is over the chart.
  if (hoverK !== null && hoverK >= 0 && hoverK < main.length) {
    const x = X(hoverK), y = Y(main[hoverK]);
    ctx.save();
    ctx.strokeStyle = C.line2; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by + bh); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = tone; ctx.fill();
    ctx.strokeStyle = C.bg; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = C.inkFaint;
  ctx.font = '400 9px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText(isPortfolio() ? `your account solid   ${BENCH} holding dashed`
                             : `${S.sel} solid   ${BENCH} dashed`, bx + 2, h - 5);
}

// ---------------------------------------------------------------- sparkline
function spark(id) {
  const arr = S.series[id];
  const from = Math.max(0, S.i - 30);
  const vals = arr.slice(from, S.i + 1);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const rng2 = hi - lo || 1;
  const pts = vals.map((v, k) =>
    `${(k / (vals.length - 1) * 56).toFixed(1)},${(16 - ((v - lo) / rng2) * 14).toFixed(1)}`);
  const up = vals[vals.length - 1] >= vals[0];
  return `<svg class="spark" viewBox="0 0 56 18" preserveAspectRatio="none"
    aria-hidden="true" focusable="false">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${up ? C.successLit : C.redLit}"
      stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

// ---------------------------------------------------------------- view
export function view() {
  const ranges = RANGES.map(([label, d]) =>
    `<button class="rbtn${d === 63 ? " on" : ""}" data-range="${d}">${label}</button>`).join("");

  return `
    <div class="brk">
      <aside class="brk-list">
        <div class="brk-list-head">Accounts</div>
        <button class="wrow wrow--port" data-sel="PORTFOLIO">
          <span class="w-id">Your portfolio</span>
          <span class="w-sub">cash + holdings</span>
          <span class="w-px" id="w-px-PORTFOLIO">—</span>
          <span class="w-ch" id="w-ch-PORTFOLIO"></span>
        </button>
        <div class="brk-list-head">Watchlist</div>
        ${UNIVERSE.map((u) => `
          <button class="wrow" data-sel="${u.id}">
            <span class="w-id">${u.id}</span>
            <span class="w-sub">${u.sector}</span>
            <span class="w-spark" id="w-sp-${u.id}"></span>
            <span class="w-px" id="w-px-${u.id}">—</span>
            <span class="w-ch" id="w-ch-${u.id}"></span>
          </button>`).join("")}
      </aside>

      <section class="brk-main">
        <header class="brk-head">
          <p class="brk-kicker" id="brk-kicker">Your portfolio</p>
          <h1 class="brk-value" id="brk-value">—</h1>
          <p class="brk-change"><span id="brk-change"></span><em id="brk-period"></em></p>
        </header>

        <div class="brk-chart"><canvas id="brk-canvas"></canvas></div>

        <div class="brk-ranges" role="group" aria-label="Chart range">${ranges}</div>

        <div class="brk-tape" id="brk-tape"></div>
      </section>

      <aside class="brk-ticket">
        <div class="tk">
          <div class="tk-side" role="group" aria-label="Order side">
            <button class="tkb on" data-side="BUY">Buy</button>
            <button class="tkb" data-side="SELL">Sell</button>
          </div>
          <div class="tk-body">
            <p class="tk-for" id="tk-for">—</p>
            <label class="tk-label" id="tk-amt-label">Amount</label>
            <div class="tk-amt" role="group" aria-label="Order size as a share of equity">
              <button class="szbtn" data-pct="5">5%</button>
              <button class="szbtn" data-pct="10">10%</button>
              <button class="szbtn on" data-pct="25">25%</button>
              <button class="szbtn" data-pct="50">50%</button>
            </div>
            <div class="tk-est" id="tk-est"></div>
            <button class="btn btn-primary tk-go" id="tk-go">Buy</button>
            <p class="tk-note" id="tk-note"></p>
          </div>
        </div>

        <div class="tk tk--plain">
          <h3>Market</h3>
          <div class="brk-steps">
            <button class="btn" id="step-1">+1 day</button>
            <button class="btn" id="step-5">+5</button>
            <button class="btn" id="step-20">+20</button>
          </div>
          <p class="tk-note" id="brk-daynote"></p>
          <button class="btn btn-ghost tk-wide" id="brk-rebal">Equal-weight all six</button>
          <button class="btn btn-ghost tk-wide" id="brk-new">New market</button>
        </div>

        <div class="tk tk--plain">
          <h3>Account</h3>
          <div class="kv" id="brk-account"></div>
        </div>

        <div class="tk tk--cost">
          <h3>What this account costs you</h3>
          <div class="kv" id="brk-costs"></div>
          <p class="tk-note">A real brokerage puts the spread inside the fill price and calls
          itself commission-free. This one prints it.</p>
        </div>

        <div class="tk tk--plain">
          <h3>Doing nothing instead</h3>
          <div class="kv" id="brk-bench"></div>
          <p class="tk-note">The same ${fmt(START_CASH)} put into the ${BENCH} index once, on day
          one, and never touched since. No spread, no commission.</p>
        </div>
      </aside>
    </div>

    <div class="brk-grid">
      <div class="panel">
        <h3>Positions</h3>
        <div class="ptable" id="brk-positions"></div>
      </div>
      <div class="panel">
        <h3>Diversification</h3>
        <div id="brk-risk"></div>
      </div>
      <div class="panel">
        <h3>Correlation, trailing ${WINDOW} days</h3>
        <div class="cmatrix" id="brk-corr"></div>
        <p class="tk-note">Every name here loads on one common market factor, so none of these
        sit near zero. That is why six stocks still fall together on a bad day — diversification
        removes the risk specific to each name, never the risk they share.</p>
      </div>
      <div class="panel panel--orders">
        <h3>Order history</h3>
        <div class="brk-orders" id="brk-orders"></div>
      </div>
    </div>

    <div id="brk-final"></div>`;
}

// ---------------------------------------------------------------- render
const row = (k, v, cls) =>
  `<div><span class="k">${k}</span><span class="v ${cls || ""}">${v}</span></div>`;

const currentPct = () => {
  const on = document.querySelector(".szbtn.on");
  return (on ? Number(on.dataset.pct) : 25) / 100;
};

/** Shares that spend the chosen share of equity, at the price you would actually pay. */
const sizeShares = (id) => Math.max(0, Math.floor((equity() * currentPct()) / ask(id)));
const sellShares = (id) => Math.ceil(S.pos[id].shares * currentPct());

let hoverK = null;

function paint() {
  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const eq = equity(), be = bench(), inv = invested();

  // ---- watchlist
  document.querySelectorAll(".wrow").forEach((b) => {
    b.classList.toggle("on", b.dataset.sel === S.sel);
    b.classList.toggle("held", b.dataset.sel !== "PORTFOLIO" && S.pos[b.dataset.sel].shares > 0);
  });
  set("w-px-PORTFOLIO", money(eq));
  const dayCh = eq - curveAt(S.i - 1);
  const dayChPct = curveAt(S.i - 1) ? dayCh / curveAt(S.i - 1) : 0;
  const chEl = document.getElementById("w-ch-PORTFOLIO");
  if (chEl) { chEl.textContent = spct(dayChPct); chEl.className = "w-ch " + (dayCh >= 0 ? "up" : "down"); }
  for (const u of UNIVERSE) {
    const c = px(u.id) / S.series[u.id][Math.max(0, S.i - 1)] - 1;
    set("w-px-" + u.id, px(u.id).toFixed(2));
    set("w-sp-" + u.id, spark(u.id));
    const e = document.getElementById("w-ch-" + u.id);
    if (e) { e.textContent = spct(c); e.className = "w-ch " + (c >= 0 ? "up" : "down"); }
  }

  // ---- header: the scrubbed point when hovering, otherwise the latest
  const { from, main } = chartSeries();
  const k = hoverK !== null && hoverK < main.length ? hoverK : main.length - 1;
  const shown = main[k], first = main[0];
  const chg = shown - first, chgPct = first ? chg / first : 0;
  const rangeName = (RANGES.find(([, d]) => d === S.range) || ["ALL"])[0];

  set("brk-kicker", isPortfolio() ? "Your portfolio"
    : `${UNIVERSE.find((u) => u.id === S.sel).name} &middot; ${S.sel}`);
  set("brk-value", isPortfolio() ? money(shown) : shown.toFixed(2));
  const cEl = document.getElementById("brk-change");
  if (cEl) {
    cEl.textContent = `${signed(chg)} (${spct(chgPct)})`;
    cEl.className = chg >= 0 ? "up" : "down";
  }
  set("brk-period", hoverK !== null
    ? `on day ${from + k - WARMUP + 1}`
    : `over ${rangeName === "ALL" ? "the whole account" : "the last " + rangeName}`);

  document.querySelectorAll(".rbtn").forEach((b) =>
    b.classList.toggle("on", Number(b.dataset.range) === S.range));

  // ---- tape under the chart
  const totalCost = S.feesPaid + S.spreadPaid;
  const acct = S.curve.filter((x) => x !== undefined);
  const enough = acct.length >= 3;                 // 2 points is one return: not a volatility
  const closes = isPortfolio() ? acct : S.series[S.sel].slice(0, S.i + 1);
  set("brk-tape", [
    isPortfolio()
      ? `<span><b>${enough ? pct(realizedVol(acct) * ANN) : "--"}</b> your vol</span>`
      : `<span><b>${pct(realizedVol(closes) * ANN)}</b> ${S.sel} vol</span>`,
    `<span><b>${pct(realizedVol(S.index.slice(0, S.i + 1)) * ANN)}</b> ${BENCH} vol</span>`,
    `<span><b>${isPortfolio() && !enough ? "--" : pct(maxDrawdown(closes))}</b> ` +
      `${isPortfolio() ? "your" : S.sel} max drawdown</span>`,
    `<span><b>${fmt(S.trades.length)}</b> orders</span>`,
    `<span><b>${money(totalCost)}</b> paid to trade</span>`,
  ].join(""));

  // ---- ticket
  const tradeId = isPortfolio() ? "MRDN" : S.sel;
  const buying = S.side === "BUY";
  // Buy sizes off equity, where 50% is already a large bet. Sell sizes off the position, where
  // the option you always need is all of it — so the chips follow the side.
  const chips = buying ? [5, 10, 25, 50] : [25, 50, 75, 100];
  document.querySelectorAll(".szbtn").forEach((b, k) => {
    if (Number(b.dataset.pct) !== chips[k]) {
      const wasOn = b.classList.contains("on");
      b.dataset.pct = chips[k];
      b.textContent = chips[k] + "%";
      if (wasOn) b.classList.add("on");
    }
  });
  // Sizes are read from the DOM, so the chips must be relabelled BEFORE this line or the
  // estimate shows the previous side's percentage for one frame.
  const shares = buying ? sizeShares(tradeId) : sellShares(tradeId);
  const p = buying ? ask(tradeId) : bid(tradeId);
  const notional = shares * p;
  const est = buying ? notional + COMMISSION : notional - COMMISSION;
  const spreadCost = shares * px(tradeId) * HALF_SPREAD;

  set("tk-for", isPortfolio()
    ? `${buying ? "Buying" : "Selling"} <b>${tradeId}</b> — pick a name from the watchlist to change it`
    : `${buying ? "Buying" : "Selling"} <b>${tradeId}</b>`);
  set("tk-amt-label", buying ? "Amount, as a share of your equity" : "Amount, as a share of the position");
  set("tk-est", shares > 0 ? `
      <div><span class="k">Shares</span><span class="v">${fmt(shares)}</span></div>
      <div><span class="k">${buying ? "Ask" : "Bid"}</span><span class="v">${p.toFixed(2)}</span></div>
      <div><span class="k">Spread you cross</span><span class="v down">${money(spreadCost)}</span></div>
      <div><span class="k">Commission</span><span class="v down">${money(COMMISSION)}</span></div>
      <div class="tk-total"><span class="k">${buying ? "Estimated cost" : "Estimated credit"}</span><span class="v">${money(est)}</span></div>`
    : `<p class="tk-empty">${buying
        ? `Not enough cash for ${pct(currentPct())} of equity in ${tradeId}.`
        : `No ${tradeId} position to sell.`}</p>`);

  const go = document.getElementById("tk-go");
  if (go) {
    go.textContent = shares > 0 ? `${buying ? "Buy" : "Sell"} ${fmt(shares)} ${tradeId}` : (buying ? "Buy" : "Sell");
    go.disabled = shares <= 0;
    go.classList.toggle("btn-sell", !buying);
  }
  const breakeven = notional > 0 ? ((spreadCost * 2 + COMMISSION * 2) / notional) * 100 : 0;
  set("tk-note", shares > 0 && buying
    ? `Round trip costs <b>${money(spreadCost * 2 + COMMISSION * 2)}</b>, so ${tradeId} must rise
       <b>${breakeven.toFixed(2)}%</b> before this position is worth anything to you.`
    : "");

  // ---- account, costs, benchmark
  const unreal = UNIVERSE.reduce(
    (a, u) => a + (S.pos[u.id].shares ? holdVal(u.id) - S.pos[u.id].basis : 0), 0);
  set("brk-account", [
    row("Buying power", money(S.cash)),
    row("Holdings", money(inv)),
    row("Unrealised", money(unreal), unreal >= 0 ? "up" : "down"),
    row("Realised", money(S.realized), S.realized >= 0 ? "up" : "down"),
    row("Account value", money(eq), eq >= START_CASH ? "up" : "down"),
  ].join(""));

  set("brk-costs", [
    row("Commission", money(S.feesPaid)),
    row("Spread crossed", money(S.spreadPaid)),
    row("Total", money(totalCost), totalCost > 0 ? "down" : ""),
    row("Of starting cash", pct(totalCost / START_CASH, 2)),
    // Turnover is the link between how much you trade and what it costs: cost is turnover times
    // the round-trip rate, and the two belong next to each other.
    row("Turnover", `${(S.turnover / START_CASH).toFixed(2)}x`),
  ].join(""));

  // Rounded first, then subtracted, so Difference is exactly what a reader gets by subtracting
  // the two rows above it.
  const r2 = (x) => Math.round(x * 100) / 100;
  const gap = r2(eq) - r2(be);
  set("brk-bench", [
    row("Index holding", money(be)),
    row("You", money(eq)),
    row("Difference", money(gap), gap >= 0 ? "up" : "down"),
  ].join(""));

  // ---- positions
  const held = UNIVERSE.filter((u) => S.pos[u.id].shares > 0);
  set("brk-positions", !held.length
    ? `<p class="tk-empty">No positions. Buy a name, or equal-weight all six, and the weights
       and risk figures fill in.</p>`
    : `<div class="pt-row pt-head"><span>Name</span><span>Shares</span><span>Value</span>` +
      `<span>Weight</span><span>P&amp;L</span></div>` +
      held.map((u) => {
        const val = holdVal(u.id);
        const pl = val - S.pos[u.id].basis;
        const wgt = val / (inv || 1);
        return `<div class="pt-row">
          <span class="pt-id">${u.id}</span>
          <span>${fmt(S.pos[u.id].shares)}</span>
          <span>${money(val)}</span>
          <span class="pt-w"><i style="width:${(wgt * 100).toFixed(1)}%"></i><b>${pct(wgt)}</b></span>
          <span class="${pl >= 0 ? "up" : "down"}">${money(pl)}</span>
        </div>`;
      }).join(""));

  // ---- diversification
  const risk = portfolioRisk();
  set("brk-risk", !risk
    ? `<p class="tk-empty">Hold at least one name to see what your portfolio's volatility
       actually is, against what the weighted average of its parts would suggest.</p>`
    : `<div class="kv">
        ${row("Weighted average of parts", pct(risk.blended))}
        ${row("Your portfolio", pct(risk.port), "up")}
        ${row("Risk removed", pct(risk.benefit), risk.benefit > 0 ? "up" : "down")}
        ${row("Effective holdings", risk.effective.toFixed(2))}
        ${row("Largest weight", pct(risk.maxWeight))}
      </div>
      <p class="tk-note">If every holding moved together your volatility would be that
      <b>${pct(risk.blended)}</b> weighted average. It is <b>${pct(risk.port)}</b> instead, because
      they do not. That difference is the only free lunch in this building, and it costs nothing
      in spread.${risk.maxWeight > 0.5 || risk.effective < 2
        ? ` <span class="warn">Right now ${pct(risk.maxWeight)} of your money sits in one name, so
            you are carrying about ${risk.effective.toFixed(1)} positions' worth of
            diversification, not ${risk.ids.length}.</span>` : ""}</p>`);

  // ---- correlation matrix
  const M = correlations();
  const ids = UNIVERSE.map((u) => u.id);
  set("brk-corr",
    `<div class="cm-row cm-head"><span></span>${ids.map((x) => `<span>${x}</span>`).join("")}</div>` +
    ids.map((idA, a) =>
      `<div class="cm-row"><span class="cm-id">${idA}</span>` +
      ids.map((_, b) => {
        const v = M[a][b];
        // Opacity carries magnitude so it reads as a heatmap at a glance; the number is printed
        // too, because a heatmap you cannot read exact values off is decoration.
        const op = a === b ? 0.32 : Math.min(0.32, Math.max(0, v) * 0.36);
        return `<span class="cm-c" style="background:${alpha(C.accent, op)}">${v.toFixed(2)}</span>`;
      }).join("") + `</div>`).join(""));

  // ---- order history
  set("brk-orders", S.trades.length
    ? `<div class="or-row or-head"><span>Side</span><span>Name</span><span>Qty</span>` +
      `<span>Price</span><span>Cost</span><span>Day</span></div>` +
      S.trades.slice(-12).reverse().map((t) => `
        <div class="or-row">
          <span class="or-side ${t.side === "BUY" ? "buy" : "sell"}">${t.side}</span>
          <span>${t.id}</span>
          <span>${fmt(t.shares)}</span>
          <span>${t.px.toFixed(2)}</span>
          <span class="down">-${money(t.fee + t.spread)}</span>
          <span class="or-day">d${t.day - WARMUP + 1}</span>
        </div>`).join("")
    : `<p class="tk-empty">No orders yet. The market moves when you tell it to.</p>`);

  const left = DAYS - 1 - S.i;
  set("brk-daynote", `Day ${S.i - WARMUP + 1} of ${DAYS - WARMUP}. ` +
    (left ? `${left} days of market remaining.`
          : "This market is finished — start a new one whenever you like."));

  // ---- the reckoning, once the market runs out
  // It states the result plainly and neither congratulates nor scolds. Beating the index over
  // 260 days is mostly luck, and implying otherwise would teach the wrong lesson entirely.
  if (S.i >= DAYS - 1) {
    const yourRet = eq / START_CASH - 1, idxRet = be / START_CASH - 1;
    const costShare = Math.abs(eq - START_CASH) > 0.01 ? totalCost / Math.abs(eq - START_CASH) : 0;
    set("brk-final", `
      <div class="reckon">
        <h3>The market is finished</h3>
        <div class="reckon-grid">
          <div><span class="k">You returned</span><span class="v ${yourRet >= 0 ? "up" : "down"}">${spct(yourRet)}</span></div>
          <div><span class="k">The index returned</span><span class="v ${idxRet >= 0 ? "up" : "down"}">${spct(idxRet)}</span></div>
          <div><span class="k">Orders placed</span><span class="v">${fmt(S.trades.length)}</span></div>
          <div><span class="k">Turnover</span><span class="v">${(S.turnover / START_CASH).toFixed(2)}x</span></div>
          <div><span class="k">Paid to trade</span><span class="v down">${money(totalCost)}</span></div>
        </div>
        <p>${yourRet >= idxRet
          ? `You finished ahead of the index by <b>${spct(yourRet - idxRet)}</b>. Over 260 days that
             is mostly luck — the honest test is whether it repeats across many markets, and the
             costs came out of it either way.`
          : `You finished behind the index by <b>${pct(idxRet - yourRet, 2)}</b>, having paid
             <b>${money(totalCost)}</b> to do it.`}
          ${totalCost > 0 && costShare > 0
            ? ` Trading costs were <b>${pct(Math.min(costShare, 9.99), 0)}</b> of the size of your
                total gain or loss.` : ""}
          Start a new market and the same decisions meet different draws — that difference is the
          whole point.</p>
      </div>`);
  } else {
    set("brk-final", "");
  }

  paintChart(document.getElementById("brk-canvas"));
}

// ---------------------------------------------------------------- mount
let onResize = null;

export function mount() {
  if (!S) S = fresh(Math.floor(Math.random() * 100000) + 1);

  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };

  document.querySelectorAll(".wrow").forEach((b) =>
    b.addEventListener("click", () => { S.sel = b.dataset.sel; hoverK = null; paint(); }));
  document.querySelectorAll(".rbtn").forEach((b) =>
    b.addEventListener("click", () => { S.range = Number(b.dataset.range); hoverK = null; paint(); }));
  document.querySelectorAll(".tkb").forEach((b) =>
    b.addEventListener("click", () => {
      S.side = b.dataset.side;
      document.querySelectorAll(".tkb").forEach((x) => x.classList.toggle("on", x === b));
      // The chips carry different percentages per side, so keeping the selected SLOT meant a
      // "50%" buy silently became a "100%" sell on the next click — one tap from liquidating
      // the whole position by accident. Switching side resets to the smallest amount.
      const all = [...document.querySelectorAll(".szbtn")];
      all.forEach((x, k) => x.classList.toggle("on", k === 0));
      paint();
    }));
  document.querySelectorAll(".szbtn").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".szbtn").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      paint();
    }));

  on("tk-go", () => {
    const id = isPortfolio() ? "MRDN" : S.sel;
    if (S.side === "BUY") buy(id, sizeShares(id)); else sell(id, sellShares(id));
    paint();
  });
  on("brk-rebal", () => { rebalance(); paint(); });
  on("brk-new", () => { S = fresh(Math.floor(Math.random() * 100000) + 1); hoverK = null; paint(); });
  on("step-1",  () => { step(1);  paint(); });
  on("step-5",  () => { step(5);  paint(); });
  on("step-20", () => { step(20); paint(); });

  // Hover scrubbing, the way a brokerage chart reads back the value on the day you point at.
  const cv = document.getElementById("brk-canvas");
  if (cv) {
    cv.addEventListener("pointermove", (e) => {
      if (!geom) return;
      const r = cv.getBoundingClientRect();
      const k = Math.round(((e.clientX - r.left - geom.bx) / geom.bw) * (geom.n - 1));
      const next = Math.max(0, Math.min(geom.n - 1, k));
      if (next !== hoverK) { hoverK = next; paint(); }
    });
    cv.addEventListener("pointerleave", () => { hoverK = null; paint(); });
  }

  onResize = () => paintChart(document.getElementById("brk-canvas"));
  window.addEventListener("resize", onResize);
  paint();
}

export function unmount() {
  if (onResize) window.removeEventListener("resize", onResize);
  onResize = null;
  hoverK = null;
}
