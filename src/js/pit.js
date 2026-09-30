// Table 5 — The Options Pit (craps).
//
// Pass line is a long call: you win if the number comes back before the seven. Don't pass is a
// long put: you win on the crash. Both are priced with a small markup — 1.41% and 1.36%.
//
// Then there is the free-odds bet, which is the only wager in any casino paid at exactly true
// odds. Its expected value is zero to as many decimal places as you care to compute. You cannot
// win with it and you cannot lose with it, and that is precisely what makes it worth a table:
// it is the only chance most people get to see a derivative sold at fair value.
//
// The lesson is what happens when you put the two together. The flat bet keeps its 1.41% markup
// for ever — but spread across a larger position that is half fairly-priced, the blended cost
// collapses. Pass alone: −1.41%. Pass with 10x odds behind it: −0.18%. Nothing improved. The
// expensive part simply got diluted by something sold honestly.
import {
  playSequence, settle, blendedEdge, oddsEV, TRUE_ODDS, LAY_ODDS, POINTS, WAYS,
  pPointBefore7, maxOdds, oddsLabel, PASS_EDGE, DONT_EDGE,
} from "./craps-rules.js";
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";

const DENOMS = [5, 25, 100];
const ROLL_MS = 900;

let els, gen = 0, timers = [];
let side = "pass", flat = 0, odds = 0, denom = 25;
let phase = "betting";            // betting | rolling | settled
let seq = null, point = null, shown = [];

