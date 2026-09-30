// Table 7 — The Climb (crash). A multiplier rises until it doesn't.
//
// The distribution is the honest one: P(crash point > x) = (1 - edge) / x. That single line
// gives the table a flat 98% RTP at *every* exit target, which is the whole pedagogical point —
// greed cannot change your expected value, only your variance. The 2% edge is presented as a
// fee, never as a hidden weight.
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { C } from "./theme.js";

const EDGE = 0.02;            // 98% RTP, inside the real 96-99% band for crash games
const GROWTH = 0.17;          // multiplier = e^(GROWTH * seconds); ~4s to 2x
const DISCIPLINED = 1.07;     // the boring exit: roughly a year of market return
const MOONSHOT = 10;          // the lottery exit

let round = null;             // live round, or null between rounds
let raf = 0;
let canvas, ctx, els;

/** Crash point for one round. */
function drawCrashPoint() {
  const u = Math.random();
  const m = (1 - EDGE) / (1 - u);
  return Math.max(1, Math.floor(m * 100) / 100);
}

export function view() {
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>The Climb</h1>
        <p class="sub">The number climbs until it doesn't. Cash out whenever you like — but every
        exit point on this table has the <em>same</em> expected value, so the only thing your
        greed changes is how likely you are to still be here in a hundred rounds.</p>
      </div>
    </div>

    <div class="climb-grid">
      <div>
        <div class="felt" id="felt">
          <canvas id="climb-canvas" role="img" aria-label="The multiplier curve. The current multiplier is shown as text above it."></canvas>
          <div class="multi-overlay">
            <div class="multi" id="multi">1.00&times;</div>
            <div class="multi-note" id="multi-note">Set your stake and climb</div>
          </div>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>Same draws, three exit policies</h2>
          <div class="counterfactual">
            <div class="cf-row cf-you">
              <span class="cf-name">You<small>your actual exits</small></span>
              <span class="cf-val" id="cf-you">1,000</span>
              <span class="cf-bar"><span id="cf-you-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-disc">
              <span class="cf-name">Discipline<small>always exits at ${DISCIPLINED.toFixed(2)}&times;</small></span>
              <span class="cf-val" id="cf-disc">1,000</span>
              <span class="cf-bar"><span id="cf-disc-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-moon">
              <span class="cf-name">Moonshot<small>always holds for ${MOONSHOT}&times;</small></span>
              <span class="cf-val" id="cf-moon">1,000</span>
              <span class="cf-bar"><span id="cf-moon-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">All three stake the same share of their own bank on the same crash
          draws. Identical expected value per round, and they will not end up anywhere near each
          other. That gap is volatility drag.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Your bet</h2>
          <div class="field">
            <label for="stake">Stake <b id="stake-val">100</b></label>
            <input type="range" id="stake" min="10" max="500" step="10" value="100" />
            <div class="stake-row">
              <button class="btn" data-stake="50">50</button>
              <button class="btn" data-stake="100">100</button>
              <button class="btn" data-stake="250">250</button>
              <button class="btn" data-stake="max">Max</button>
            </div>
          </div>
          <div class="field">
            <label for="auto">Auto cash out at <b id="auto-val">off</b></label>
            <input type="range" id="auto" min="100" max="1000" step="5" value="100" />
          </div>
          <div class="actions">
            <button class="btn btn-primary btn-lg" id="go">Climb</button>
            <button class="btn btn-cash btn-lg" id="cash" disabled>Cash out</button>
            <button class="btn btn-ghost" id="sim" disabled>Simulate 50 rounds at this exit</button>
          </div>
          <p class="hint" id="hint">Deciding your exit <em>before</em> the round is the whole skill.</p>
          <p class="edge-note">RTP 98% &middot; house edge <b>2%</b> &middot; charged as a fee on every
          wager, exactly like a fund expense ratio. Nothing here is redeemable.</p>
        </div>

        <div class="panel">
          <h2>Ledger</h2>
          <table class="ledger">
            <thead><tr><th>Crash</th><th>Exit</th><th>Stake</th><th style="text-align:right">Result</th></tr></thead>
            <tbody id="ledger"></tbody>
          </table>
        </div>
      </div>
    </div>`;
}

export function mount() {
  canvas = document.getElementById("climb-canvas");
  ctx = canvas.getContext("2d");
  els = {
    felt: document.getElementById("felt"),
    multi: document.getElementById("multi"),
    note: document.getElementById("multi-note"),
    stake: document.getElementById("stake"),
    stakeVal: document.getElementById("stake-val"),
    auto: document.getElementById("auto"),
    autoVal: document.getElementById("auto-val"),
    go: document.getElementById("go"),
    cash: document.getElementById("cash"),
    sim: document.getElementById("sim"),
    hint: document.getElementById("hint"),
    ledger: document.getElementById("ledger"),
  };

  els.stake.addEventListener("input", syncStake);
  els.auto.addEventListener("input", syncAuto);
  document.querySelectorAll("[data-stake]").forEach((b) =>
    b.addEventListener("click", () => {
      const v = b.dataset.stake;
      els.stake.value = v === "max" ? Math.min(+els.stake.max, Math.floor(get().chips)) : v;
      syncStake();
    })
  );
  els.go.addEventListener("click", start);
  els.cash.addEventListener("click", () => cashOut(currentMult()));
  els.sim.addEventListener("click", simulate);
  window.addEventListener("resize", resize);
  document.addEventListener("keydown", onKey);

  resize();
  syncStake();
  syncAuto();
  drawFrame(1, null);
  renderLedger();
  renderCounterfactual();
}

export function unmount() {
  cancelAnimationFrame(raf);
  round = null;
  window.removeEventListener("resize", resize);
  document.removeEventListener("keydown", onKey);
}

function onKey(e) {
  if (e.target.tagName === "INPUT") return;
  if (e.code !== "Space") return;
  e.preventDefault();
  if (round && round.live) cashOut(currentMult());
  else if (!round) start();
}

function syncStake() {
  const max = Math.max(10, Math.min(+els.stake.max, Math.floor(get().chips)));
  els.stake.max = Math.max(10, Math.min(500, max));
  els.stake.value = Math.min(+els.stake.value, +els.stake.max);
  els.stakeVal.textContent = fmt(+els.stake.value);
}

function syncAuto() {
  const v = +els.auto.value / 100;
  const off = v <= 1.001;
  els.autoVal.textContent = off ? "off" : v.toFixed(2) + "x";
  els.sim.disabled = off || !!round;
  els.sim.textContent = off
    ? "Set an auto exit to simulate"
    : `Simulate 50 rounds at ${v.toFixed(2)}x`;
}

const autoTarget = () => {
  const v = +els.auto.value / 100;
  return v <= 1.001 ? null : v;
};

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 640;
  const h = Math.round(w * 10 / 16);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!round) drawFrame(1, null);
}

const currentMult = () =>
  round ? Math.max(1, Math.exp(GROWTH * ((performance.now() - round.t0) / 1000))) : 1;

// ---------------------------------------------------------------- a round

function start() {
  const stake = +els.stake.value;
  const bank = get().chips;
  if (round || stake < 10) return;
  if (stake > bank) { flashHint("Not enough chips. Lower the stake."); return; }

  round = {
    t0: performance.now(),
    stake,
    bankBefore: bank,
    crash: drawCrashPoint(),
    auto: autoTarget(),
    cashedAt: null,
    live: true,
    peak: 1,
  };
  addChips(-stake);

  els.go.disabled = true;
  els.cash.disabled = false;
  els.sim.disabled = true;
  els.stake.disabled = true;
  els.auto.disabled = true;
  els.multi.className = "multi";
  els.note.className = "multi-note";
  els.note.textContent = round.auto ? `auto exit armed at ${round.auto.toFixed(2)}x` : "space to cash out";
  loop();
}

function loop() {
  const m = currentMult();
  round.peak = m;

  if (round.live && round.auto && m >= round.auto) { cashOut(round.auto); return; }
  if (m >= round.crash) { bust(); return; }

  drawFrame(m, round);
  if (round.live) {
    els.multi.textContent = m.toFixed(2) + "×";
  }
  raf = requestAnimationFrame(loop);
}

function cashOut(at) {
  if (!round || !round.live) return;
  const mult = Math.min(at, round.crash);
  round.live = false;
  round.cashedAt = mult;

  const payout = round.stake * mult;
  addChips(payout);
  els.multi.textContent = mult.toFixed(2) + "×";
  els.multi.className = "multi cashed";
  els.note.className = "multi-note win";
  els.note.textContent = `cashed +${fmt(payout - round.stake)} chips`;
  els.cash.disabled = true;
  pop(`+${fmt(payout - round.stake)}`, C.successLit);

  // Keep animating in ghost mode so the player sees where it *would* have crashed.
  raf = requestAnimationFrame(ghost);
}

function ghost() {
  const m = currentMult();
  if (m >= round.crash) { settle(); return; }
  drawFrame(m, round);
  raf = requestAnimationFrame(ghost);
}

function bust() {
  round.live = false;
  els.multi.textContent = round.crash.toFixed(2) + "×";
  els.multi.className = "multi crashed";
  els.note.className = "multi-note lose";
  els.note.textContent = `crashed — lost ${fmt(round.stake)} chips`;
  els.felt.classList.add("shake");
  setTimeout(() => els.felt.classList.remove("shake"), 460);
  pop(`-${fmt(round.stake)}`, C.redLit);
  settle();
}

function settle() {
  cancelAnimationFrame(raf);
  drawFrame(round.crash, round, true);

  const s = get();
  const frac = round.stake / Math.max(1, round.bankBefore);
  s.climb.disciplined = applyPolicy(s.climb.disciplined, frac, DISCIPLINED, round.crash);
  s.climb.moonshot = applyPolicy(s.climb.moonshot, frac, MOONSHOT, round.crash);

  const won = round.cashedAt !== null;
  const net = won ? round.stake * round.cashedAt - round.stake : -round.stake;
  s.climb.biggestWin = Math.max(s.climb.biggestWin, net);
  s.climb.history.unshift({
    crash: round.crash, stake: round.stake, exit: round.cashedAt, net,
  });
  s.climb.history = s.climb.history.slice(0, 40);
  save();
  bumpRounds("climb");

  renderLedger();
  renderCounterfactual();
  const finished = round;
  round = null;

  els.go.disabled = false;
  els.cash.disabled = true;
  els.stake.disabled = false;
  els.auto.disabled = false;
  syncStake();
  syncAuto();
  els.go.textContent = "Climb again";

  cue(finished);
}

/** One round of a fixed-target policy on the same crash draw. */
function applyPolicy(bank, frac, target, crash) {
  const stake = bank * frac;
  if (stake <= 0) return bank;
  return crash >= target ? bank - stake + stake * target : bank - stake;
}

// ---------------------------------------------------------------- teaching cues

// teach() is show-once and queues, so these can all fire without stacking modals.
/**
 * These used to key on `s.rounds` — the GLOBAL counter every table bumps. A player who had
 * played sixteen rounds anywhere else and then opened The Climb got four modals queued
 * back-to-back on their first crash. Every other table counts its own hands; so does this now.
 */
function cue(r) {
  const s = get();
  const busts = s.climb.history.filter((h) => h.exit === null).length;
  const played = s.climb.history.length;

  if (played >= 1) teach("houseEdge");
  if (r.cashedAt === null && busts >= 1) teach("lossAversion");
  if (played >= 4) teach("sameEV");
  if (played >= 10) teach("volDrag");
  if (s.chips < 600) teach("ruin");
  if (played >= 16) teach("dispositionEffect");
}

// ---------------------------------------------------------------- fast-forward

function simulate() {
  const target = autoTarget();
  if (!target || round) return;
  const s = get();
  let net = 0;
  for (let i = 0; i < 50; i++) {
    const bank = s.chips + net;
    const stake = Math.min(+els.stake.value, Math.floor(bank));
    if (stake < 1) break;
    const crash = drawCrashPoint();
    const frac = stake / Math.max(1, bank);
    const hit = crash >= target;
    net += hit ? stake * target - stake : -stake;
    s.climb.disciplined = applyPolicy(s.climb.disciplined, frac, DISCIPLINED, crash);
    s.climb.moonshot = applyPolicy(s.climb.moonshot, frac, MOONSHOT, crash);
    s.climb.history.unshift({ crash, stake, exit: hit ? target : null, net: hit ? stake * target - stake : -stake });
    s.rounds += 1;
  }
  s.climb.history = s.climb.history.slice(0, 40);
  addChips(net);
  save();
  renderLedger();
  renderCounterfactual();
  els.note.className = "multi-note " + (net >= 0 ? "win" : "lose");
  els.note.textContent = `50 rounds at ${target.toFixed(2)}x: ${net >= 0 ? "+" : ""}${fmt(net)} chips`;
  els.multi.textContent = target.toFixed(2) + "×";
  els.multi.className = "multi " + (net >= 0 ? "cashed" : "crashed");
  pop(`${net >= 0 ? "+" : ""}${fmt(net)}`, net >= 0 ? C.successLit : C.redLit);
  teach("volDrag");
}

// ---------------------------------------------------------------- rendering

function renderLedger() {
  const h = get().climb.history;
  if (!h.length) {
    els.ledger.innerHTML = `<tr><td colspan="4" class="empty">No rounds yet.</td></tr>`;
    return;
  }
  els.ledger.innerHTML = h.slice(0, 9).map((r) => `
    <tr>
      <td>${r.crash.toFixed(2)}&times;</td>
      <td>${r.exit ? r.exit.toFixed(2) + "&times;" : "—"}</td>
      <td>${fmt(r.stake)}</td>
      <td class="${r.net >= 0 ? "win" : "lose"}" style="text-align:right">${r.net >= 0 ? "+" : ""}${fmt(r.net)}</td>
    </tr>`).join("");
}

function renderCounterfactual() {
  const s = get();
  const vals = { you: s.chips, disc: s.climb.disciplined, moon: s.climb.moonshot };
  const max = Math.max(vals.you, vals.disc, vals.moon, 1);
  for (const k of ["you", "disc", "moon"]) {
    document.getElementById("cf-" + k).textContent = fmt(vals[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (vals[k] / max) * 100) + "%";
  }
}

function pop(text, color) {
  const el = document.createElement("div");
  el.className = "pop";
  el.textContent = text;
  el.style.color = color;
  el.style.left = 48 + Math.random() * 12 + "%";
  el.style.top = "58%";
  els.felt.appendChild(el);
  setTimeout(() => el.remove(), 1150);
}

function flashHint(msg) {
  els.hint.textContent = msg;
  els.hint.style.color = C.redLit;
  setTimeout(() => {
    els.hint.innerHTML = "Deciding your exit <em>before</em> the round is the whole skill.";
    els.hint.style.color = "";
  }, 2200);
}

function drawFrame(mult, r, crashed = false) {
  const w = canvas.clientWidth;
  const h = Math.round(w * 10 / 16);
  const padL = 44, padR = 16, padT = 16, padB = 28;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  ctx.clearRect(0, 0, w, h);

  const tNow = r ? (performance.now() - r.t0) / 1000 : 0;
  const yMax = Math.max(2, mult * 1.18);
  const xMax = Math.max(5, tNow * 1.12);
  const X = (t) => padL + (t / xMax) * plotW;
  const Y = (m) => padT + plotH - ((m - 1) / (yMax - 1)) * plotH;

  // grid + multiplier labels
  ctx.font = "500 10px ui-monospace, monospace";
  ctx.textBaseline = "middle";
  const step = yMax > 20 ? 5 : yMax > 8 ? 2 : yMax > 4 ? 1 : 0.5;
  for (let m = 1; m <= yMax; m += step) {
    const y = Y(m);
    ctx.strokeStyle = "rgba(233,240,234,0.055)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = "rgba(143,163,152,0.55)";
    ctx.textAlign = "right";
    ctx.fillText(m.toFixed(m < 10 ? 2 : 0) + "x", padL - 8, y);
  }

  // the disciplined exit line, always visible as the quiet reference point
  const dy = Y(DISCIPLINED);
  if (dy > padT && dy < padT + plotH) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(34,197,94,0.45)";
    ctx.beginPath(); ctx.moveTo(padL, dy); ctx.lineTo(w - padR, dy); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(34,197,94,0.7)";
    ctx.textAlign = "left";
    ctx.fillText("discipline", padL + 6, dy - 9);
  }

  if (!r) {
    ctx.fillStyle = "rgba(86,104,94,0.75)";
    ctx.textAlign = "center";
    ctx.font = "500 11px ui-monospace, monospace";
    ctx.fillText("press CLIMB or hit space", padL + plotW / 2, padT + plotH / 2 + 74);
    return;
  }

  // curve samples
  const cashT = r.cashedAt ? Math.log(r.cashedAt) / GROWTH : null;
  const path = (from, to) => {
    ctx.beginPath();
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const t = from + (to - from) * (i / N);
      const m = Math.min(Math.exp(GROWTH * t), r.crash);
      const x = X(t), y = Y(m);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  };

  const liveEnd = cashT !== null ? Math.min(cashT, tNow) : tNow;
  const stroke = crashed && r.cashedAt === null ? C.redLit : C.successLit;

  // filled area under the live portion
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, crashed && r.cashedAt === null ? "rgba(239,68,68,0.28)" : "rgba(34,197,94,0.26)");
  grad.addColorStop(1, "rgba(34,197,94,0)");
  ctx.save();
  path(0, liveEnd);
  ctx.lineTo(X(liveEnd), Y(1));
  ctx.lineTo(X(0), Y(1));
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // the ghost tail: what happened after the player already left
  if (cashT !== null && tNow > cashT) {
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = crashed ? "rgba(239,68,68,0.6)" : "rgba(143,163,152,0.45)";
    ctx.lineWidth = 2;
    path(cashT, tNow);
    ctx.stroke();
    ctx.restore();
  }

  // the live curve
  ctx.save();
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 16;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  path(0, liveEnd);
  ctx.stroke();
  ctx.restore();

  // cash-out marker
  if (cashT !== null) {
    const x = X(cashT), y = Y(r.cashedAt);
    ctx.fillStyle = C.successLit;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(5,7,10,0.9)"; ctx.lineWidth = 2; ctx.stroke();
  }

  // head of the curve
  const headT = cashT !== null ? tNow : liveEnd;
  const headM = Math.min(Math.exp(GROWTH * headT), r.crash);
  if (!crashed || r.cashedAt === null) {
    const x = X(headT), y = Y(headM);
    ctx.save();
    ctx.shadowColor = stroke; ctx.shadowBlur = 20;
    ctx.fillStyle = crashed ? C.redLit : C.ink;
    ctx.beginPath(); ctx.arc(x, y, crashed ? 7 : 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
