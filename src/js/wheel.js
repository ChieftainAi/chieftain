// Table 3 — The Wheel (roulette).
//
// A real European wheel: 37 pockets in their true physical order, the full betting layout, and
// the real payouts. Verified: every bet type carries an identical 2.7027% house edge, and their
// standard deviations run from 1.00 to 5.84. That gap is the entire table.
//
// The twist: the EV column shows every bet you place reading the same −2.70%, while the coverage
// meter shows how wildly different the ride is. One number is a single stock. Red is the market.
// And the green zero is inflation — it is where all of the edge comes from, and it never stops.
import {
  WHEEL, POCKETS, RED, colorOf, BETS, betLabel, betWins, betPayout, betCovers,
  betEV, betStdev, coveredPockets, settle,
} from "./roulette-rules.js";
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";
import { C, alpha, mix } from "./theme.js";

const SPIN_MS = 6200;
const LOCK = 0.76;            // fraction of the spin after which the ball rides in its pocket
const WHEEL_REVS = 5.5;
const BALL_REVS = 9;
const DENOMS = [5, 25, 100];

let canvas, ctx, els;
let bets = {};                // betId -> chips
let denom = 25;
let spin = null;              // { t0, n, pocketIndex }
let raf = 0, lastTickPocket = -1, gen = 0;
let winFlash = 0;

const pocketAngle = (n) => (WHEEL.indexOf(n) / POCKETS) * Math.PI * 2;
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
const easeOutQuart = (p) => 1 - Math.pow(1 - p, 4);
const easeInQuad = (p) => p * p;
const totalStaked = () => Object.values(bets).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------- view

const NUM_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

function layoutHTML() {
  const cell = (n) => `
    <button class="rl-num ${colorOf(n)}" data-bet="straight:${n}" title="Straight up on ${n} — pays 35 to 1">
      ${n}<span class="rl-chip" data-chip="straight:${n}"></span>
    </button>`;
  return `
    <div class="rl-layout">
      <button class="rl-zero green" data-bet="straight:0" title="Straight up on 0 — pays 35 to 1">
        0<span class="rl-chip" data-chip="straight:0"></span>
      </button>
      <div class="rl-grid">
        ${NUM_ROWS.map((row, i) => `
          ${row.map(cell).join("")}
          <button class="rl-side" data-bet="column:${[3, 2, 1][i]}" title="Column — pays 2 to 1">
            2:1<span class="rl-chip" data-chip="column:${[3, 2, 1][i]}"></span>
          </button>`).join("")}
      </div>
      <div class="rl-outside">
        ${[["dozen:1", "1st 12"], ["dozen:2", "2nd 12"], ["dozen:3", "3rd 12"]]
          .map(([id, t]) => `<button class="rl-out wide" data-bet="${id}">${t}<span class="rl-chip" data-chip="${id}"></span></button>`).join("")}
      </div>
      <div class="rl-outside">
        ${[["half:low", "1–18"], ["parity:even", "EVEN"], ["color:red", "◆"], ["color:black", "◆"], ["parity:odd", "ODD"], ["half:high", "19–36"]]
          .map(([id, t]) => `<button class="rl-out ${id === "color:red" ? "red" : id === "color:black" ? "black" : ""}" data-bet="${id}">${t}<span class="rl-chip" data-chip="${id}"></span></button>`).join("")}
      </div>
    </div>`;
}