const after = (ms, fn) => { const g = gen; timers.push(setTimeout(() => { if (g === gen) fn(); }, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const signPct = (x) => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(3) + "%";

// ---------------------------------------------------------------- dice

const PIPS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

const dieSVG = (n, i) => `
  <svg class="die ${i ? "die--b" : ""}" viewBox="0 0 100 100" role="img" aria-label="${n}">
    <rect x="4" y="4" width="92" height="92" rx="18" fill="${i ? "url(#dieB)" : "#fdfbf6"}"
          stroke="rgba(0,0,0,0.22)"/>
    <defs><linearGradient id="dieB" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8c5afa"/><stop offset="100%" stop-color="#8228f0"/>
    </linearGradient></defs>
    ${(PIPS[n] || []).map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="9" fill="${i ? "#fff" : "#c02636"}"/>`).join("")}
  </svg>`;

// ---------------------------------------------------------------- view

export function view() {
  const s = get().pit;
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>The Options Pit</h1>
        <p class="sub">Pass line is a call — you win if the number comes back before the seven.
        Don't pass is a put — you win on the crash. Behind either of them sits the
        <em>free odds bet, the only wager in any casino with a house edge of exactly zero</em>.
        Watch what it does to the price of everything else.</p>
      </div>
    </div>

    <div class="pit-wrap">
      <div>
        <div class="pit-felt">
          <div class="pit-dice" id="pit-dice">${dieSVG(5, 0)}${dieSVG(2, 1)}</div>
          <div class="pit-read">
            <span class="pit-total" id="pit-total">—</span>
            <span class="pit-puck ${point ? "on" : ""}" id="pit-puck">
              ${point ? `POINT ${point}` : "COME OUT"}
            </span>
          </div>
          <p class="pit-msg" id="pit-msg">Back the call or the put, then roll.</p>

          <div class="pit-spots">
            <button class="pit-spot" data-side="pass">
              <span class="pit-spot-name">Pass Line</span>
              <span class="pit-spot-sub">long call &middot; wins on the point</span>
              <span class="pit-spot-edge">${signPct(PASS_EDGE)}</span>
              <span class="bac-chip" data-chip="pass"></span>
            </button>
            <button class="pit-spot" data-side="dont">
              <span class="pit-spot-name">Don't Pass</span>
              <span class="pit-spot-sub">long put &middot; wins on the seven</span>
              <span class="pit-spot-edge">${signPct(DONT_EDGE)}</span>
              <span class="bac-chip" data-chip="dont"></span>
            </button>
          </div>

          <div class="pit-odds" id="pit-odds"></div>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>What the odds bet does to the price</h2>
          <div class="ln-scroll">
            <table class="ledger pit-ev">
              <thead><tr>
                <th>Position</th><th>Flat</th><th>Odds</th><th>Total at risk</th>
                <th style="text-align:right">Blended house edge</th>
              </tr></thead>
              <tbody>
                ${[0, 1, 2, 3, 5, 10].map((m) => `
                  <tr class="${m === 10 ? "bac-best" : ""}" data-mult="${m}">
                    <td>${m === 0 ? "Pass line only" : `Pass + ${m}× odds`}</td>
                    <td>1 unit</td>
                    <td>${m === 0 ? "—" : `${m} units`}</td>
                    <td>${(1 + m * (24 / 36)).toFixed(2)} units</td>
                    <td style="text-align:right" class="${m >= 5 ? "win" : "lose"}">${signPct(blendedEdge(m))}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <p class="cf-note">The flat bet never gets cheaper — it carries the same
          <b>−1.414%</b> for ever. What changes is how much of your position is priced fairly.
          <b>Nothing here improved; the expensive part got diluted.</b> This is exactly why a
          low-cost wrapper around the same exposure beats an expensive one, and why paying for
          the wrapper rather than the exposure is the mistake.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Your position</h2>
          <div class="denoms" id="pit-denoms">
            ${DENOMS.map((d) => `<button class="denom ${d === denom ? "on" : ""}" data-denom="${d}">${d}</button>`).join("")}
          </div>
          <p class="hint">Click a spot to back it. Shift-click to take chips back.</p>
          <div class="actions" style="margin-top:14px">
            <button class="btn btn-primary btn-lg" id="pit-roll">Roll</button>
            <button class="btn" id="pit-clear">Clear</button>
            <button class="btn btn-ghost" id="pit-mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          <p class="hint" id="pit-staked">Nothing staked.</p>
          <p class="edge-note">Pass <b>1.41%</b> &middot; don't pass <b>1.36%</b> &middot;
          free odds <b>0.00%</b>. Nothing here is redeemable.</p>
        </div>

        <div class="panel" id="pit-payoff-panel">
          <h2>Payoff</h2>
          <div id="pit-payoff"></div>
        </div>

        <div class="panel">
          <h2>Same rolls, three positions</h2>
          <div class="counterfactual">
            <div class="cf-row cf-disc">
              <span class="cf-name">Pass + max odds<small>mostly fairly priced</small></span>
              <span class="cf-val" id="cf-odds">${fmt(s.withOdds)}</span>
              <span class="cf-bar"><span id="cf-odds-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-you">
              <span class="cf-name">Pass line only<small>all of it marked up</small></span>
              <span class="cf-val" id="cf-flat">${fmt(s.flatOnly)}</span>
              <span class="cf-bar"><span id="cf-flat-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-moon">
              <span class="cf-name">Don't pass<small>the other side</small></span>
              <span class="cf-val" id="cf-dont">${fmt(s.dontSide)}</span>
              <span class="cf-bar"><span id="cf-dont-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">All three stake the same share of their own bank on your rolls. The
          odds line swings hardest and costs least — more risk for less fee is the trade a fairly
          priced instrument actually offers.</p>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  gen++;
  clearTimers();
  side = "pass"; flat = 0; odds = 0; phase = "betting"; seq = null; point = null; shown = [];

  els = {
    dice: document.getElementById("pit-dice"),
    total: document.getElementById("pit-total"),
    puck: document.getElementById("pit-puck"),
    msg: document.getElementById("pit-msg"),
    oddsBox: document.getElementById("pit-odds"),
    roll: document.getElementById("pit-roll"),
    clear: document.getElementById("pit-clear"),
    mute: document.getElementById("pit-mute"),
    staked: document.getElementById("pit-staked"),
    payoff: document.getElementById("pit-payoff"),
  };

  document.querySelectorAll("[data-side]").forEach((b) =>
    b.addEventListener("click", (e) => place(b.dataset.side, e.shiftKey ? -1 : 1)));
  document.getElementById("pit-denoms").addEventListener("click", (e) => {
    const b = e.target.closest("[data-denom]");
    if (!b) return;
    denom = +b.dataset.denom;
    document.querySelectorAll("[data-denom]").forEach((x) => x.classList.toggle("on", x === b));
    sfx.tick();
  });
  els.roll.addEventListener("click", roll);
  els.clear.addEventListener("click", () => {
    if (phase !== "betting") return;
    flat = 0; odds = 0; renderBet(); sfx.tick();
  });
  els.mute.addEventListener("click", () => {
    els.mute.textContent = toggleMute() ? "Sound off" : "Sound on";
  });
  els.oddsBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-odds]");
    if (!b || phase !== "betting" || !point) return;
    const want = +b.dataset.odds * flat;
    odds = odds === want ? 0 : Math.min(want, get().chips - flat);
    renderBet();
    sfx.coin();
    teach("freeOdds");
  });

  renderBet();
  renderCounterfactual();
}

