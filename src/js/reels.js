// Table 1 — Sector Reels (slots).
//
// It looks and sounds like a slot machine: five reels, staggered stops, motion blur, an
// overshoot-and-settle bounce, chasing marquee lights, coin showers. But the reels are market
// sectors, and the payout is the literal average return of the reels you covered — never a
// rigged symbol paytable. Cover one reel and you own one sector. Cover five and you own the
// index. Same expected return, very different ride.
//
// The house edge is a fee, printed on the glass. Index Mode unlocks after 8 spins and changes
// exactly two numbers — the fee and the drift — so the player watches an identical machine turn
// from a slow bleed into a compounding engine.
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { hasUnlock } from "./curriculum.js";
// aliased: this module already has its own draw() for the reel canvas
import { draw as drawChart, realizedVol, maxDrawdown } from "./chart.js";
import { C } from "./theme.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";

const SECTORS = [
  { id: "TECH",  glyph: "◆", name: "Technology", color: C.blue, vol: 0.26 },
  { id: "ENRG",  glyph: "▲", name: "Energy",     color: C.hot, vol: 0.24 },
  { id: "HLTH",  glyph: "✚", name: "Healthcare", color: C.successLit, vol: 0.15 },
  { id: "FIN",   glyph: "$", name: "Financials", color: C.hot2, vol: 0.19 },
  { id: "CONS",  glyph: "●", name: "Consumer",   color: "#f472b6", vol: 0.12 },
  { id: "UTIL",  glyph: "⚡", name: "Utilities",  color: C.accent2, vol: 0.09 },
  { id: "CRYP",  glyph: "✦", name: "Crypto",     color: C.accentLit, vol: 0.62 },
  { id: "BOND",  glyph: "▬", name: "Bonds",      color: C.inkDim, vol: 0.05 },
];

const MODES = {
  floor: { fee: 0.045, drift: 0.000, label: "Casino Floor", rtp: "95.5%" },
  index: { fee: 0.0003, drift: 0.070, label: "Index Mode",  rtp: "107%"  },
};
// Everything this machine can do beyond pulling the lever is granted by the Ladder. Rung 01
// opens Index Mode, and rungs 02-05 progressively turn the cabinet into an instrument: batch
// the spins, chart them, measure how much they move, and size the next bet off that measurement.
// The order is deliberate — you cannot size off a volatility you have not measured, and you
// cannot measure one without a series to measure.
const can = (id) => hasUnlock(get().prestige.level, id);
const indexOpen = () => can("indexMode");

const HOLD_SPINS = 10;
let holding = 0;                 // spins left in a compounding hold
let holdTimer = 0;               // the pending next-spin timer, so leaving can cancel it

const REELS = 5;
const ROWS = 3;
const STRIP_LEN = 16;

let canvas, ctx, els, raf = 0;
let reels = [];         // { strip, pos, prev, from, to, t0, dur, spinning, landed }
let spinning = false;
let outcome = null;     // { sectors, returns, covered, stake, net, correlated, tier }
let particles = [];
let flash = 0;

const mode = () => MODES[get().reels.indexMode ? "index" : "floor"];

// ---------------------------------------------------------------- maths

// Box-Muller. Returns a standard normal.
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildStrip() {
  const s = [];
  while (s.length < STRIP_LEN) {
    const i = Math.floor(Math.random() * SECTORS.length);
    if (s.length && s[s.length - 1] === i) continue;   // no adjacent repeats, reads better
    s.push(i);
  }
  return s;
}

/** Resolve one spin: which sectors land, what each returned, and the payout. */
function resolve(stake, covered) {
  const m = mode();
  const sectors = Array.from({ length: REELS }, () => Math.floor(Math.random() * SECTORS.length));
  const returns = sectors.map((si) => m.drift + SECTORS[si].vol * gauss());

  // Correlation event: if three or more covered reels land on the same sector, your
  // diversification did not happen, and the swing is amplified.
  const counts = {};
  for (let i = 0; i < covered; i++) counts[sectors[i]] = (counts[sectors[i]] || 0) + 1;
  const correlated = Object.values(counts).some((c) => c >= 3);

  let avg = 0;
  for (let i = 0; i < covered; i++) avg += returns[i];
  avg /= covered;
  if (correlated) avg = m.drift + (avg - m.drift) * 1.8;

  const gross = stake * (1 + avg);
  const fee = gross * m.fee;
  const payout = Math.max(0, gross - fee);

  // The same draws, charged an index fund's fee instead of the table's.
  const shadowFee = gross * MODES.index.fee;
  return { sectors, returns, covered, stake, avg, fee, payout, net: payout - stake, correlated,
           shadowNet: Math.max(0, gross - shadowFee) - stake };
}

