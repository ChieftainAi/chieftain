// Table 8 — The Book (live dealer).
//
// Every other table puts you across from the house. This one makes you BE the house for a while,
// because the bid-ask spread is impossible to understand from one side of it.
//
// You quote a two-sided market on the next roll of a die. Customers arrive and hit your bid or
// lift your offer. Quote a wide spread and you earn well per trade but almost nobody deals with
// you. Quote a tight one and you trade constantly for almost nothing. And a slice of the flow is
// informed — it only ever trades when it is right — so the spread is not free money, it is
// compensation for being picked off by people who know something you do not.
//
// That is the whole job of a market maker, and it is the honest answer to "why is there a
// spread": it is the price of providing liquidity to a crowd containing people better informed
// than you are.
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";

// The instrument: the total of three dice, settling between 3 and 18, fair value 10.5.
const FAIR = 10.5;
const SPREADS = [0.2, 0.5, 1, 2, 4];
const INFORMED_RATE = 0.22;      // share of arriving flow that already knows the settle
const ROUND_MS = 620;
const CUSTOMERS = 6;

let els, gen = 0, timers = [];
let spread = 1, size = 25, phase = "quoting";
let book = null;                  // { settle, trades: [], pnl, filled }

const after = (ms, fn) => { const g = gen; timers.push(setTimeout(() => { if (g === gen) fn(); }, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const d3 = () => 3 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) - 2;

const bidOf = (s) => FAIR - s / 2;
const askOf = (s) => FAIR + s / 2;

/**
 * How much of the arriving crowd is willing to deal at a given spread. Wider quotes are worse
 * for the customer, so fewer of them trade — the central trade-off of the job.
 */
const fillRate = (s) => Math.max(0.05, Math.min(1, 1.05 - s * 0.22));

// ---------------------------------------------------------------- view

export function view() {
  const s = get().book;
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>The Book</h1>
        <p class="sub">At every other table you are the customer. Here you are the one quoting.
        Three dice settle somewhere between 3 and 18, fair value is 10.5, and your job is to name
        a price you will buy at and a price you will sell at.
        <em>The gap between them is the only thing you earn — and it is not free.</em></p>
      </div>
    </div>

    <div class="book-wrap">
      <div>
        <div class="book-felt">
          <div class="book-quote">
            <div class="bq-side bq-bid">
              <span class="bq-label">Your bid</span>
              <span class="bq-price" id="bk-bid">${bidOf(spread).toFixed(2)}</span>
              <span class="bq-note">you buy here</span>
            </div>
            <div class="bq-mid">
              <span class="bq-fair">fair value <b>${FAIR}</b></span>
              <span class="bq-spread" id="bk-spread">${spread.toFixed(2)} wide</span>
            </div>
            <div class="bq-side bq-ask">
              <span class="bq-label">Your offer</span>
              <span class="bq-price" id="bk-ask">${askOf(spread).toFixed(2)}</span>
              <span class="bq-note">you sell here</span>
            </div>
          </div>

          <div class="book-spreads" id="bk-spreads">
            ${SPREADS.map((v) => `
              <button class="bk-sp ${v === spread ? "on" : ""}" data-spread="${v}">
                <b>${v.toFixed(2)}</b><small>${Math.round(fillRate(v) * 100)}% deal</small>
              </button>`).join("")}
          </div>

          <div class="book-tape" id="bk-tape">
            <p class="feed-empty">No flow yet. Quote a market and open the book.</p>
          </div>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>The market maker's trade-off</h2>
          <div class="ln-scroll">
            <table class="ledger">
              <thead><tr>
                <th>Spread</th><th>Edge per trade</th><th>Share who deal</th>
                <th>Expected trades</th><th style="text-align:right">Expected earn</th>
              </tr></thead>
              <tbody>
                ${SPREADS.map((v) => {
                  const trades = CUSTOMERS * fillRate(v);
                  // uninformed flow pays you half the spread; informed flow takes it back and more
                  const earn = trades * ((1 - INFORMED_RATE) * (v / 2) - INFORMED_RATE * 1.6);
                  return `
                    <tr class="${Math.abs(v - spread) < 1e-9 ? "bac-best" : ""}">
                      <td>${v.toFixed(2)}</td>
                      <td>${(v / 2).toFixed(2)}</td>
                      <td>${Math.round(fillRate(v) * 100)}%</td>
                      <td>${trades.toFixed(1)}</td>
                      <td style="text-align:right" class="${earn > 0 ? "win" : "lose"}">${earn >= 0 ? "+" : "−"}${Math.abs(earn).toFixed(2)}</td>
                    </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
          <p class="cf-note">Quote too tight and the informed flow eats you; quote too wide and
          nobody deals. <b>The spread is not a fee the market maker chooses to charge — it is the
          minimum they can survive on</b>, given that roughly a fifth of the people hitting their
          price know something they do not.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Your book</h2>
          <div class="blocks" style="margin-bottom:12px">
            <div class="cd-block cd-block--accent"><span class="cd-num" id="bk-filled">0</span><span class="cd-label">Trades</span></div>
            <div class="cd-block"><span class="cd-num" id="bk-earned">0</span><span class="cd-label">Spread</span></div>
            <div class="cd-block"><span class="cd-num" id="bk-adverse">0</span><span class="cd-label">Picked off</span></div>
            <div class="cd-block"><span class="cd-num" id="bk-net">0</span><span class="cd-label">Net</span></div>
          </div>
          <div class="field">
            <label>Size per trade <b id="bk-size">${size}</b></label>
            <div class="stake-row">
              ${[5, 25, 100].map((v) => `<button class="btn" data-size="${v}">${v}</button>`).join("")}
            </div>
          </div>
          <div class="actions" style="margin-top:14px">
            <button class="btn btn-primary btn-lg" id="bk-open">Open the book</button>
            <button class="btn btn-ghost" id="bk-mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          <p class="hint" id="bk-msg">Pick a spread, then take the other side of the crowd.</p>
          <p class="edge-note">About <b>22%</b> of arriving flow is informed. Your edge is half the
          spread on everyone else. Nothing here is redeemable.</p>
        </div>

        <div class="panel">
          <h2>Same flow, three books</h2>
          <div class="counterfactual">
            <div class="cf-row cf-disc">
              <span class="cf-name">Wide book<small>2.00 spread, few trades</small></span>
              <span class="cf-val" id="cf-wide">${fmt(s.wide)}</span>
              <span class="cf-bar"><span id="cf-wide-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-you">
              <span class="cf-name">Tight book<small>0.20 spread, constant flow</small></span>
              <span class="cf-val" id="cf-tight">${fmt(s.tight)}</span>
              <span class="cf-bar"><span id="cf-tight-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-moon">
              <span class="cf-name">Taker<small>crosses the spread every round</small></span>
              <span class="cf-val" id="cf-taker">${fmt(s.taker)}</span>
              <span class="cf-bar"><span id="cf-taker-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">The taker is you at every other table in this building: paying half
          the spread to get in and half to get out, on every single round trip, for ever.</p>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  gen++;
  clearTimers();
  spread = 1; size = 25; phase = "quoting"; book = null;

  els = {
    bid: document.getElementById("bk-bid"),
    ask: document.getElementById("bk-ask"),
    spreadLabel: document.getElementById("bk-spread"),
    tape: document.getElementById("bk-tape"),
    open: document.getElementById("bk-open"),
    mute: document.getElementById("bk-mute"),
    msg: document.getElementById("bk-msg"),
    size: document.getElementById("bk-size"),
    filled: document.getElementById("bk-filled"),
    earned: document.getElementById("bk-earned"),
    adverse: document.getElementById("bk-adverse"),
    net: document.getElementById("bk-net"),
  };

  document.getElementById("bk-spreads").addEventListener("click", (e) => {
    const b = e.target.closest("[data-spread]");
    if (!b || phase === "running") return;
    spread = +b.dataset.spread;
    document.querySelectorAll("[data-spread]").forEach((x) => x.classList.toggle("on", x === b));
    renderQuote();
    sfx.tick();
  });
  document.querySelectorAll("[data-size]").forEach((b) =>
    b.addEventListener("click", () => {
      if (phase === "running") return;
      size = +b.dataset.size;
      els.size.textContent = size;
      sfx.tick();
    }));
  els.open.addEventListener("click", open);
  els.mute.addEventListener("click", () => {
    els.mute.textContent = toggleMute() ? "Sound off" : "Sound on";
  });

  renderQuote();
  renderBook();
  renderCounterfactual();
}

export function unmount() { gen++; clearTimers(); }

function renderQuote() {
  els.bid.textContent = bidOf(spread).toFixed(2);
  els.ask.textContent = askOf(spread).toFixed(2);
  els.spreadLabel.textContent = `${spread.toFixed(2)} wide`;
}

// ---------------------------------------------------------------- running the book

function open() {
  if (phase === "running") return;
  if (phase === "done") { reset(); return; }
  const maxRisk = size * CUSTOMERS;
  if (maxRisk > get().chips) { els.msg.textContent = "Not enough chips to stand behind that size."; return; }

  phase = "running";
  els.open.disabled = true;
  els.tape.innerHTML = "";
  sfx.lever();

  const settleAt = d3();
  book = { settle: settleAt, trades: [], pnl: 0, earned: 0, adverse: 0, filled: 0 };

  for (let i = 0; i < CUSTOMERS; i++) {
    after(ROUND_MS * (i + 1), () => {
      const informed = Math.random() < INFORMED_RATE;
      const deals = Math.random() < fillRate(spread);

      if (!deals) {
        addTape({ kind: "pass", informed: false });
        return;
      }

      // An informed customer trades in the direction the settle actually went; anyone else is
      // a coin flip. You always take the other side of whatever they do.
      let buys;
      if (informed) buys = settleAt > FAIR;
      else buys = Math.random() < 0.5;

      // They lift your offer to buy, or hit your bid to sell. Your position is the opposite.
      const price = buys ? askOf(spread) : bidOf(spread);
      const yourPos = buys ? -1 : 1;                    // you are short if they bought
      const pnl = yourPos * (settleAt - price) * (size / 10);

      book.filled += 1;
      book.pnl += pnl;
      if (informed) book.adverse += pnl; else book.earned += pnl;
      book.trades.push({ buys, price, informed, pnl });
      addTape({ kind: buys ? "lift" : "hit", price, informed, pnl });
      sfx.reelStop(i);
    });
  }

  after(ROUND_MS * (CUSTOMERS + 1), finish);
}

function addTape({ kind, price, informed, pnl }) {
  const row = document.createElement("div");
  row.className = "bk-tick " + kind + (informed ? " informed" : "");
  row.innerHTML = kind === "pass"
    ? `<span class="bk-who">a customer looked and walked</span><span class="bk-pnl">—</span>`
    : `<span class="bk-who">${informed ? "<b>informed</b> " : ""}customer
         ${kind === "lift" ? "lifts your offer" : "hits your bid"} at ${price.toFixed(2)}</span>
       <span class="bk-pnl ${pnl >= 0 ? "up" : "down"}">${pnl >= 0 ? "+" : "−"}${Math.abs(pnl).toFixed(2)}</span>`;
  els.tape.appendChild(row);
  els.tape.scrollTop = els.tape.scrollHeight;
  renderBook();
}

function finish() {
  addChips(book.pnl);

  const s = get(), t = s.book;
  t.sessions += 1;
  t.trades += book.filled;
  t.spreadEarned += book.earned;
  t.adverseLost += book.adverse;
  t.history.unshift({ spread, filled: book.filled, pnl: book.pnl, settle: book.settle });
  t.history = t.history.slice(0, 40);

  // three shadow books on the same settle: wide, tight, and a taker paying the spread both ways
  const sim = (sp, bank) => {
    let p = 0;
    for (let i = 0; i < CUSTOMERS; i++) {
      if (Math.random() >= fillRate(sp)) continue;
      const inf = Math.random() < INFORMED_RATE;
      const buys = inf ? book.settle > FAIR : Math.random() < 0.5;
      const price = buys ? askOf(sp) : bidOf(sp);
      p += (buys ? -1 : 1) * (book.settle - price) * (bank * 0.02 / 10);
    }
    return p;
  };
  t.wide = Math.max(0, t.wide + sim(2, t.wide));
  t.tight = Math.max(0, t.tight + sim(0.2, t.tight));
  t.taker = Math.max(0, t.taker - t.taker * 0.02 * (spread / 10) * 2);
  save();
  bumpRounds("book");

  const row = document.createElement("div");
  row.className = "bk-tick settle";
  row.innerHTML = `<span class="bk-who">Dice settle at <b>${book.settle}</b>
    (fair was ${FAIR})</span><span class="bk-pnl ${book.pnl >= 0 ? "up" : "down"}">
    ${book.pnl >= 0 ? "+" : "−"}${Math.abs(book.pnl).toFixed(2)}</span>`;
  els.tape.appendChild(row);
  els.tape.scrollTop = els.tape.scrollHeight;

  els.msg.innerHTML = book.filled
    ? `Earned <b class="up">${book.earned.toFixed(2)}</b> from uninformed flow, gave back
       <b class="down">${Math.abs(book.adverse).toFixed(2)}</b> to the informed.`
    : `Nobody dealt at that spread. A quote nobody trades against earns nothing.`;
  if (book.pnl > 0) sfx.win(1); else sfx.lose();

  phase = "done";
  els.open.disabled = false;
  els.open.textContent = "Quote again";
  renderBook();
  renderCounterfactual();

  teach("youAreTheHouse");  // earned by quoting a market, not handed over on arrival
  if (t.sessions >= 1) teach("theSpreadIsTheFee");
  if (t.sessions >= 3) teach("adverseSelection");
  if (t.sessions >= 7) teach("whoIsAcross");
}

function reset() {
  phase = "quoting";
  els.open.textContent = "Open the book";
  els.tape.innerHTML = `<p class="feed-empty">No flow yet. Quote a market and open the book.</p>`;
  els.msg.textContent = "Pick a spread, then take the other side of the crowd.";
  book = null;
  renderBook();
}

function renderBook() {
  const b = book || { filled: 0, earned: 0, adverse: 0, pnl: 0 };
  els.filled.textContent = b.filled;
  els.earned.textContent = b.earned.toFixed(1);
  els.adverse.textContent = Math.abs(b.adverse).toFixed(1);
  els.net.textContent = b.pnl.toFixed(1);
  els.net.className = "cd-num " + (b.pnl > 0 ? "up" : b.pnl < 0 ? "down" : "");
}

function renderCounterfactual() {
  const t = get().book;
  const v = { wide: t.wide, tight: t.tight, taker: t.taker };
  const max = Math.max(v.wide, v.tight, v.taker, 1);
  for (const k of ["wide", "tight", "taker"]) {
    document.getElementById("cf-" + k).textContent = fmt(v[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (v[k] / max) * 100) + "%";
  }
}