export function unmount() { gen++; clearTimers(); }

// ---------------------------------------------------------------- betting

function place(which, dir) {
  if (phase !== "betting") return;
  if (point) { els.staked.textContent = "The point is set — the line bet is locked until it resolves."; return; }
  if (which !== side) { side = which; }
  if (dir > 0) {
    if (flat + denom > get().chips) { els.staked.textContent = "Not enough chips."; return; }
    flat += denom;
    sfx.coin();
  } else {
    flat = Math.max(0, flat - denom);
  }
  if (flat === 0) odds = 0;
  renderBet();
}

function renderBet() {
  document.querySelectorAll("[data-side]").forEach((b) =>
    b.classList.toggle("on", b.dataset.side === side && flat > 0));
  document.querySelectorAll("[data-chip]").forEach((c) => {
    const on = c.dataset.chip === side && flat > 0;
    c.textContent = on ? fmt(flat) : "";
    c.className = "bac-chip" + (on ? " on" : "");
  });

  // the odds rail only exists once a point is established
  if (!point || flat <= 0) {
    els.oddsBox.innerHTML = point
      ? `<p class="hint">Back the line to take odds behind it.</p>`
      : `<p class="hint">Odds can only be taken once a point is established — that is when the
         bet becomes a real option on a specific number.</p>`;
  } else {
    const cap = maxOdds(point);
    els.oddsBox.innerHTML = `
      <div class="pit-oddsrow">
        <span class="pit-oddslabel">Free odds behind the ${side === "pass" ? "call" : "put"}
          &middot; pays <b>${side === "pass" ? oddsLabel(point) : LAY_ODDS[point].join(":")}</b>
          &middot; edge <b class="up">0.000%</b></span>
        <div class="pit-oddsbtns">
          ${Array.from({ length: cap }, (_, i) => i + 1).map((m) => `
            <button class="pit-oddsbtn ${odds === m * flat ? "on" : ""}" data-odds="${m}">${m}×</button>`).join("")}
        </div>
      </div>`;
  }

  const total = flat + odds;
  els.staked.innerHTML = total > 0
    ? `<b>${fmt(total)}</b> at risk &middot; ${fmt(flat)} on the line${
        odds ? ` + ${fmt(odds)} at true odds` : ""} &middot; blended edge
       <b class="${odds ? "up" : "down"}">${signPct(blendedEdge(flat ? odds / flat : 0))}</b>`
    : "Nothing staked.";

  renderPayoff();
}

// ---------------------------------------------------------------- the option payoff shape

function renderPayoff() {
  const isCall = side === "pass";
  const p = point ? pPointBefore7(point) : null;
  els.payoff.innerHTML = `
    <svg viewBox="0 0 220 120" class="pit-payoff-svg" role="img" focusable="false"
         aria-label="${isCall ? "long call" : "long put"} payoff">
      <line x1="16" y1="90" x2="206" y2="90" stroke="rgba(255,255,255,0.18)"/>
      <line x1="16" y1="14" x2="16" y2="100" stroke="rgba(255,255,255,0.18)"/>
      ${isCall
        ? `<path d="M16 90 L112 90 L200 26" fill="none" stroke="var(--success)" stroke-width="3" stroke-linejoin="round"/>
           <text x="104" y="106" font-size="9" fill="#8b8fa3">the point repeats &rarr;</text>`
        : `<path d="M16 26 L112 90 L200 90" fill="none" stroke="var(--red-lit)" stroke-width="3" stroke-linejoin="round"/>
           <text x="104" y="106" font-size="9" fill="#8b8fa3">the seven arrives &rarr;</text>`}
      <circle cx="112" cy="90" r="3.5" fill="var(--accent-lit)"/>
      <text x="118" y="84" font-size="9" fill="var(--accent-lit)">strike</text>
    </svg>
    <p class="cf-note">You are long a <b>${isCall ? "call" : "put"}</b>.
    ${point
      ? `The strike is the point <b>${point}</b>, which repeats before a seven
         <b>${(p * 100).toFixed(1)}%</b> of the time. The odds bet behind it pays
         <b>${oddsLabel(point)}</b> — exactly those odds, with nothing taken out.`
      : `Once a point is set it becomes an option on that specific number, and the odds bet
         behind it is that same option priced at fair value.`}</p>`;
}