// ---------------------------------------------------------------- view

export function view() {
  const r = get().reels;
  const m = mode();
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>Sector Reels</h1>
        <p class="sub">Five reels, but the symbols are market sectors and the payout is the real
        average return of the reels you covered. Cover one and you own a single sector. Cover all
        five and you own the index. <em>The only thing that changes is how wild the ride is.</em></p>
      </div>
    </div>

    <div class="slot-layout">
      <div>
        <div class="machine ${r.indexMode ? "machine--index" : ""}" id="machine">
          <div class="marquee" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="animation-delay:${(i * 0.08).toFixed(2)}s"></i>`).join("")}</div>

          <div class="machine-head">
            <div class="machine-title" id="machine-title">${m.label}</div>
            <div class="machine-rtp">RTP <b>${m.rtp}</b> &middot; fee <b id="fee-badge">${(m.fee * 100).toFixed(2)}%</b> per spin</div>
          </div>

          <div class="reel-window">
            <canvas id="reel-canvas" role="img" aria-label="Five sector reels. Results are listed below the machine."></canvas>
            <div class="payline" aria-hidden="true"></div>
            <div class="win-banner" id="win-banner"></div>
          </div>

          <div class="sector-strip" id="sector-strip">
            ${Array.from({ length: REELS }, (_, i) => `
              <div class="sec-cell" id="sec-${i}">
                <span class="sec-name">—</span>
                <span class="sec-ret">·</span>
              </div>`).join("")}
          </div>

          <div class="marquee marquee--bottom" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="animation-delay:${(i * 0.08).toFixed(2)}s"></i>`).join("")}</div>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>Same spins, an index fund's fee</h2>
          <div class="counterfactual">
            <div class="cf-row cf-you">
              <span class="cf-name">This table<small>${(MODES.floor.fee * 100).toFixed(1)}% of every spin</small></span>
              <span class="cf-val" id="cf-real">${fmt(get().chips)}</span>
              <span class="cf-bar"><span id="cf-real-bar" style="width:50%"></span></span>
            </div>
            <div class="cf-row cf-disc">
              <span class="cf-name">Index fee<small>${(MODES.index.fee * 100).toFixed(2)}% of every spin</small></span>
              <span class="cf-val" id="cf-shadow">${fmt(get().reels.shadow)}</span>
              <span class="cf-bar"><span id="cf-shadow-bar" style="width:50%"></span></span>
            </div>
          </div>
          <p class="cf-note">Identical reels, identical draws. The only difference is what the house
          takes off the top. <span id="fees-paid">Fees paid so far: ${fmt(get().reels.feesPaid)} chips.</span></p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Your bet</h2>
          <div class="field">
            <label for="stake">Stake <b id="stake-val">100</b></label>
            <input type="range" id="stake" min="10" max="500" step="10" value="100" />
          </div>
          <div class="field">
            <label>Reels covered <b id="cov-val">5 — the index</b></label>
            <div class="cover-pick" id="cover-pick">
              ${[1, 2, 3, 4, 5].map((n) => `<button class="cov ${n === 5 ? "on" : ""}" data-cov="${n}">${n}</button>`).join("")}
            </div>
            <p class="hint" id="cov-hint">Five reels equally weighted is an index fund.</p>
          </div>
          <div class="actions">
            <button class="btn btn-primary btn-lg" id="spin">Spin</button>
            ${can("compound")
              ? `<button class="btn" id="hold-spins">Hold ${HOLD_SPINS} spins</button>`
              : ""}
            <button class="btn btn-ghost" id="mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          ${can("compound") ? `<p class="hint">A hold plays ${HOLD_SPINS} spins without asking you
            again — time in the market instead of ten decisions about it.</p>` : ""}
          <p class="edge-note" id="edge-note">House edge <b>${((1 - (1 - MODES.floor.fee)) * 100).toFixed(1)}%</b>,
          charged as a fee on every spin — exactly like a fund expense ratio. Nothing here is redeemable.</p>
        </div>

        <div class="panel" id="instrument">${instrumentHTML()}</div>

        <div class="panel" id="mode-panel">
          ${indexOpen() ? modeSwitchHTML() : `
            <h2>Locked</h2>
            <p class="cf-note">Something on this machine changes two numbers and nothing else, and
            it turns the only negative-expectation machine here into a positive-expectation one.
            You cannot unlock it by pulling the lever — no number of spins will do it. It is
            granted by <a href="#/ladder" data-nav><b>rung 01 of the Ladder</b></a>.</p>`}
        </div>

        <div class="panel">
          <h2>Ledger</h2>
          <table class="ledger">
            <thead><tr><th>Reels</th><th>Avg return</th><th>Stake</th><th style="text-align:right">Result</th></tr></thead>
            <tbody id="ledger"></tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function modeSwitchHTML() {
  const on = get().reels.indexMode;
  return `
    <h2>The machine</h2>
    <div class="mode-switch">
      <button class="mode-btn ${on ? "" : "on"}" data-mode="floor">
        <b>Casino Floor</b><small>4.50% fee · 0% drift · RTP 95.5%</small>
      </button>
      <button class="mode-btn ${on ? "on" : ""}" data-mode="index">
        <b>Index Mode</b><small>0.03% fee · +7% drift · RTP 107%</small>
      </button>
    </div>
    <p class="cf-note">Same reels, same code, same randomness. Two numbers changed. One of these
    is a slot machine and one is the stock market, and that is the entire difference.</p>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  canvas = document.getElementById("reel-canvas");
  ctx = canvas.getContext("2d");
  els = {
    machine: document.getElementById("machine"),
    banner: document.getElementById("win-banner"),
    stake: document.getElementById("stake"),
    stakeVal: document.getElementById("stake-val"),
    covVal: document.getElementById("cov-val"),
    covHint: document.getElementById("cov-hint"),
    spin: document.getElementById("spin"),
    mute: document.getElementById("mute"),
    ledger: document.getElementById("ledger"),
    modePanel: document.getElementById("mode-panel"),
    title: document.getElementById("machine-title"),
    feeBadge: document.getElementById("fee-badge"),
  };

  reels = Array.from({ length: REELS }, () => ({
    // integer start so the machine sits snapped on a symbol row, not halfway between two
    strip: buildStrip(), pos: Math.floor(Math.random() * STRIP_LEN), prev: 0,
    from: 0, to: 0, t0: 0, dur: 0, spinning: false, landed: false,
  }));

  els.stake.addEventListener("input", syncStake);
  els.spin.addEventListener("click", spin);
  const hb = document.getElementById("hold-spins");
  if (hb) hb.addEventListener("click", () => {
    if (holding > 0 || spinning) return;
    if (get().chips < +els.stake.value * 2) {
      els.banner.textContent = "Not enough chips to hold";
      els.banner.className = "win-banner show lose";
      return;
    }
    holding = HOLD_SPINS;
    hb.disabled = true;
    hb.textContent = `Holding — ${holding} left`;
    spin();
  });
  els.mute.addEventListener("click", () => { els.mute.textContent = toggleMute() ? "Sound off" : "Sound on"; });
  document.getElementById("cover-pick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cov]");
    if (!b || spinning) return;
    document.querySelectorAll("[data-cov]").forEach((x) => x.classList.toggle("on", x === b));
    syncCover();
    sfx.tick();
  });
  bindModeSwitch();
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", resize);

  resize();
  syncStake();
  syncCover();
  paintInstrument();
  renderLedger();
  renderCounterfactual();
  loop();
}

