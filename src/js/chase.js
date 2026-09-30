// Table 6 — Number Chase (keno).
//
// The worst expected value in the building, wearing the best story. Every other table is priced
// within a couple of percent of fair; this one takes a quarter of everything staked and people
// queue for it, because the top line of the paytable says 100,000.
//
// The table's whole job is to print the two numbers side by side. A ten-spot jackpot pays
// 100,000 to 1 and lands once in 8.9 million tickets — one a day for twenty-four thousand years.
// Neither number is a secret. Only one of them is ever quoted.
//
// This is the penny stock, the meme ticker and the 0DTE call. Same structure, same arithmetic,
// same reason it keeps working on people.
import {
  POOL, DRAWN, MAX_SPOTS, PAYTABLE, pHit, expectedReturn, houseEdge, pAnyPrize, topPrize,
  drawBalls, settle, yearsPerHit,
} from "./keno-rules.js";
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";

const DENOMS = [5, 25, 100];
const BALL_MS = 120;

let els, gen = 0, timers = [];
let picks = [], stake = 25, denom = 25, phase = "picking", balls = [], hitSet = new Set();

const after = (ms, fn) => { const g = gen; timers.push(setTimeout(() => { if (g === gen) fn(); }, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const pct = (x) => (x * 100).toFixed(2) + "%";
const oneIn = (p) => (p > 0 ? Math.round(1 / p).toLocaleString("en-US") : "—");

// ---------------------------------------------------------------- view

export function view() {
  const s = get().chase;
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>Number Chase</h1>
        <p class="sub">Eighty numbers, twenty drawn. Pick as many as you like. Every prize on the
        board is real and every probability beside it is real, and
        <em>this is the only table in the building where those two facts are usually kept apart</em>.</p>
      </div>
    </div>

    <div class="chase-wrap">
      <div>
        <div class="chase-felt">
          <div class="chase-board" id="chase-board">
            ${Array.from({ length: POOL }, (_, i) => `
              <button class="kn-num" data-num="${i + 1}">${i + 1}</button>`).join("")}
          </div>
          <p class="chase-msg" id="chase-msg">Pick up to ${MAX_SPOTS} numbers.</p>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>Your ticket, priced honestly</h2>
          <div class="ln-scroll">
            <table class="ledger" id="chase-pay">
              <thead><tr><th>Hits</th><th>Pays</th><th>Chance</th><th>One in</th>
                <th style="text-align:right">Contributes to return</th></tr></thead>
              <tbody><tr><td colspan="5" class="empty">Pick some numbers.</td></tr></tbody>
            </table>
          </div>
          <p class="cf-note" id="chase-note">The last column is the only one that matters: it is
          what each prize is actually worth per chip staked. Add them up and you have the return.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Ticket</h2>
          <div class="denoms" id="chase-denoms">
            ${DENOMS.map((d) => `<button class="denom ${d === denom ? "on" : ""}" data-denom="${d}">${d}</button>`).join("")}
          </div>
          <div class="chase-summary" id="chase-summary"></div>
          <div class="actions" style="margin-top:14px">
            <button class="btn btn-primary btn-lg" id="chase-draw">Draw</button>
            <button class="btn" id="chase-quick">Quick pick</button>
            <button class="btn" id="chase-clear">Clear</button>
            <button class="btn btn-ghost" id="chase-mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          <p class="edge-note">House edge <b>24&ndash;28%</b> depending on how many you pick —
          the worst number in this building by a factor of twenty. Nothing here is redeemable.</p>
        </div>

        <div class="panel chase-jackpot" id="chase-jackpot"></div>

        <div class="panel">
          <h2>Same money, two habits</h2>
          <div class="counterfactual">
            <div class="cf-row cf-moon">
              <span class="cf-name">Chasing<small>a ticket every draw</small></span>
              <span class="cf-val" id="cf-chase">${fmt(s.chasing)}</span>
              <span class="cf-bar"><span id="cf-chase-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-disc">
              <span class="cf-name">Boring<small>the same stake, index fund</small></span>
              <span class="cf-val" id="cf-boring">${fmt(s.boring)}</span>
              <span class="cf-bar"><span id="cf-boring-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">The boring line puts the identical stake into a broad low-fee basket
          at its long-run drift instead of onto a ticket. It will never once feel exciting, and
          you already know how this ends.</p>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  gen++;
  clearTimers();
  picks = []; phase = "picking"; balls = []; hitSet = new Set();
  stake = denom;

  els = {
    board: document.getElementById("chase-board"),
    msg: document.getElementById("chase-msg"),
    pay: document.querySelector("#chase-pay tbody"),
    note: document.getElementById("chase-note"),
    summary: document.getElementById("chase-summary"),
    jackpot: document.getElementById("chase-jackpot"),
    draw: document.getElementById("chase-draw"),
    quick: document.getElementById("chase-quick"),
    clear: document.getElementById("chase-clear"),
    mute: document.getElementById("chase-mute"),
  };

  els.board.addEventListener("click", (e) => {
    const b = e.target.closest("[data-num]");
    if (b) toggle(+b.dataset.num);
  });
  document.getElementById("chase-denoms").addEventListener("click", (e) => {
    const b = e.target.closest("[data-denom]");
    if (!b) return;
    denom = +b.dataset.denom; stake = denom;
    document.querySelectorAll("[data-denom]").forEach((x) => x.classList.toggle("on", x === b));
    renderTicket();
    sfx.tick();
  });
  els.draw.addEventListener("click", draw);
  els.quick.addEventListener("click", quickPick);
  els.clear.addEventListener("click", () => { if (phase === "picking") { picks = []; renderAll(); sfx.tick(); } });
  els.mute.addEventListener("click", () => {
    els.mute.textContent = toggleMute() ? "Sound off" : "Sound on";
  });

  renderAll();
}

export function unmount() { gen++; clearTimers(); }

// ---------------------------------------------------------------- picking

function toggle(n) {
  if (phase !== "picking") { reset(); return; }
  const i = picks.indexOf(n);
  if (i >= 0) { picks.splice(i, 1); sfx.tick(); }
  else {
    if (picks.length >= MAX_SPOTS) { els.msg.textContent = `Ten is the most this board takes.`; return; }
    picks.push(n);
    sfx.coin();
  }
  renderAll();
}

function quickPick() {
  if (phase !== "picking") reset();
  const want = picks.length || 6;
  const pool = Array.from({ length: POOL }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  picks = pool.slice(0, want).sort((a, b) => a - b);
  sfx.coin();
  renderAll();
}

// ---------------------------------------------------------------- the draw

function draw() {
  if (phase === "drawing") return;
  if (phase === "settled") { reset(); return; }
  if (!picks.length) { els.msg.textContent = "Pick at least one number."; return; }
  if (stake > get().chips) { els.msg.textContent = "Not enough chips."; return; }

  addChips(-stake);
  phase = "drawing";
  els.draw.disabled = true;
  els.quick.disabled = true;
  els.clear.disabled = true;
  balls = drawBalls();
  hitSet = new Set();
  document.querySelectorAll(".kn-num").forEach((b) => b.classList.remove("drawn", "hit", "miss"));
  sfx.lever();

  balls.forEach((n, i) => {
    after(BALL_MS * (i + 1), () => {
      const b = els.board.querySelector(`[data-num="${n}"]`);
      const isHit = picks.includes(n);
      b.classList.add("drawn", isHit ? "hit" : "miss");
      if (isHit) { hitSet.add(n); sfx.coin(); } else sfx.tick();
      els.msg.textContent = `${i + 1} of ${DRAWN} drawn · ${hitSet.size} of your ${picks.length} hit`;
    });
  });

  after(BALL_MS * DRAWN + 600, finish);
}

function finish() {
  const r = settle(picks.length, picks, balls, stake);
  addChips(r.returned);

  const s = get(), t = s.chase;
  t.tickets += 1;
  t.wagered += stake;
  t.returned += r.returned;
  t.bestHits = Math.max(t.bestHits, r.count);
  t.history.unshift({ spots: picks.length, hits: r.count, net: r.net });
  t.history = t.history.slice(0, 40);

  // Chasing stakes the same amount every draw; boring puts it in a broad basket instead.
  t.chasing = Math.max(0, t.chasing - stake + r.returned);
  t.boring = t.boring + stake * 0.0002;   // a day of broad-market drift on the same money
  save();
  bumpRounds("chase");

  const won = r.net > 0;
  els.msg.className = "chase-msg " + (won ? "win" : "lose");
  els.msg.textContent = r.multiple
    ? `${r.count} of ${picks.length} — pays ${r.multiple} for 1 · ${won ? "+" : ""}${fmt(r.net)}`
    : `${r.count} of ${picks.length} — nothing. −${fmt(stake)}`;
  if (won) sfx.win(r.multiple >= 50 ? 2 : 1); else sfx.lose();

  phase = "settled";
  els.draw.disabled = false;
  els.quick.disabled = false;
  els.clear.disabled = false;
  els.draw.textContent = "New ticket";
  renderCounterfactual();

  teach("chaseIntro");      // earned by a ticket, not handed over on arrival
  if (t.tickets >= 1) teach("quotedAndUnquoted");
  if (t.tickets >= 4) teach("lotteryBrain");
  if (t.tickets >= 10) teach("chaseVsBoring");
}

function reset() {
  phase = "picking";
  balls = []; hitSet = new Set();
  els.draw.textContent = "Draw";
  els.msg.className = "chase-msg";
  document.querySelectorAll(".kn-num").forEach((b) => b.classList.remove("drawn", "hit", "miss"));
  renderAll();
}

// ---------------------------------------------------------------- panels

function renderAll() {
  document.querySelectorAll(".kn-num").forEach((b) =>
    b.classList.toggle("on", picks.includes(+b.dataset.num)));
  renderTicket();
  renderPaytable();
  renderJackpot();
  renderCounterfactual();
  if (phase === "picking") els.msg.textContent = picks.length
    ? `${picks.length} picked · ${MAX_SPOTS - picks.length} more allowed`
    : `Pick up to ${MAX_SPOTS} numbers.`;
}

function renderTicket() {
  const n = picks.length;
  if (!n) { els.summary.innerHTML = `<p class="hint">No numbers picked.</p>`; return; }
  els.summary.innerHTML = `
    <div class="blocks" style="margin-top:12px">
      <div class="cd-block cd-block--accent"><span class="cd-num">${n}</span><span class="cd-label">Spots</span></div>
      <div class="cd-block"><span class="cd-num">${fmt(stake)}</span><span class="cd-label">Stake</span></div>
      <div class="cd-block"><span class="cd-num">${(pAnyPrize(n) * 100).toFixed(0)}%</span><span class="cd-label">Win any</span></div>
      <div class="cd-block"><span class="cd-num">${(houseEdge(n) * 100).toFixed(0)}%</span><span class="cd-label">Edge</span></div>
    </div>`;
}

function renderPaytable() {
  const n = picks.length;
  if (!n) {
    els.pay.innerHTML = `<tr><td colspan="5" class="empty">Pick some numbers.</td></tr>`;
    return;
  }
  const pay = PAYTABLE[n] || {};
  const rows = Object.keys(pay).map(Number).sort((a, b) => b - a);
  els.pay.innerHTML = rows.map((h) => {
    const p = pHit(n, h);
    const contrib = p * pay[h];
    return `
      <tr>
        <td>${h} of ${n}</td>
        <td>${pay[h]} for 1</td>
        <td>${p < 0.0001 ? p.toExponential(1) : pct(p)}</td>
        <td>${oneIn(p)}</td>
        <td style="text-align:right" class="${contrib > 0.25 ? "" : "lose"}">${contrib.toFixed(4)}</td>
      </tr>`;
  }).join("");
  els.note.innerHTML = `Those contributions sum to <b>${expectedReturn(n).toFixed(4)}</b> per chip
    staked — a return of <b>${pct(expectedReturn(n))}</b>, for a house edge of
    <b class="down">${pct(houseEdge(n))}</b>. The jackpot line contributes almost none of it.`;
}

function renderJackpot() {
  const n = picks.length;
  if (!n) { els.jackpot.innerHTML = `<h2>The headline</h2><p class="hint">Pick some numbers.</p>`; return; }
  const t = topPrize(n);
  const years = yearsPerHit(t.p);
  els.jackpot.innerHTML = `
    <h2>The headline</h2>
    <div class="prize" style="margin-bottom:12px">
      <span class="prize-label">Top prize · ${t.hit} of ${n}</span>
      <span class="prize-fig">${t.pays.toLocaleString("en-US")}&times;</span>
      <p class="prize-sub">${fmt(stake * t.pays)} on a ${fmt(stake)} ticket.</p>
    </div>
    <p class="cf-note">And the number that never appears next to it: <b>one in
    ${oneIn(t.p)}</b>. At one ticket a day that is
    <b>${years < 1 ? "under a year" : Math.round(years).toLocaleString("en-US") + " years"}</b>.
    It is worth <b>${(t.p * t.pays).toFixed(4)}</b> per chip — about
    ${((t.p * t.pays) / expectedReturn(n) * 100).toFixed(1)}% of everything this ticket returns.</p>`;
}

function renderCounterfactual() {
  const t = get().chase;
  const v = { chase: t.chasing, boring: t.boring };
  const max = Math.max(v.chase, v.boring, 1);
  for (const k of ["chase", "boring"]) {
    document.getElementById("cf-" + k).textContent = fmt(v[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (v[k] / max) * 100) + "%";
  }
}