export function view() {
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>The Wheel</h1>
        <p class="sub">A real European wheel — 37 pockets, true pocket order, real payouts. Every
        bet on this layout has the <em>exact same</em> expected value of −2.70%, and their
        volatilities differ by nearly six times. One number is a single stock. Red is the market.
        <em>The green zero is inflation.</em></p>
      </div>
    </div>

    <div class="rl-wrap">
      <div>
        <div class="rl-felt">
          <div class="rl-top">
            <div class="rl-wheelbox">
              <canvas id="wheel-canvas" role="img" aria-label="Roulette wheel. Results are announced below."></canvas>
              <div class="rl-result" id="rl-result"></div>
            </div>
            <div class="rl-history" id="rl-history"></div>
          </div>
          ${layoutHTML()}
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>Your board</h2>
          <table class="ledger rl-ev">
            <thead><tr><th>Bet</th><th>Chips</th><th>Pockets</th><th>Pays</th><th>Edge</th><th style="text-align:right">Volatility</th></tr></thead>
            <tbody id="ev-body"></tbody>
          </table>
          <p class="cf-note" id="coverage-note">Place chips to see the numbers.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Chips</h2>
          <div class="denoms" id="denoms">
            ${DENOMS.map((d) => `<button class="denom ${d === denom ? "on" : ""}" data-denom="${d}">${d}</button>`).join("")}
          </div>
          <p class="hint">Click the layout to place. Right-click or shift-click a spot to take chips back.</p>
          <div class="actions" style="margin-top:14px">
            <button class="btn btn-primary btn-lg" id="spin">Spin</button>
            <button class="btn" id="clear">Clear board</button>
            <button class="btn btn-ghost" id="mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          <p class="hint" id="staked-note">Nothing staked.</p>
          <p class="edge-note">RTP 97.30% &middot; house edge <b>2.70%</b> on every bet, all of it
          coming from the single green pocket. Nothing here is redeemable.</p>
        </div>

        <div class="panel">
          <h2>Coverage</h2>
          <div class="cover-meter" id="cover-meter">
            ${Array.from({ length: POCKETS }, (_, i) => `<i data-pocket="${WHEEL[i]}"></i>`).join("")}
          </div>
          <p class="cf-note" id="cover-read">0 of 37 pockets covered.</p>
        </div>

        <div class="panel">
          <h2>Same spins, three strategies</h2>
          <div class="counterfactual">
            <div class="cf-row cf-you">
              <span class="cf-name">You<small>your actual board</small></span>
              <span class="cf-val" id="cf-you">${fmt(get().chips)}</span>
              <span class="cf-bar"><span id="cf-you-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-disc">
              <span class="cf-name">Broad<small>always red · 18 pockets</small></span>
              <span class="cf-val" id="cf-broad">${fmt(get().wheel.broad)}</span>
              <span class="cf-bar"><span id="cf-broad-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-moon">
              <span class="cf-name">Single<small>always one number</small></span>
              <span class="cf-val" id="cf-single">${fmt(get().wheel.single)}</span>
              <span class="cf-bar"><span id="cf-single-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">Both counterfactuals have precisely the same expected value as each
          other and as you. Watch which one still has chips in an hour.</p>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  gen++;
  canvas = document.getElementById("wheel-canvas");
  ctx = canvas.getContext("2d");
  els = {
    result: document.getElementById("rl-result"),
    history: document.getElementById("rl-history"),
    evBody: document.getElementById("ev-body"),
    coverageNote: document.getElementById("coverage-note"),
    coverMeter: document.getElementById("cover-meter"),
    coverRead: document.getElementById("cover-read"),
    stakedNote: document.getElementById("staked-note"),
    spin: document.getElementById("spin"),
    clear: document.getElementById("clear"),
    mute: document.getElementById("mute"),
  };
  bets = {}; spin = null; winFlash = 0;

  document.querySelectorAll("[data-bet]").forEach((b) => {
    b.addEventListener("click", (e) => place(b.dataset.bet, e.shiftKey ? -1 : 1));
    b.addEventListener("contextmenu", (e) => { e.preventDefault(); place(b.dataset.bet, -1); });
  });
  document.getElementById("denoms").addEventListener("click", (e) => {
    const b = e.target.closest("[data-denom]");
    if (!b) return;
    denom = +b.dataset.denom;
    document.querySelectorAll("[data-denom]").forEach((x) => x.classList.toggle("on", x === b));
    sfx.tick();
  });
  els.spin.addEventListener("click", doSpin);
  els.clear.addEventListener("click", () => { bets = {}; renderBoard(); sfx.tick(); });
  els.mute.addEventListener("click", () => { els.mute.textContent = toggleMute() ? "Sound off" : "Sound on"; });
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", resize);

  resize();
  renderBoard();
  renderHistory();
  renderCounterfactual();
  loop();
}