export function unmount() {
  cancelAnimationFrame(raf);
  // A hold left running would keep spinning against a torn-down table and keep charging the
  // bank for it. Leaving the table ends the hold.
  clearTimeout(holdTimer);
  holdTimer = 0;
  holding = 0;
  spinning = false;
  particles = [];
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", resize);
}

function onKey(e) {
  if (e.target.tagName === "INPUT" || e.code !== "Space") return;
  e.preventDefault();
  spin();
}

function bindModeSwitch() {
  els.modePanel.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      if (spinning) return;
      const s = get();
      s.reels.indexMode = b.dataset.mode === "index";
      save();
      els.modePanel.innerHTML = modeSwitchHTML();
      bindModeSwitch();
      applyMode();
      sfx.tick();
    })
  );
}

function applyMode() {
  const m = mode();
  els.title.textContent = m.label;
  els.feeBadge.textContent = (m.fee * 100).toFixed(2) + "%";
  els.machine.classList.toggle("machine--index", get().reels.indexMode);
}

const coverage = () => +(document.querySelector("[data-cov].on")?.dataset.cov || 5);

function syncStake() {
  els.stake.max = Math.max(10, Math.min(500, Math.floor(get().chips) || 10));
  els.stake.value = Math.min(+els.stake.value, +els.stake.max);
  els.stakeVal.textContent = fmt(+els.stake.value);
}

