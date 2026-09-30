// Table 9 — The Line (sports betting).
//
// The lesson is that a price is a probability wearing a disguise, and that the disguise costs
// money. Every market here is posted from a fair number plus a published markup, so the
// overround is visible and de-viggable and nothing is weighted against the player beyond it.
// The markup is loaded onto the underdog, which is the favourite-longshot bias and is the one
// thing that makes this board different from the roulette table, where every bet cost the same.
//
// The edge, when it exists, is real and it is earned. The book's estimate of a game carries
// about 2.8 points of error; an unresearched read carries 8.5 and leans toward the underdog on
// top of that; a researched read carries 1.4. Two research slots against five games is the whole
// argument of the table — you can only beat a consensus where you have done work the consensus
// has not, and you cannot do that everywhere. The rest is closing line value, which is how you
// tell a good decision from a good result.
import {
  profitPerUnit, toDecimal, toProb, formatOdds, postMarket, devig, sideCost,
  ev, kelly, clv, gauss, clamp,
} from "./line-rules.js";
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";
import { hasUnlock } from "./curriculum.js";

const SLATE_SIZE = 5;

// Attention and sharpness are both earned on the Ladder. The advanced rungs buy exactly what
// advanced reading buys in life: more things you can afford to look at properly, and a tighter
// estimate when you do. This is the one place where learning is literally the mechanic.
const researchSlots = () => {
  const L = get().prestige.level;
  return 2 + (hasUnlock(L, "slot3") ? 1 : 0) + (hasUnlock(L, "slot4") ? 1 : 0);
};
const deepSd = () => {
  const L = get().prestige.level;
  return hasUnlock(L, "deepen2") ? 0.009 : hasUnlock(L, "deepen1") ? 0.011 : 0.014;
};
const BOOK_SD = 0.028;      // the market's error. Sharp, not perfect.
const GUT_SD = 0.085;       // your error with no work done. Blunter than the market.
const CLOSE_SD = 0.014;     // the closing line, after everyone else has done their work too.
// An untrained read is not merely noisy, it leans. Everyone overrates the underdog, which is
// the same bias the board is already charging extra for. Noise you can average away. A lean
// you cannot, and it is what actually separates a losing bettor from a break-even one.
const GUT_TILT = 0.35;
const CHALK_STAKE = 0.05;   // the chalk counterfactual flat-bets 5% of its bank, every game.
const SHARP_MIN_EDGE = 0.03;

const CLUBS = [
  ["IRN", "Ironpine"], ["CAL", "Calder Vale"], ["NKP", "North Keep"], ["SVW", "Seventh Ward"],
  ["BRM", "Bramble Hall"], ["ASH", "Ashford Union"], ["PKM", "Pike & Main"], ["LOW", "Low Country"],
  ["CYG", "Grand Cygnet"], ["HAL", "Halcyon Bay"], ["TSL", "Tessellate"], ["BKW", "Blackwater"],
];

let els, slate = [], slip = {}, phase = "open", week = 1, gen = 0;
let timers = [];
let slotsUsed = 0;