export function unmount() {
  gen++;
  cancelAnimationFrame(raf);
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", resize);
}

function onKey(e) {
  if (e.target.tagName === "INPUT" || e.code !== "Space") return;
  e.preventDefault();
  doSpin();
}

function place(id, dir) {
  if (spin) return;
  const cur = bets[id] || 0;
  if (dir > 0) {
    if (totalStaked() + denom > get().chips) { els.stakedNote.textContent = "Not enough chips for that."; return; }
    bets[id] = cur + denom;
    sfx.coin();
  } else {
    const next = cur - denom;
    if (next > 0) bets[id] = next; else delete bets[id];
    sfx.tick();
  }
  renderBoard();
}

// ---------------------------------------------------------------- spinning

function doSpin() {
  if (spin) return;
  const staked = totalStaked();
  if (staked <= 0) { els.stakedNote.textContent = "Place a bet first."; return; }
  if (staked > get().chips) { els.stakedNote.textContent = "Not enough chips."; return; }

  addChips(-staked);
  const n = WHEEL[Math.floor(Math.random() * POCKETS)];
  spin = { t0: performance.now(), n, staked, settled: false };
  lastTickPocket = -1;
  winFlash = 0;
  els.result.className = "rl-result";
  els.result.textContent = "";
  els.spin.disabled = true;
  els.clear.disabled = true;
  document.querySelectorAll("[data-bet]").forEach((b) => b.classList.remove("hit"));
  sfx.lever();
}

function loop(now = performance.now()) {
  draw(now);
  if (spin && !spin.settled && (now - spin.t0) / SPIN_MS >= 1) finish();
  if (winFlash > 0) winFlash = Math.max(0, winFlash - 0.014);
  raf = requestAnimationFrame(loop);
}

function finish() {
  spin.settled = true;
  const n = spin.n;
  const r = settle(bets, n);
  addChips(r.returned);

  const s = get();
  const frac = spin.staked / Math.max(1, spin.staked + s.chips - r.returned);
  // The counterfactuals stake the same share of their own bank on the same pocket.
  s.wheel.broad = applyStrategy(s.wheel.broad, frac, "color:red", n);
  s.wheel.single = applyStrategy(s.wheel.single, frac, "straight:17", n);
  s.wheel.spins += 1;
  s.wheel.wagered += r.staked;
  s.wheel.edgePaid += r.staked / POCKETS;
  s.wheel.history.unshift(n);
  s.wheel.history = s.wheel.history.slice(0, 14);
  save();
  bumpRounds("wheel");

  const covered = coveredPockets(bets);
  els.result.textContent = `${n}  ${r.net >= 0 ? "+" : ""}${fmt(r.net)}`;
  els.result.className = "rl-result show " + colorOf(n) + (r.net > 0 ? " win" : r.net < 0 ? " lose" : "");
  if (r.net > 0) { winFlash = 1; sfx.win(r.net > r.staked * 3 ? 2 : 1); }
  else sfx.lose();

  r.winners.forEach((id) => document.querySelector(`[data-bet="${id}"]`)?.classList.add("hit"));

  els.spin.disabled = false;
  els.clear.disabled = false;
  els.spin.textContent = "Spin again";
  renderHistory();
  renderCounterfactual();
  renderBoard();

  if (s.wheel.spins >= 1) teach("wheelEV");
  if (n === 0) teach("theZero");
  if (covered.size <= 2 && s.wheel.spins >= 2) teach("concentration");
  if (s.wheel.spins >= 8) teach("theZero");
  spin = null;
}

function applyStrategy(bank, frac, id, n) {
  const stake = bank * frac;
  if (stake <= 0) return bank;
  return betWins(id, n) ? bank - stake + stake * (betPayout(id) + 1) : bank - stake;
}