function syncCover() {
  const n = coverage();
  const labels = {
    1: "1 — one stock", 2: "2 — a pair", 3: "3 — a small basket",
    4: "4 — nearly diversified", 5: "5 — the index",
  };
  const hints = {
    1: "Everything on one sector. Biggest swings available.",
    2: "Two sectors. Variance already down about 29%.",
    3: "Three sectors. Variance down about 42%.",
    4: "Four sectors. Getting smooth.",
    5: "Five reels equally weighted is an index fund.",
  };
  els.covVal.textContent = labels[n];
  els.covHint.textContent = hints[n];
}

// ---------------------------------------------------------------- the spin

/**
 * The instrument panel. Each rung adds one layer, and a rung you have not bought shows what it
 * would add rather than hiding it — the Ladder already told you it exists, so pretending
 * otherwise here would just be coy.
 */
function instrumentHTML() {
  const r = get().reels;
  const rows = [];

  if (can("chart")) {
    rows.push(`<div class="inst-chart"><canvas id="reel-chart" role="img"
      aria-label="Your bank across the last ${Math.min(60, r.curve.length)} spins. The figures below state the same thing in numbers."></canvas></div>`);
  }

  if (can("vol")) {
    const v = r.rets.length >= 3 ? realizedVol(r.curve) : null;
    const dd = r.curve.length >= 3 ? maxDrawdown(r.curve) : null;
    rows.push(`
      <div class="blocks" style="margin-top:12px">
        <div class="cd-block cd-block--accent">
          <span class="cd-num">${v == null ? "—" : (v * 100).toFixed(1) + "%"}</span>
          <span class="cd-label">Vol / spin</span>
        </div>
        <div class="cd-block">
          <span class="cd-num">${dd == null ? "—" : (dd * 100).toFixed(0) + "%"}</span>
          <span class="cd-label">Worst fall</span>
        </div>
        <div class="cd-block">
          <span class="cd-num">${r.spins}</span><span class="cd-label">Spins</span>
        </div>
        <div class="cd-block">
          <span class="cd-num">${r.indexMode ? "+7%" : "0%"}</span><span class="cd-label">Drift</span>
        </div>
      </div>`);
  }

  if (can("volSizing")) {
    const sug = suggestedStake();
    rows.push(`
      <div class="inst-size">
        <div>
          <span class="inst-size-label">Volatility-sized stake</span>
          <span class="inst-size-val">${sug.stake ? fmt(sug.stake) : "—"}</span>
        </div>
        <button class="btn" id="apply-size" ${sug.stake ? "" : "disabled"}>Apply</button>
      </div>
      <p class="cf-note">${sug.note}</p>`);
  }

  if (!rows.length) {
    return `<h2>Instrument</h2>
      <p class="cf-note">This cabinet can do more than spin. <b>Rung 03</b> of the
      <a href="#/ladder" data-nav>Ladder</a> charts what you have played, <b>rung 04</b> measures
      how much it actually moves, and <b>rung 05</b> sizes the next bet off that measurement.
      None of it can be earned by pulling the lever.</p>`;
  }
  return `<h2>Instrument</h2>${rows.join("")}`;
}