const after = (ms, fn) => { const g = gen; timers.push(setTimeout(() => { if (g === gen) fn(); }, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const pct = (x) => (x * 100).toFixed(1) + "%";
const signPct = (x) => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1) + "%";

const read = (g) => (g.researched ? g.deep : g.gut);
const readSd = (g) => (g.researched ? g.deepSd : GUT_SD);
const sideProb = (g, side) => (side === "home" ? read(g) : 1 - read(g));
const totalStaked = () => Object.values(slip).reduce((a, b) => a + b.stake, 0);

// ---------------------------------------------------------------- the slate

function makeSlate() {
  const pool = shuffle(CLUBS.slice());
  return Array.from({ length: SLATE_SIZE }, (_, i) => {
    const away = pool[i * 2], home = pool[i * 2 + 1];
    // Three uniforms averaged, scaled so a real league slate comes out: most fixtures land
    // near a coin flip and price in the -110 to -200 range, with the occasional -300 mismatch.
    const pTrue = clamp(0.5 + (Math.random() + Math.random() + Math.random() - 1.5) * 0.26, 0.20, 0.80);
    const overround = 0.035 + Math.random() * 0.023;
    const pBook = clamp(pTrue + gauss(BOOK_SD), 0.04, 0.96);
    const g = {
      i, rot: 101 + i * 2, home, away, pTrue, overround,
      open: postMarket(pBook, overround),
      close: null,
      gut: clamp(pTrue + gauss(GUT_SD) + GUT_TILT * (0.5 - pTrue), 0.02, 0.98),
      deep: clamp(pTrue + gauss(deepSd()), 0.02, 0.98),
      deepSd: deepSd(),
      researched: false,
      notes: null,
      result: null,
    };
    g.market = devig(g.open.home, g.open.away);
    return g;
  });
}

const PRO = [
  "{a} have had nine days off. {b} are playing a third away fixture in six.",
  "{a}'s first-choice keeper came through training. The price has not moved on it.",
  "{b} lost two midfielders to suspension after this line was posted.",
  "{a}'s underlying numbers over five matches are far better than their record.",
  "Public money is stacked on {b}; the board has drifted past where the work says it sits.",
  "{b} have a manager decision pending this week and the squad knows it.",
  "{a} are unbeaten in this fixture since the ground was rebuilt.",
  "{b}'s finishing has been running well above what their chances justify. That regresses.",
];
const NEUTRAL = [
  "Forecast is clean. No weather edge either way.",
  "Both squads at full strength otherwise.",
  "Head-to-head across three seasons is dead level.",
  "Neither side has a European midweek to manage.",
];

function researchNotes(g) {
  const d = g.deep - g.market.home;
  const [a, b] = d >= 0 ? [g.home[1], g.away[1]] : [g.away[1], g.home[1]];
  const fill = (s) => s.replace(/\{a\}/g, a).replace(/\{b\}/g, b);
  const mag = Math.abs(d);
  const verdict =
    mag < 0.02 ? "Nothing here the market has not already priced."
    : mag < 0.05 ? "A small disagreement with the board. It may be nothing."
    : "The work lands a long way from where this is posted.";
  return shuffle(PRO).slice(0, 2).map(fill).concat(shuffle(NEUTRAL)[0], verdict);
}

// ---------------------------------------------------------------- view

function rowHTML(g) {
  const side = (s) => {
    const club = g[s];
    return `
      <button class="ln-side" data-pick="${g.i}:${s}">
        <span class="ln-tag">${club[0]}</span>
        <span class="ln-name">${club[1]}</span>
        <span class="ln-price" data-price="${g.i}:${s}">${formatOdds(g.open[s])}</span>
      </button>`;
  };
  return `
    <div class="ln-row" data-row="${g.i}">
      <div class="ln-main">
        <div class="ln-rot">${g.rot}</div>
        ${side("away")}
        <span class="ln-at">at</span>
        ${side("home")}
        <div class="ln-edgebox" data-edge="${g.i}"></div>
      </div>
      <div class="ln-meta">
        <div class="ln-gaugewrap">
          <span class="ln-gt">${g.away[0]}</span>
          <span class="ln-gauge">
            <i class="ln-band" data-band="${g.i}"></i>
            <i class="ln-mark ln-mark--mkt" data-mkt="${g.i}"></i>
            <i class="ln-mark ln-mark--you" data-you="${g.i}"></i>
          </span>
          <span class="ln-gt">${g.home[0]}</span>
        </div>
        <button class="ln-research" data-research="${g.i}">Research</button>
      </div>
      <p class="ln-notes" data-notes="${g.i}" hidden></p>
    </div>`;
}

export function view() {
  const s = get().line;
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>The Line</h1>
        <p class="sub">Every price on this board is a probability wearing a disguise. Add both
        sides of any market and you get more than 100% &mdash; that surplus is the fee, and it is
        the only edge the house has here. <em id="slot-copy">You get two research slots against five games</em>,
        because the one place an edge can live is in work nobody else has done.</p>
      </div>
    </div>

    <div class="ln-wrap">
      <div>
        <div class="ln-board">
          <div class="ln-boardhead">
            <span class="ln-league"><i class="ln-live"></i> MERIDIAN LEAGUE &middot; WEEK <b id="ln-week">1</b></span>
            <span class="ln-phase" id="ln-phase">Board open</span>
          </div>
          <div class="ln-rows" id="ln-rows"></div>
          <div class="ln-key">
            <span><i class="ln-mark ln-mark--mkt"></i> the market, de-vigged</span>
            <span><i class="ln-mark ln-mark--you"></i> your read</span>
            <span><i class="ln-band ln-band--key"></i> how wrong your read can be</span>
          </div>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>The board's arithmetic</h2>
          <div class="ln-scroll">
            <table class="ledger ln-math">
              <thead><tr>
                <th>Game</th><th>Away</th><th>Home</th><th>Sum</th><th>Hold</th>
                <th style="text-align:right">True line, de-vigged</th>
              </tr></thead>
              <tbody id="ln-mathbody"></tbody>
            </table>
          </div>
          <p class="cf-note">Every row in the <b>Sum</b> column is over 100%. It has to be &mdash;
          two outcomes cannot be 104% likely between them. That excess is the overround, and
          <b>De-vigged</b> is what the market would say if it were not charging you. That is the
          number you have to disagree with.</p>
          <p class="cf-note">Now read the last column. Unlike the roulette table, <b>the two sides
          of this market do not cost the same</b>. The board loads its markup onto the underdog,
          because that is the side people want. The long price is the expensive one, every time.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Bet slip</h2>
          <div id="ln-slip"></div>
          <div class="actions" style="margin-top:14px">
            <button class="btn btn-primary btn-lg" id="ln-lock">Lock the slate</button>
            <button class="btn" id="ln-clear">Clear slip</button>
            <button class="btn btn-ghost" id="ln-mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          <p class="hint" id="ln-slipnote">Click a price on the board to take that side.</p>
          <p class="edge-note">Hold runs <b>3.5&ndash;5.8%</b> of everything staked, win or lose,
          and more of it sits on the underdog. Nothing here is redeemable.</p>
        </div>

        <div class="panel ln-research-panel">
          <h2>Research</h2>
          <div class="ln-slots" id="ln-slots"></div>
          <p class="cf-note" id="ln-slotnote"></p>
          <p class="cf-note">A researched read is off by about <b id="deep-copy">1.4 points</b>.
          The market's is off by <b>2.8</b>. That gap is the only reason any of this can ever beat a coin flip with
          a fee attached &mdash; and it exists only where you did the work.</p>
          <p class="cf-note">An unresearched read is off by <b>8.5</b>, and it does not miss evenly:
          it <b class="down">leans toward the underdog</b>, the same way everybody's does, into a
          board that already charges extra for exactly that.</p>
        </div>

        <div class="panel">
          <h2>Same games, three approaches</h2>
          <div class="counterfactual">
            <div class="cf-row cf-you">
              <span class="cf-name">You<small>your slip</small></span>
              <span class="cf-val" id="cf-you">${fmt(get().chips)}</span>
              <span class="cf-bar"><span id="cf-you-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-disc">
              <span class="cf-name">Sharp<small>researched edges only, half Kelly</small></span>
              <span class="cf-val" id="cf-sharp">${fmt(s.sharp)}</span>
              <span class="cf-bar"><span id="cf-sharp-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-moon">
              <span class="cf-name">Chalk<small>every game, on the favourite</small></span>
              <span class="cf-val" id="cf-chalk">${fmt(s.chalk)}</span>
              <span class="cf-bar"><span id="cf-chalk-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">Chalk is not unlucky. Favourites win most of the time &mdash; that is
          what makes them favourites &mdash; and the price already knows. It pays the hold on every
          game and nothing else ever happens.</p>
        </div>

        <div class="panel">
          <h2>Your record</h2>
          <div class="count-grid" id="ln-stats"></div>
          <p class="cf-note">Closing line value is the honest scoreboard here. If you keep taking
          prices the market later shortens, the process is working, whatever the results column
          says this week.</p>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  gen++;
  clearTimers();
  els = {
    rows: document.getElementById("ln-rows"),
    mathBody: document.getElementById("ln-mathbody"),
    slip: document.getElementById("ln-slip"),
    slipNote: document.getElementById("ln-slipnote"),
    lock: document.getElementById("ln-lock"),
    clear: document.getElementById("ln-clear"),
    mute: document.getElementById("ln-mute"),
    slots: document.getElementById("ln-slots"),
    slotNote: document.getElementById("ln-slotnote"),
    stats: document.getElementById("ln-stats"),
    phase: document.getElementById("ln-phase"),
    week: document.getElementById("ln-week"),
  };

  week = get().line.slates + 1;
  const sc = document.getElementById("slot-copy");
  if (sc) sc.textContent = `You get ${researchSlots()} research slots against ${SLATE_SIZE} games`;
  const dc = document.getElementById("deep-copy");
  if (dc) dc.textContent = `${(deepSd() * 100).toFixed(1)} points`;
  newSlate();

  els.rows.addEventListener("click", onBoardClick);
  els.slip.addEventListener("click", onSlipClick);
  els.slip.addEventListener("input", onSlipInput);
  els.lock.addEventListener("click", onLock);
  els.clear.addEventListener("click", () => { slip = {}; renderAll(); sfx.tick(); });
  els.mute.addEventListener("click", () => {
    els.mute.textContent = toggleMute() ? "Sound off" : "Sound on";
  });

}

export function unmount() {
  gen++;
  clearTimers();
}

function newSlate() {
  slate = makeSlate();
  slip = {};
  slotsUsed = 0;
  phase = "open";
  els.week.textContent = week;
  els.rows.innerHTML = slate.map(rowHTML).join("");
  els.lock.textContent = "Lock the slate";
  els.lock.disabled = false;
  els.clear.disabled = false;
  setPhase("Board open", "");
  renderAll();
}

// ---------------------------------------------------------------- interaction

function onBoardClick(e) {
  const r = e.target.closest("[data-research]");
  if (r) { doResearch(+r.dataset.research); return; }

  const p = e.target.closest("[data-pick]");
  if (!p || phase !== "open") return;
  const [i, side] = p.dataset.pick.split(":");
  pick(+i, side);
}

function pick(i, side) {
  const g = slate[i];
  const cur = slip[i];
  if (cur && cur.side === side) {
    delete slip[i];
    sfx.tick();
  } else {
    // A sensible opening stake: half Kelly on the current read, floored and capped to something sane.
    const k = kelly(sideProb(g, side), g.open[side]);
    const suggested = Math.round(clamp(k * 0.5, 0.01, 0.12) * get().chips);
    slip[i] = { side, stake: Math.max(5, Math.min(suggested, Math.round(get().chips * 0.25))) };
    sfx.coin();
    if (!g.researched) teach("gutRead");
    if (g.open[side] >= 250) teach("favLongshot");
  }
  renderAll();
}

function doResearch(i) {
  const g = slate[i];
  if (phase !== "open" || g.researched) return;
  if (slotsUsed >= researchSlots()) {
    els.slotNote.textContent = "No slots left this week. That is the constraint, and it is the point.";
    teach("circleOfCompetence");
    return;
  }
  g.researched = true;
  g.notes = researchNotes(g);
  slotsUsed += 1;
  const s = get();
  s.line.researched += 1;
  save();
  sfx.unlock();

  const el = els.rows.querySelector(`[data-notes="${i}"]`);
  el.hidden = false;
  el.innerHTML = g.notes.map((n, j) =>
    j === g.notes.length - 1 ? `<b>${n}</b>` : `<span>${n}</span>`).join("");
  els.rows.querySelector(`[data-row="${i}"]`).classList.add("researched");
  if (slotsUsed >= researchSlots()) teach("circleOfCompetence");
  renderAll();
}

function onSlipClick(e) {
  const x = e.target.closest("[data-drop]");
  if (x) { delete slip[+x.dataset.drop]; renderAll(); sfx.tick(); return; }
  const k = e.target.closest("[data-kelly]");
  if (!k) return;
  const i = +k.dataset.kelly;
  const g = slate[i], b = slip[i];
  const f = kelly(sideProb(g, b.side), g.open[b.side]) * 0.5;
  b.stake = Math.max(0, Math.round(clamp(f, 0, 0.25) * get().chips));
  renderAll();
  sfx.tick();
}

function onSlipInput(e) {
  const inp = e.target.closest("[data-stake]");
  if (!inp) return;
  const i = +inp.dataset.stake;
  if (!slip[i]) return;
  slip[i].stake = Math.max(0, Math.round(+inp.value || 0));
  renderSlipTotals();
}

// ---------------------------------------------------------------- the run

function onLock() {
  if (phase === "done") { week += 1; newSlate(); return; }
  if (phase !== "open") return;

  for (const i of Object.keys(slip)) if (slip[i].stake <= 0) delete slip[i];
  const ids = Object.keys(slip);
  const total = totalStaked();
  if (!ids.length) { els.slipNote.textContent = "Take a side first."; return; }
  if (total > get().chips) { els.slipNote.textContent = "Not enough chips for that slip."; return; }

  addChips(-total);
  phase = "closing";
  els.lock.disabled = true;
  els.clear.disabled = true;
  renderSlip();
  setPhase("Line moving — market closing", "moving");
  sfx.lever();

  // The market closes: everyone else finishes their work and the price absorbs it.
  slate.forEach((g, n) => {
    const pClose = clamp(g.pTrue + gauss(CLOSE_SD), 0.04, 0.96);
    g.close = postMarket(pClose, g.overround);
    after(220 + n * 170, () => tickPrices(g));
  });

  after(220 + SLATE_SIZE * 170 + 700, runResults);
}

function tickPrices(g) {
  for (const side of ["home", "away"]) {
    const el = els.rows.querySelector(`[data-price="${g.i}:${side}"]`);
    if (!el) continue;
    const before = g.open[side], now = g.close[side];
    el.classList.remove("up", "down", "same");
    void el.offsetWidth;
    if (before === now) { el.classList.add("same"); continue; }
    // "Shorter" means the price got worse for a backer: a smaller payout for the same risk.
    const worse = toDecimal(now) < toDecimal(before);
    el.textContent = formatOdds(now);
    el.classList.add(worse ? "down" : "up");
  }
  g.market = devig(g.close.home, g.close.away);
  renderRows();
  sfx.tick();
}

function runResults() {
  phase = "settling";
  setPhase("Results", "live");
  slate.forEach((g, n) => after(n * 820, () => settleGame(g, n === SLATE_SIZE - 1)));
}

function settleGame(g, last) {
  g.result = Math.random() < g.pTrue ? "home" : "away";
  const row = els.rows.querySelector(`[data-row="${g.i}"]`);
  row.classList.add("settled");
  for (const side of ["home", "away"]) {
    els.rows.querySelector(`[data-pick="${g.i}:${side}"]`)
      .classList.add(side === g.result ? "won" : "lost");
  }

  const b = slip[g.i];
  if (b && b.stake > 0) {
    const odds = g.open[b.side];                       // you took the opening price
    const win = b.side === g.result;
    const profit = win ? b.stake * profitPerUnit(odds) : -b.stake;
    if (win) addChips(b.stake + b.stake * profitPerUnit(odds));
    recordBet(g, b, odds, profit, win);
    flash(row, profit);
    if (win) sfx.win(profit > b.stake * 1.6 ? 2 : 1); else sfx.lose();
  }

  if (last) after(600, finishSlate);
}

function recordBet(g, b, odds, profit, win) {
  const s = get();
  const p = sideProb(g, b.side);
  const edge = ev(p, odds);
  const value = clv(odds, g.close[b.side]);
  s.line.bets += 1;
  s.line.won += win ? 1 : 0;
  s.line.staked += b.stake;
  s.line.returned += win ? b.stake + b.stake * profitPerUnit(odds) : 0;
  s.line.vigPaid += b.stake * devig(g.open.home, g.open.away).hold;
  s.line.clvBeat += value > 0 ? 1 : 0;
  s.line.researchedBets += g.researched ? 1 : 0;
  s.line.history.unshift({
    label: `${g.away[0]}/${g.home[0]}`, side: g[b.side][0], odds, stake: b.stake,
    net: profit, edge, clv: value, deep: g.researched,
  });
  s.line.history = s.line.history.slice(0, 24);
  save();

  if (!win && g.researched && edge > 0.04) teach("outcomeBias");
}

function flash(row, profit) {
  const pop = document.createElement("span");
  pop.className = "pop " + (profit >= 0 ? "win" : "lose");
  pop.textContent = (profit >= 0 ? "+" : "−") + fmt(Math.abs(profit));
  row.appendChild(pop);
  row.classList.add(profit >= 0 ? "row-win" : "row-lose");
  after(1200, () => pop.remove());
}

function finishSlate() {
  runCounterfactuals();
  const s = get();
  s.line.slates += 1;
  save();
  bumpRounds("line");

  phase = "done";
  els.lock.disabled = false;
  els.lock.textContent = "Next week's board";
  setPhase("Final", "final");
  renderAll();

  teach("impliedProb");     // the intro, now earned by a slate rather than handed over on arrival
  teach("theVig");
  // The slate counter is incremented above, so `>= 1` was true on the very first slate and
  // stacked this modal on top of theVig. De-vigging is the step after seeing the overround.
  if (s.line.slates >= 2) teach("deVig");
  if (s.line.bets >= 3) teach("clvChip");
}

/** Both counterfactuals play the exact same five results, out of their own banks. */
function runCounterfactuals() {
  const s = get().line;
  let chalk = s.chalk, sharp = s.sharp;
  for (const g of slate) {
    const fav = g.open.home < g.open.away ? "home" : "away";
    const stake = chalk * CHALK_STAKE;
    chalk += g.result === fav ? stake * profitPerUnit(g.open[fav]) : -stake;

    if (!g.researched) continue;
    for (const side of ["home", "away"]) {
      const p = side === "home" ? g.deep : 1 - g.deep;
      if (ev(p, g.open[side]) < SHARP_MIN_EDGE) continue;
      const st = sharp * clamp(kelly(p, g.open[side]) * 0.5, 0, 0.2);
      sharp += g.result === side ? st * profitPerUnit(g.open[side]) : -st;
    }
  }
  s.chalk = Math.max(0, chalk);
  s.sharp = Math.max(0, sharp);
  save();
}

// ---------------------------------------------------------------- rendering

function setPhase(text, cls) {
  els.phase.textContent = text;
  els.phase.className = "ln-phase " + cls;
}

function renderAll() {
  renderRows();
  renderMath();
  renderSlip();
  renderSlots();
  renderCounterfactual();
  renderStats();
}

function renderRows() {
  for (const g of slate) {
    const sel = slip[g.i];
    for (const side of ["home", "away"]) {
      els.rows.querySelector(`[data-pick="${g.i}:${side}"]`)
        .classList.toggle("on", !!sel && sel.side === side);
    }

    const r = read(g), sd = readSd(g);
    const lo = clamp(r - sd, 0, 1), hi = clamp(r + sd, 0, 1);
    const band = els.rows.querySelector(`[data-band="${g.i}"]`);
    band.style.left = lo * 100 + "%";
    band.style.width = (hi - lo) * 100 + "%";
    els.rows.querySelector(`[data-you="${g.i}"]`).style.left = r * 100 + "%";
    els.rows.querySelector(`[data-mkt="${g.i}"]`).style.left = g.market.home * 100 + "%";

    const best = sel ? sel.side : (ev(r, g.open.home) >= ev(1 - r, g.open.away) ? "home" : "away");
    const e = ev(sideProb(g, best), g.open[best]);
    els.rows.querySelector(`[data-edge="${g.i}"]`).innerHTML = `
      <span class="ln-edgeval ${e > 0 ? "up" : "down"}">${signPct(e)}</span>
      <span class="ln-edgetag ${g.researched ? "deep" : ""}">${g.researched ? "deep read" : "gut read"}</span>`;

    const rb = els.rows.querySelector(`[data-research="${g.i}"]`);
    rb.disabled = g.researched || phase !== "open" || slotsUsed >= researchSlots();
    rb.textContent = g.researched ? "Researched" : "Research";
  }
}

function renderMath() {
  const odds = (g) => g.close || g.open;
  els.mathBody.innerHTML = slate.map((g) => {
    const o = odds(g);
    const a = toProb(o.away), h = toProb(o.home);
    const d = devig(o.home, o.away);
    // What each side costs someone holding the de-vigged number: the real fee on that price.
    const ca = sideCost(d.away, o.away), ch = sideCost(d.home, o.home);
    const dear = ca > ch ? "away" : "home";
    return `
      <tr>
        <td>${g.away[0]}/${g.home[0]}</td>
        <td>${pct(a)}</td>
        <td>${pct(h)}</td>
        <td class="lose">${pct(a + h)}</td>
        <td>${pct(d.away)} / ${pct(d.home)}</td>
        <td style="text-align:right" class="lose">
          <span class="${dear === "away" ? "ln-dear" : ""}">${pct(ca)}</span> /
          <span class="${dear === "home" ? "ln-dear" : ""}">${pct(ch)}</span>
        </td>
      </tr>`;
  }).join("");
}

function renderSlip() {
  const ids = Object.keys(slip);
  if (!ids.length) {
    els.slip.innerHTML = `<p class="ln-empty">Slip is empty.</p>`;
    renderSlipTotals();
    return;
  }
  const open = phase === "open";
  els.slip.innerHTML = ids.map((i) => {
    const g = slate[i], b = slip[i];
    const odds = g.open[b.side];
    const p = sideProb(g, b.side);
    const e = ev(p, odds);
    return `
      <div class="ln-pick ${e > 0 ? "good" : "bad"}">
        <div class="ln-picktop">
          <b>${g[b.side][1]}</b>
          <span class="ln-pickodds">${formatOdds(odds)}</span>
          ${open ? `<button class="ln-drop" data-drop="${i}" title="Remove">&times;</button>` : ""}
        </div>
        <div class="ln-pickmath">
          <span>break-even <b>${pct(toProb(odds))}</b></span>
          <span>your read <b>${pct(p)}</b></span>
          <span class="${e > 0 ? "up" : "down"}">edge <b>${signPct(e)}</b></span>
        </div>
        <div class="ln-pickstake">
          <input type="number" min="0" step="5" value="${b.stake}" data-stake="${i}" ${open ? "" : "disabled"} />
          <button class="btn" data-kelly="${i}" ${open ? "" : "disabled"}>&frac12; Kelly</button>
        </div>
      </div>`;
  }).join("");
  renderSlipTotals();
}

function renderSlipTotals() {
  const ids = Object.keys(slip);
  if (!ids.length) { els.slipNote.textContent = "Click a price on the board to take that side."; return; }
  const total = totalStaked();
  const worst = ids.reduce((a, i) =>
    Math.min(a, ev(sideProb(slate[i], slip[i].side), slate[i].open[slip[i].side])), Infinity);
  const blind = ids.filter((i) => !slate[i].researched).length;
  els.slipNote.innerHTML =
    `<b>${fmt(total)}</b> chips across ${ids.length} pick${ids.length === 1 ? "" : "s"}` +
    (blind ? ` &middot; <span class="down">${blind} on a gut read</span>`
           : ` &middot; <span class="up">all researched</span>`) +
    (worst < 0 ? ` &middot; <span class="down">one pick is priced against you</span>` : "");
}

function renderSlots() {
  const total = researchSlots();
  const left = total - slotsUsed;
  els.slots.innerHTML = Array.from({ length: total }, (_, i) =>
    `<i class="ln-slot ${i < left ? "on" : ""}"></i>`).join("");
  if (phase !== "open") {
    els.slotNote.textContent = "The board is closed. Slots reset next week.";
  } else {
    els.slotNote.innerHTML = left
      ? `<b>${left}</b> of ${total} slots left. Research is free. Attention is not.`
      : `All ${total} slots spent. The other ${SLATE_SIZE - total} games are somebody else's edge.`;
  }
}

function renderCounterfactual() {
  const s = get();
  const v = { you: s.chips, sharp: s.line.sharp, chalk: s.line.chalk };
  const max = Math.max(v.you, v.sharp, v.chalk, 1);
  for (const k of ["you", "sharp", "chalk"]) {
    document.getElementById("cf-" + k).textContent = fmt(v[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (v[k] / max) * 100) + "%";
  }
}

function renderStats() {
  const s = get().line;
  const roi = s.staked ? (s.returned - s.staked) / s.staked : 0;
  const clvRate = s.bets ? s.clvBeat / s.bets : 0;
  const winRate = s.bets ? s.won / s.bets : 0;
  const cell = (k, v, cls = "") => `<div><span class="k">${k}</span><b class="${cls}">${v}</b></div>`;
  els.stats.innerHTML =
    cell("Record", `${s.won}–${s.bets - s.won}`) +
    cell("Win rate", s.bets ? pct(winRate) : "—", s.bets && winRate > 0.5238 ? "pos" : "") +
    cell("ROI", s.bets ? signPct(roi) : "—", roi > 0 ? "pos" : roi < 0 ? "neg" : "") +
    cell("Beat the close", s.bets ? `${s.clvBeat}/${s.bets}` : "—", clvRate > 0.5 ? "pos" : "") +
    cell("Researched bets", `${s.researchedBets}/${s.bets}`) +
    cell("Vig paid", fmt(s.vigPaid), "neg");
}