// ---------------------------------------------------------------- the wheel drawing

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = canvas.clientWidth || 300;
  canvas.style.height = size + "px";
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function draw(now) {
  const S = canvas.clientWidth;
  if (!S) return;
  const R = S / 2;
  const cx = R, cy = R;

  let p = 0, wheelAngle = 0, ballAngle = 0, ballR = R * 0.955, landed = false;

  if (spin) {
    p = Math.min(1, (now - spin.t0) / SPIN_MS);
    wheelAngle = WHEEL_REVS * Math.PI * 2 * easeOutCubic(p);
    const pa = pocketAngle(spin.n);
    const lockWheel = WHEEL_REVS * Math.PI * 2 * easeOutCubic(LOCK);
    const lockTarget = lockWheel + pa - BALL_REVS * Math.PI * 2;

    if (p < LOCK) {
      ballAngle = lockTarget * easeOutQuart(p / LOCK);
      const drop = easeInQuad(Math.max(0, (p / LOCK - 0.45) / 0.55));
      ballR = R * (0.955 - 0.155 * drop);
      // rattle: a click each time the ball crosses a pocket, once it has slowed enough
      const idx = Math.floor((((-ballAngle + wheelAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * POCKETS);
      if (p > 0.5 && idx !== lastTickPocket) { lastTickPocket = idx; if (Math.random() < 0.55) sfx.tick(); }
    } else {
      landed = true;
      ballAngle = wheelAngle + pa;
      const b = (p - LOCK) / (1 - LOCK);
      const bounce = Math.abs(Math.cos(b * 14)) * Math.exp(-b * 9);
      ballR = R * (0.80 + 0.035 * bounce);
    }
  } else {
    // idle: a slow drift so the table feels alive
    wheelAngle = (now / 22000) * Math.PI * 2;
    ballAngle = -(now / 26000) * Math.PI * 2;
  }

  ctx.clearRect(0, 0, S, S);

  // outer brass rim
  const rim = ctx.createLinearGradient(0, 0, S, S);
  rim.addColorStop(0, C.metalLit); rim.addColorStop(0.45, mix(C.metal, "#000000", 0.45));
  rim.addColorStop(0.7, C.metal); rim.addColorStop(1, mix(C.metalDim, "#000000", 0.55));
  ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
  ctx.fillStyle = rim; ctx.fill();

  ctx.beginPath(); ctx.arc(cx, cy, R * 0.945, 0, Math.PI * 2);
  ctx.fillStyle = C.bg; ctx.fill();

  // pocket ring
  const rOut = R * 0.93, rIn = R * 0.70;
  const step = (Math.PI * 2) / POCKETS;
  for (let i = 0; i < POCKETS; i++) {
    const n = WHEEL[i];
    const a0 = wheelAngle + i * step - Math.PI / 2 - step / 2;
    const a1 = a0 + step;
    ctx.beginPath();
    ctx.arc(cx, cy, rOut, a0, a1);
    ctx.arc(cx, cy, rIn, a1, a0, true);
    ctx.closePath();
    const c = colorOf(n);
    const hit = spin && landed && n === spin.n;
    ctx.fillStyle = hit
      ? alpha(C.accentLit, 0.55 + winFlash * 0.45)
      : c === "red" ? mix(C.red, "#000000", 0.32)
      : c === "black" ? C.surface1
      : mix(C.success, "#000000", 0.30);
    ctx.fill();
    ctx.strokeStyle = alpha(C.accentLit, 0.28);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // number, rotated to sit in its pocket
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a0 + step / 2 + Math.PI / 2);
    ctx.fillStyle = hit ? "#160c2e" : C.ink;
    ctx.font = `700 ${Math.max(7, R * 0.085)}px ui-monospace, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(n), 0, -(rOut + rIn) / 2);
    ctx.restore();
  }

  // deflector diamonds on the rim
  for (let i = 0; i < 8; i++) {
    const a = wheelAngle * 0.4 + (i / 8) * Math.PI * 2;
    const x = cx + Math.cos(a) * R * 0.655, y = cy + Math.sin(a) * R * 0.655;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = C.metalLit;
    ctx.beginPath();
    const d = R * 0.032;
    ctx.moveTo(0, -d); ctx.lineTo(d * 0.62, 0); ctx.lineTo(0, d); ctx.lineTo(-d * 0.62, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // cone and turret
  const cone = ctx.createRadialGradient(cx - R * 0.12, cy - R * 0.14, R * 0.05, cx, cy, R * 0.70);
  cone.addColorStop(0, mix(C.metal, "#000000", 0.55)); cone.addColorStop(0.55, C.surface2);
  cone.addColorStop(1, C.bg);
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.70, 0, Math.PI * 2);
  ctx.fillStyle = cone; ctx.fill();

  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(wheelAngle);
  ctx.strokeStyle = alpha(C.metalLit, 0.7);
  ctx.lineWidth = Math.max(2, R * 0.025);
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-R * 0.6, 0); ctx.lineTo(R * 0.6, 0);
    ctx.stroke();
    ctx.rotate(Math.PI / 2);
  }
  ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = C.metal; ctx.fill();
  ctx.restore();

  // the ball
  const bx = cx + Math.cos(ballAngle - Math.PI / 2) * ballR;
  const by = cy + Math.sin(ballAngle - Math.PI / 2) * ballR;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  const bg = ctx.createRadialGradient(bx - R * 0.012, by - R * 0.014, R * 0.004, bx, by, R * 0.038);
  bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.7, "#e6e3f2"); bg.addColorStop(1, "#9a95b0");
  ctx.beginPath(); ctx.arc(bx, by, R * 0.036, 0, Math.PI * 2);
  ctx.fillStyle = bg; ctx.fill();
  ctx.restore();

  if (winFlash > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2);
    ctx.fillStyle = alpha(C.accentLit, winFlash * 0.16);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- panels

function renderBoard() {
  document.querySelectorAll("[data-chip]").forEach((c) => {
    const amt = bets[c.dataset.chip];
    c.textContent = amt ? fmt(amt) : "";
    c.className = "rl-chip" + (amt ? " on" : "");
  });

  const ids = Object.keys(bets);
  const staked = totalStaked();
  els.stakedNote.textContent = staked
    ? `${fmt(staked)} chips on ${ids.length} spot${ids.length === 1 ? "" : "s"}.`
    : "Nothing staked.";

  if (!ids.length) {
    els.evBody.innerHTML = `<tr><td colspan="6" class="empty">Board is clear.</td></tr>`;
    els.coverageNote.textContent = "Place chips to see the numbers.";
  } else {
    els.evBody.innerHTML = ids.map((id) => `
      <tr>
        <td>${betLabel(id)}</td>
        <td>${fmt(bets[id])}</td>
        <td>${betCovers(id)}/37</td>
        <td>${betPayout(id)}:1</td>
        <td class="lose">${(betEV(id) * 100).toFixed(2)}%</td>
        <td style="text-align:right">${betStdev(id).toFixed(2)}&times;</td>
      </tr>`).join("");
    els.coverageNote.innerHTML = `Every row in that edge column reads <b>−2.70%</b> — it always
      will, for every bet on this layout. The column that actually differs is the last one.`;
  }

  const covered = coveredPockets(bets);
  document.querySelectorAll("[data-pocket]").forEach((i) => {
    const n = +i.dataset.pocket;
    i.className = covered.has(n) ? "on " + colorOf(n) : "";
  });
  const pct = ((covered.size / POCKETS) * 100).toFixed(0);
  els.coverRead.innerHTML = covered.size
    ? `<b>${covered.size} of 37</b> pockets covered (${pct}%). ${covered.size >= 18
        ? "This is roughly what owning the market feels like."
        : covered.size <= 3 ? "This is what owning one stock feels like." : "A sector-sized bet."}`
    : "0 of 37 pockets covered.";
}

function renderHistory() {
  const h = get().wheel.history;
  els.history.innerHTML = h.length
    ? h.map((n, i) => `<span class="rl-hist ${colorOf(n)} ${i === 0 ? "fresh" : ""}">${n}</span>`).join("")
    : `<span class="rl-hist-empty">No spins yet</span>`;
}

function renderCounterfactual() {
  const s = get();
  const v = { you: s.chips, broad: s.wheel.broad, single: s.wheel.single };
  const max = Math.max(v.you, v.broad, v.single, 1);
  for (const k of ["you", "broad", "single"]) {
    document.getElementById("cf-" + k).textContent = fmt(v[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (v[k] / max) * 100) + "%";
  }
}