/**
 * Half-Kelly on the measured numbers rather than a guess. This is the honest use of a chart:
 * it cannot tell you which way the next spin goes, but it can tell you how much it moves, and
 * that is the input sizing actually needs.
 */
function suggestedStake() {
  const r = get().reels;
  const bank = get().chips;
  if (r.rets.length < 5) {
    return { stake: 0, note: `Needs a few more spins — ${5 - r.rets.length} to go — before the
             measurement means anything.` };
  }
  const m = mode();
  const edge = m.drift / 52 - m.fee;          // expected return per spin, net of the fee
  const v = realizedVol(r.curve);
  if (edge <= 0) {
    return { stake: 0, note: `Measured edge is <b class="down">${(edge * 100).toFixed(2)}%</b> per
             spin. Kelly sizes a negative edge at <b>zero</b> — there is no stake that makes a
             losing game worth playing, which is the answer the formula gives and nobody wants.` };
  }
  const f = Math.max(0, Math.min(0.25, (edge / (v * v)) * 0.5));
  return {
    stake: Math.max(1, Math.round(bank * f)),
    note: `Edge <b class="up">${(edge * 100).toFixed(2)}%</b> per spin against measured volatility
           <b>${(v * 100).toFixed(1)}%</b> gives a half-Kelly fraction of
           <b>${(f * 100).toFixed(1)}%</b> of the bank.`,
  };
}

function paintInstrument() {
  const host = document.getElementById("instrument");
  if (!host) return;
  host.innerHTML = instrumentHTML();
  const c = document.getElementById("reel-chart");
  if (c) {
    const r = get().reels;
    drawChart(c, { kind: "series", values: r.curve.slice(-60), base: r.curve[0], h: 150,
              empty: "Spin to start the series" });
  }
  const ap = document.getElementById("apply-size");
  if (ap) ap.addEventListener("click", () => {
    const sug = suggestedStake();
    if (!sug.stake) return;
    els.stake.value = Math.min(sug.stake, +els.stake.max);
    syncStake();
    sfx.tick();
  });
}

function spin() {
  if (spinning) return;
  const stake = +els.stake.value;
  const covered = coverage();
  if (stake > get().chips) { els.banner.textContent = "Not enough chips"; els.banner.className = "win-banner show lose"; return; }

  spinning = true;
  flash = 0;
  particles = [];
  outcome = resolve(stake, covered);
  addChips(-stake);
  els.spin.disabled = true;
  els.stake.disabled = true;
  els.banner.className = "win-banner";
  els.machine.classList.remove("machine--win");
  for (let i = 0; i < REELS; i++) {
    const c = document.getElementById("sec-" + i);
    c.className = "sec-cell";
    c.querySelector(".sec-name").textContent = "—";
    c.querySelector(".sec-ret").textContent = "·";
  }
  sfx.lever();

  const now = performance.now();
  reels.forEach((r, i) => {
    const targetIdx = r.strip.indexOf(outcome.sectors[i]) >= 0
      ? r.strip.indexOf(outcome.sectors[i])
      : (r.strip[0] = outcome.sectors[i], 0);          // guarantee the sector exists on the strip
    const base = ((targetIdx + 2) % STRIP_LEN);
    const revs = 4 + i;                                 // later reels travel further
    let to = Math.ceil(r.pos / STRIP_LEN) * STRIP_LEN + revs * STRIP_LEN + base;
    while (to <= r.pos + STRIP_LEN) to += STRIP_LEN;
    r.from = r.pos;
    r.to = to;
    r.t0 = now + i * 90;                                // staggered start
    r.dur = 1250 + i * 320;                             // staggered stop
    r.spinning = true;
    r.landed = false;
  });
}