// ---------------------------------------------------------------- rolling

function roll() {
  if (phase === "rolling") return;
  if (phase === "settled") { reset(); return; }
  if (flat <= 0) { els.staked.textContent = "Back the call or the put first."; return; }
  if (flat + odds > get().chips) { els.staked.textContent = "Not enough chips."; return; }

  addChips(-(flat + odds));
  phase = "rolling";
  els.roll.disabled = true;
  els.clear.disabled = true;
  sfx.lever();

  seq = playSequence();
  shown = [];
  seq.rolls.forEach((r, i) => {
    after(ROLL_MS * (i + 1), () => {
      shown.push(r);
      els.dice.innerHTML = dieSVG(r.a, 0) + dieSVG(r.b, 1);
      els.dice.classList.remove("tumble");
      void els.dice.offsetWidth;
      els.dice.classList.add("tumble");
      els.total.textContent = r.total;
      sfx.reelStop(i);

      if (i === 0 && seq.point) {
        point = seq.point;
        els.puck.textContent = `POINT ${point}`;
        els.puck.className = "pit-puck on";
        els.msg.textContent = `Point is ${point}. It repeats before a seven ` +
          `${(pPointBefore7(point) * 100).toFixed(1)}% of the time.`;
      } else if (i > 0) {
        els.msg.textContent = r.total === 7 ? "Seven out." : `${r.total} — roll again.`;
      }
    });
  });

  after(ROLL_MS * (seq.rolls.length + 1), finish);
}

function finish() {
  const r = settle({ side, flat, odds }, seq);
  addChips(r.returned);

  const s = get(), t = s.pit;
  t.rolls += seq.rolls.length;
  t.decisions += 1;
  t.wagered += r.push ? 0 : flat + odds;
  t.oddsWagered += r.push ? 0 : odds;
  t.history.unshift({ result: seq.result, point: seq.point, net: r.net });
  t.history = t.history.slice(0, 40);

  // three shadow positions on the same sequence, each staking a share of its own bank
  const frac = 0.04;
  const shadows = [
    ["withOdds", { side: "pass", mult: seq.point ? maxOdds(seq.point) : 0 }],
    ["flatOnly", { side: "pass", mult: 0 }],
    ["dontSide", { side: "dont", mult: 0 }],
  ];
  for (const [key, cfg] of shadows) {
    const f = t[key] * frac;
    const o = f * cfg.mult;
    const sr = settle({ side: cfg.side, flat: f, odds: o }, seq);
    t[key] = Math.max(0, t[key] - (f + o) + sr.returned);
  }
  save();
  bumpRounds("pit");

  const won = r.net > 0;
  els.msg.className = "pit-msg " + (r.push ? "push" : won ? "win" : "lose");
  els.msg.textContent = r.push
    ? "Twelve on the come-out — barred. The put pushes."
    : `${seq.result === "pass" ? "Pass" : "Don't pass"} wins` +
      `   ${won ? "+" : "−"}${fmt(Math.abs(r.net))}` +
      (odds ? `  (${fmt(r.flatNet)} line, ${fmt(r.oddsNet)} odds)` : "");
  if (r.push) sfx.tick(); else if (won) sfx.win(odds ? 2 : 1); else sfx.lose();

  phase = "settled";
  els.roll.disabled = false;
  els.clear.disabled = false;
  els.roll.textContent = "New come-out";
  renderCounterfactual();

  teach("passIsACall");     // earned by a roll, not handed over on arrival
  if (t.decisions >= 2) teach("dontIsAPut");
  if (t.oddsWagered > 0 && t.decisions >= 3) teach("dilution");
  if (t.decisions >= 8) teach("freeIsNotCheap");
}

function reset() {
  phase = "betting";
  point = null; seq = null; flat = 0; odds = 0;
  els.roll.textContent = "Roll";
  els.puck.textContent = "COME OUT";
  els.puck.className = "pit-puck";
  els.msg.className = "pit-msg";
  els.msg.textContent = "Back the call or the put, then roll.";
  els.total.textContent = "—";
  renderBet();
}

function renderCounterfactual() {
  const t = get().pit;
  const v = { odds: t.withOdds, flat: t.flatOnly, dont: t.dontSide };
  const max = Math.max(v.odds, v.flat, v.dont, 1);
  for (const k of ["odds", "flat", "dont"]) {
    document.getElementById("cf-" + k).textContent = fmt(v[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (v[k] / max) * 100) + "%";
  }
}