// Slight overshoot then settle — the mechanical snap of a real reel.
const easeOutBack = (p) => {
  const c = 1.22;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

let lastLoopTick = 0;

function loop(now = performance.now()) {
  let allDone = true;

  reels.forEach((r, i) => {
    r.prev = r.pos;
    if (!r.spinning) return;
    const p = (now - r.t0) / r.dur;
    if (p <= 0) { allDone = false; return; }
    if (p >= 1) {
      r.pos = r.to % STRIP_LEN;
      r.spinning = false;
      if (!r.landed) { r.landed = true; sfx.reelStop(i); revealSector(i); }
      return;
    }
    r.pos = r.from + (r.to - r.from) * easeOutBack(p);
    allDone = false;
  });

  // a soft mechanical whirr while anything is still moving
  if (!allDone && now - lastLoopTick > 190) { lastLoopTick = now; sfx.spinLoop(); }

  if (spinning && allDone) settle();

  updateParticles();
  draw(now);
  raf = requestAnimationFrame(loop);
}

function revealSector(i) {
  const s = SECTORS[outcome.sectors[i]];
  const ret = outcome.returns[i];
  const covered = i < outcome.covered;
  const cell = document.getElementById("sec-" + i);
  cell.className = "sec-cell in" + (covered ? " covered" : " dim");
  cell.style.setProperty("--sec", s.color);
  cell.querySelector(".sec-name").textContent = s.id;
  const r = cell.querySelector(".sec-ret");
  r.textContent = (ret >= 0 ? "+" : "") + (ret * 100).toFixed(1) + "%";
  r.className = "sec-ret " + (ret >= 0 ? "up" : "down");
}

function settle() {
  spinning = false;
  const o = outcome;
  const s = get();

  addChips(o.payout);
  s.reels.spins += 1;
  s.reels.wagered += o.stake;
  s.reels.feesPaid += o.fee;
  s.reels.shadow = Math.max(0, s.reels.shadow + o.shadowNet);
  s.reels.history.unshift({
    covered: o.covered, avg: o.avg, stake: o.stake, net: o.net, correlated: o.correlated,
  });
  s.reels.history = s.reels.history.slice(0, 40);
  // The series the chart and the volatility readout are computed from.
  s.reels.curve.push(Math.round(get().chips * 100) / 100);
  s.reels.curve = s.reels.curve.slice(-200);
  s.reels.rets.push(o.stake > 0 ? o.net / o.stake : 0);
  s.reels.rets = s.reels.rets.slice(-200);

  s.reels.indexUnlocked = indexOpen();
  save();
  bumpRounds("reels");

  // tier 0 loss, 1 win, 2 big win
  const tier = o.net <= 0 ? 0 : o.net > o.stake * 0.22 ? 2 : 1;
  o.tier = tier;

  if (tier > 0) {
    flash = 1;
    els.machine.classList.add("machine--win");
    spawnCoins(tier === 2 ? 46 : 20);
    sfx.win(tier);
    els.banner.textContent = `${tier === 2 ? "BIG WIN" : "WIN"}  +${fmt(o.net)}`;
    els.banner.className = "win-banner show win" + (tier === 2 ? " big" : "");
  } else {
    sfx.lose();
    els.banner.textContent = `${fmt(o.net)}`;
    els.banner.className = "win-banner show lose";
  }
  if (o.correlated) {
    els.banner.textContent += "  ·  CORRELATED";
    els.banner.classList.add("corr");
  }

  els.spin.disabled = false;
  els.stake.disabled = false;
  els.spin.textContent = "Spin again";
  syncStake();
  renderLedger();
  renderCounterfactual();
  paintInstrument();

  // A compounding hold keeps going on its own. Time in the market rather than ten decisions
  // about it — which is the whole point of the rung that unlocks it.
  if (holding > 0) {
    holding -= 1;
    const hb = document.getElementById("hold-spins");
    if (hb) hb.textContent = holding ? `Holding — ${holding} left` : `Hold ${HOLD_SPINS} spins`;
    if (holding > 0 && get().chips >= +els.stake.value) {
      holdTimer = setTimeout(() => { holdTimer = 0; if (holding > 0) spin(); }, 520);
      return;
    }
    holding = 0;
    if (hb) { hb.disabled = false; hb.textContent = `Hold ${HOLD_SPINS} spins`; }
    els.banner.textContent = `HELD ${HOLD_SPINS} SPINS`;
    els.banner.className = "win-banner show";
    teach("timeInMarket");
  }

  // The unlock branch used to skip cue() entirely, so the spin on which Index Mode appeared
  // was the one spin that taught nothing else. Reveal the panel, then cue as normal.
  if (indexOpen() && !els.modePanel.querySelector("[data-mode]")) {
    sfx.unlock();
    els.modePanel.innerHTML = modeSwitchHTML();
    bindModeSwitch();
    teach("feeDrag");
  }
  cue();
}

function cue() {
  const s = get();
  if (s.reels.spins >= 1) teach("reelsIntro");
  if (outcome.correlated) teach("correlation");
  if (s.reels.spins >= 3 && outcome.covered === 1) teach("diversification");
  if (s.reels.spins >= 12) teach("feeDrag");
}

// ---------------------------------------------------------------- coins

function spawnCoins(n) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (let i = 0; i < n; i++) {
    particles.push({
      x: w * (0.15 + Math.random() * 0.7),
      y: h + 10 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 3.2,
      vy: -(6.5 + Math.random() * 5.5),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      r: 5 + Math.random() * 4,
      life: 1,
      hue: Math.random() < 0.25 ? C.accentLit : C.accent,
    });
  }
}

function updateParticles() {
  const h = canvas.clientHeight;
  particles.forEach((p) => {
    p.vy += 0.28;
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    if (p.y > h + 60) p.life = 0;
  });
  particles = particles.filter((p) => p.life > 0);
  if (flash > 0) flash = Math.max(0, flash - 0.022);
}

// ---------------------------------------------------------------- drawing

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 640;
  const h = Math.round(w * 0.56);
  canvas.style.height = h + "px";
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(now) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const gap = 7;
  const rw = (w - gap * (REELS + 1)) / REELS;
  const ch = h / ROWS;

  ctx.clearRect(0, 0, w, h);

  reels.forEach((r, i) => {
    const x = gap + i * (rw + gap);
    const covered = i < coverage();
    const speed = Math.abs(r.pos - r.prev) * 60;      // symbols per second

    // reel housing
    ctx.save();
    roundRect(x, 0, rw, h, 9);
    ctx.clip();
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, C.bg);
    bg.addColorStop(0.5, C.surface2);
    bg.addColorStop(1, C.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(x, 0, rw, h);

    const frac = r.pos - Math.floor(r.pos);
    const base = Math.floor(r.pos);

    for (let row = 0; row <= ROWS + 1; row++) {
      const idx = ((base - row) % STRIP_LEN + STRIP_LEN) % STRIP_LEN;
      const s = SECTORS[r.strip[idx]];
      const y = (row + frac) * ch - ch;
      drawCell(x, y, rw, ch, s, speed, covered, row === 2 && !r.spinning);
    }

    // glass: top and bottom shading plus a highlight sheen
    const glass = ctx.createLinearGradient(0, 0, 0, h);
    glass.addColorStop(0, "rgba(0,0,0,0.78)");
    glass.addColorStop(0.24, "rgba(0,0,0,0.04)");
    glass.addColorStop(0.5, "rgba(255,255,255,0.045)");
    glass.addColorStop(0.76, "rgba(0,0,0,0.04)");
    glass.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = glass;
    ctx.fillRect(x, 0, rw, h);
    ctx.restore();

    // frame — lit if this reel is covered by the bet
    roundRect(x + 0.5, 0.5, rw - 1, h - 1, 9);
    ctx.lineWidth = covered ? 2 : 1;
    ctx.strokeStyle = covered ? "rgba(217,177,102,0.75)" : "rgba(86,104,94,0.4)";
    ctx.stroke();

    if (!covered) {
      ctx.fillStyle = "rgba(4,6,8,0.55)";
      roundRect(x, 0, rw, h, 9); ctx.fill();
      ctx.save();
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillStyle = "rgba(143,163,152,0.75)";
      ctx.textAlign = "center";
      ctx.fillText("NOT COVERED", x + rw / 2, h - 10);
      ctx.restore();
    }
  });

  // payline glow across the middle row
  ctx.save();
  const lineY = ch * 1.5;
  const lg = ctx.createLinearGradient(0, lineY - 3, 0, lineY + 3);
  lg.addColorStop(0, "rgba(217,177,102,0)");
  lg.addColorStop(0.5, `rgba(243,215,154,${0.5 + flash * 0.5})`);
  lg.addColorStop(1, "rgba(217,177,102,0)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, lineY - 3, w, 6);
  ctx.restore();

  if (flash > 0) {
    ctx.fillStyle = `rgba(243,215,154,${flash * 0.16})`;
    ctx.fillRect(0, 0, w, h);
  }

  // coins on top of everything
  particles.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, Math.max(0.25, Math.abs(Math.cos(p.rot))));   // spin-on-axis illusion
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.hue;
    ctx.shadowColor = "rgba(243,215,154,0.85)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  });
}

function drawCell(x, y, rw, ch, s, speed, covered, isPayrow) {
  const pad = 4;
  const cx = x + rw / 2, cy = y + ch / 2;
  if (y > ch * ROWS + ch || y < -ch * 1.5) return;

  const blur = Math.min(1, speed / 7);
  const glyphAlpha = Math.max(0, 1 - blur * 1.25);

  // colour band — at speed this is all you see, exactly like a real reel
  ctx.save();
  const band = ctx.createLinearGradient(0, y, 0, y + ch);
  band.addColorStop(0, hexA(s.color, 0.05 + blur * 0.16));
  band.addColorStop(0.5, hexA(s.color, 0.16 + blur * 0.4));
  band.addColorStop(1, hexA(s.color, 0.05 + blur * 0.16));
  ctx.fillStyle = band;
  roundRect(x + pad, y + pad * 0.6, rw - pad * 2, ch - pad * 1.2, 7);
  ctx.fill();

  if (isPayrow) {
    ctx.strokeStyle = hexA(s.color, 0.9);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();

  // vertical smear while fast
  if (blur > 0.12) {
    ctx.save();
    ctx.globalAlpha = blur * 0.5;
    const sm = ctx.createLinearGradient(0, y, 0, y + ch);
    sm.addColorStop(0, "rgba(255,255,255,0)");
    sm.addColorStop(0.5, hexA(s.color, 0.55));
    sm.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sm;
    ctx.fillRect(x + rw * 0.3, y, rw * 0.4, ch);
    ctx.restore();
  }

  if (glyphAlpha <= 0.03) return;

  ctx.save();
  ctx.globalAlpha = glyphAlpha * (covered ? 1 : 0.55);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = s.color;
  ctx.shadowBlur = isPayrow ? 22 : 10;
  ctx.fillStyle = s.color;
  ctx.font = `700 ${Math.round(ch * 0.4)}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillText(s.glyph, cx, cy - ch * 0.07);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = glyphAlpha * (covered ? 0.92 : 0.45);
  ctx.font = `700 ${Math.round(ch * 0.15)}px ui-monospace, monospace`;
  ctx.fillStyle = C.ink;
  ctx.fillText(s.id, cx, cy + ch * 0.24);
  ctx.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------- panels

function renderLedger() {
  const h = get().reels.history;
  if (!h.length) {
    els.ledger.innerHTML = `<tr><td colspan="4" class="empty">No spins yet.</td></tr>`;
    return;
  }
  els.ledger.innerHTML = h.slice(0, 9).map((r) => `
    <tr>
      <td>${r.covered}${r.correlated ? ' <span class="corr-dot" title="correlated">•</span>' : ""}</td>
      <td class="${r.avg >= 0 ? "win" : "lose"}">${r.avg >= 0 ? "+" : ""}${(r.avg * 100).toFixed(1)}%</td>
      <td>${fmt(r.stake)}</td>
      <td class="${r.net >= 0 ? "win" : "lose"}" style="text-align:right">${r.net >= 0 ? "+" : ""}${fmt(r.net)}</td>
    </tr>`).join("");
}

function renderCounterfactual() {
  const s = get();
  const a = s.chips, b = s.reels.shadow;
  const max = Math.max(a, b, 1);
  document.getElementById("cf-real").textContent = fmt(a);
  document.getElementById("cf-shadow").textContent = fmt(b);
  document.getElementById("cf-real-bar").style.width = Math.max(2, (a / max) * 100) + "%";
  document.getElementById("cf-shadow-bar").style.width = Math.max(2, (b / max) * 100) + "%";
  document.getElementById("fees-paid").textContent =
    `Fees paid so far: ${fmt(s.reels.feesPaid)} chips on ${fmt(s.reels.wagered)} wagered.`;

}
