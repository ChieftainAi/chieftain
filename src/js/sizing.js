// Table 2 — The Sizing Table (blackjack).
//
// The game underneath is real blackjack: 6-deck shoe, dealer stands on all 17, blackjack pays
// 3:2, double on any two, split once, insurance at 2:1. Played with basic strategy it runs a
// 0.523% house edge, verified by simulation.
//
// The twist is that the count is shown to you. Hi-Lo running count, true count, the edge that
// implies, and the Kelly-optimal stake for that edge. Blackjack is the only casino game where
// the edge genuinely swings to the player, which makes it the only honest place to teach the
// thing that actually separates investors: not what you bet on, but how much you bet when you
// are right.
import {
  freshShoe, handValue, isBlackjack, canSplit, dealerShouldHit, basicStrategy, settleHand,
  countValue, trueCount, edgeFromCount, kellyFraction, SUIT_GLYPH, cardValue,
  DECKS, PENETRATION, STRATEGY_NAME,
} from "./blackjack-rules.js";
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";

const SHOE_SIZE = DECKS * 52;
const RESHUFFLE_AT = SHOE_SIZE * (1 - PENETRATION);
const FLAT_BET = 25;             // what the counterfactual flat bettor always wagers

let shoe = [], running = 0;
let dealer = [], hands = [], active = 0;
let phase = "bet";               // bet | deal | player | dealer | settle
let els, gen = 0, showBook = false;
let insuranceBet = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cardsLeft = () => shoe.length;
const tc = () => trueCount(running, cardsLeft());

// ---------------------------------------------------------------- view

export function view() {
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>The Sizing Table</h1>
        <p class="sub">Real blackjack — six decks, dealer stands on all 17, blackjack pays 3:2.
        Played correctly the house keeps just 0.52%, which makes this the one table where skill
        moves the number. <em>And the count is shown to you, so the real question stops being how
        to play the hand and becomes how much to bet.</em></p>
      </div>
    </div>

    <div class="bj-layout">
      <div>
        <div class="bj-felt" id="bj-felt">
          <div class="bj-arc">
            <span>BLACKJACK PAYS 3 TO 2</span>
            <span>DEALER MUST STAND ON 17 · INSURANCE PAYS 2 TO 1</span>
          </div>

          <div class="shoe" id="shoe" title="cards remaining in the shoe">
            <div class="shoe-body"></div>
            <div class="shoe-meter"><span id="shoe-fill"></span></div>
            <div class="shoe-label"><span id="shoe-count">${SHOE_SIZE}</span> left</div>
          </div>

          <div class="bj-row bj-row--dealer">
            <div class="bj-seat">
              <div class="bj-seat-label">Dealer <span class="bj-total" id="dealer-total"></span></div>
              <div class="bj-cards" id="dealer-cards"></div>
            </div>
          </div>

          <div class="bj-msg" id="bj-msg">Place your bet</div>

          <div class="bj-row bj-row--player" id="player-row"></div>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>Same shoe, three ways of sizing the bet</h2>
          <div class="counterfactual">
            <div class="cf-row cf-you">
              <span class="cf-name">You<small>your actual bets</small></span>
              <span class="cf-val" id="cf-you">${fmt(get().chips)}</span>
              <span class="cf-bar"><span id="cf-you-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-disc">
              <span class="cf-name">Kelly<small>stake scales with the edge</small></span>
              <span class="cf-val" id="cf-kelly">${fmt(get().sizing.kelly)}</span>
              <span class="cf-bar"><span id="cf-kelly-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-moon">
              <span class="cf-name">Flat<small>always bets ${FLAT_BET}</small></span>
              <span class="cf-val" id="cf-flat">${fmt(get().sizing.flat)}</span>
              <span class="cf-bar"><span id="cf-flat-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">Same cards, same strategy, same hands. The only difference is bet size,
          and over a long enough shoe that is the difference between the three of them.</p>
        </div>
      </div>

      <div>
        <div class="panel count-panel">
          <h2>The count</h2>
          <div class="count-grid">
            <div><span class="k">Running</span><b id="rc">0</b></div>
            <div><span class="k">True count</span><b id="tcv">0.0</b></div>
            <div><span class="k">Your edge</span><b id="edge" class="neg">−0.50%</b></div>
            <div><span class="k">Kelly stake</span><b id="kelly">0</b></div>
          </div>
          <div class="heat"><span id="heat-fill"></span></div>
          <p class="cf-note" id="count-read">The shoe is neutral. With no edge, the correct bet is
          the smallest one the table allows.</p>
        </div>

        <div class="panel">
          <h2>Your bet</h2>
          <div class="field">
            <label for="stake">Stake <b id="stake-val">25</b></label>
            <input type="range" id="stake" min="5" max="500" step="5" value="25" />
            <div class="stake-row">
              <button class="btn" data-bet="min">Min</button>
              <button class="btn" data-bet="kelly">Kelly</button>
              <button class="btn" data-bet="2x">2&times;</button>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-primary btn-lg" id="deal">Deal</button>
            <div class="bj-actions" id="bj-actions">
              <button class="btn" id="hit" disabled>Hit</button>
              <button class="btn" id="stand" disabled>Stand</button>
              <button class="btn" id="double" disabled>Double</button>
              <button class="btn" id="split" disabled>Split</button>
            </div>
            <div class="bj-actions" id="ins-actions" hidden>
              <button class="btn" id="ins-yes">Take insurance</button>
              <button class="btn" id="ins-no">Decline</button>
            </div>
            <button class="btn btn-ghost" id="book">Show the book</button>
            <button class="btn btn-ghost" id="mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          <p class="hint" id="book-hint"></p>
          <p class="edge-note">House edge <b>0.52%</b> with correct play &middot; the lowest in the
          building. Nothing here is redeemable.</p>
        </div>

        <div class="panel">
          <h2>Ledger</h2>
          <table class="ledger">
            <thead><tr><th>TC</th><th>Bet</th><th>Kelly said</th><th style="text-align:right">Result</th></tr></thead>
            <tbody id="ledger"></tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  gen++;
  els = {
    felt: document.getElementById("bj-felt"),
    msg: document.getElementById("bj-msg"),
    dealerCards: document.getElementById("dealer-cards"),
    dealerTotal: document.getElementById("dealer-total"),
    playerRow: document.getElementById("player-row"),
    shoeFill: document.getElementById("shoe-fill"),
    shoeCount: document.getElementById("shoe-count"),
    rc: document.getElementById("rc"),
    tcv: document.getElementById("tcv"),
    edge: document.getElementById("edge"),
    kelly: document.getElementById("kelly"),
    heat: document.getElementById("heat-fill"),
    countRead: document.getElementById("count-read"),
    stake: document.getElementById("stake"),
    stakeVal: document.getElementById("stake-val"),
    deal: document.getElementById("deal"),
    hit: document.getElementById("hit"),
    stand: document.getElementById("stand"),
    double: document.getElementById("double"),
    split: document.getElementById("split"),
    insActions: document.getElementById("ins-actions"),
    book: document.getElementById("book"),
    bookHint: document.getElementById("book-hint"),
    mute: document.getElementById("mute"),
    ledger: document.getElementById("ledger"),
  };

  shoe = freshShoe();
  running = 0;
  dealer = []; hands = []; active = 0; phase = "bet"; insuranceBet = 0;

  els.stake.addEventListener("input", syncStake);
  els.deal.addEventListener("click", deal);
  els.hit.addEventListener("click", () => playerMove("H"));
  els.stand.addEventListener("click", () => playerMove("S"));
  els.double.addEventListener("click", () => playerMove("D"));
  els.split.addEventListener("click", () => playerMove("P"));
  document.getElementById("ins-yes").addEventListener("click", () => resolveInsurance(true));
  document.getElementById("ins-no").addEventListener("click", () => resolveInsurance(false));
  els.book.addEventListener("click", () => {
    showBook = !showBook;
    els.book.textContent = showBook ? "Hide the book" : "Show the book";
    updateBookHint();
  });
  els.mute.addEventListener("click", () => { els.mute.textContent = toggleMute() ? "Sound off" : "Sound on"; });
  document.querySelectorAll("[data-bet]").forEach((b) =>
    b.addEventListener("click", () => {
      const k = Math.round(get().chips * kellyFraction(tc()));
      if (b.dataset.bet === "min") els.stake.value = els.stake.min;
      else if (b.dataset.bet === "kelly") els.stake.value = Math.max(+els.stake.min, Math.min(+els.stake.max, k || +els.stake.min));
      else els.stake.value = Math.min(+els.stake.max, +els.stake.value * 2);
      syncStake();
      sfx.tick();
    })
  );
  document.addEventListener("keydown", onKey);

  syncStake();
  renderCount();
  renderShoe();
  renderHands();
  renderLedger();
  renderCounterfactual();
}

export function unmount() {
  gen++;
  document.removeEventListener("keydown", onKey);
}

function onKey(e) {
  if (e.target.tagName === "INPUT") return;
  const map = { KeyH: "H", KeyS: "S", KeyD: "D", KeyP: "P" };
  if (e.code === "Space" && phase === "bet") { e.preventDefault(); deal(); }
  else if (map[e.code] && phase === "player") { e.preventDefault(); playerMove(map[e.code]); }
}

function syncStake() {
  els.stake.max = Math.max(5, Math.min(500, Math.floor(get().chips) || 5));
  els.stake.value = Math.min(+els.stake.value, +els.stake.max);
  els.stakeVal.textContent = fmt(+els.stake.value);
}

// ---------------------------------------------------------------- dealing

function draw() {
  if (shoe.length <= RESHUFFLE_AT) {
    shoe = freshShoe();
    running = 0;
    flashMsg("Shuffling a fresh shoe — the count resets to zero");
    sfx.lever();
  }
  const c = shoe.pop();
  running += countValue(c.rank);
  return c;
}

async function deal() {
  if (phase !== "bet") return;
  const bet = +els.stake.value;
  if (bet > get().chips) { flashMsg("Not enough chips"); return; }

  const myGen = gen;
  const tcAtBet = tc();
  const kellyAtBet = Math.round(get().chips * kellyFraction(tcAtBet));

  phase = "deal";
  dealer = []; hands = [{ cards: [], bet, doubled: false, fromSplit: false, done: false, result: null }];
  active = 0;
  insuranceBet = 0;
  addChips(-bet);
  els.deal.disabled = true;
  setActions(false);
  els.dealerCards.innerHTML = "";
  els.msg.className = "bj-msg";
  renderHands();
  sfx.lever();

  // player, dealer, player, dealer hole
  const order = [["p", 0], ["d", 0], ["p", 0], ["d", 1]];
  for (const [who] of order) {
    if (gen !== myGen) return;
    const c = draw();
    if (who === "p") hands[0].cards.push(c); else dealer.push(c);
    renderHands(); renderDealer(); renderShoe(); renderCount();
    sfx.tick();
    await sleep(190);
  }
  if (gen !== myGen) return;

  hands[0].tcAtBet = tcAtBet;
  hands[0].kellyAtBet = kellyAtBet;

  // Insurance decision comes before anything else if the dealer shows an ace.
  if (dealer[0].rank === "A") {
    phase = "insurance";
    els.insActions.hidden = false;
    flashMsg("Dealer shows an ace. Insurance?");
    teach("insurance");
    return;
  }
  afterDeal();
}

function resolveInsurance(take) {
  els.insActions.hidden = true;
  if (take) {
    const amt = Math.round(hands[0].bet / 2);
    if (amt <= get().chips) { insuranceBet = amt; addChips(-amt); }
  }
  afterDeal();
}

function afterDeal() {
  const dBJ = isBlackjack(dealer);
  if (insuranceBet && dBJ) { addChips(insuranceBet * 3); flashMsg("Insurance paid 2 to 1"); }

  if (dBJ || isBlackjack(hands[0].cards)) { finish(); return; }
  phase = "player";
  setActions(true);
  updateBookHint();
  flashMsg("Your move");
}

// ---------------------------------------------------------------- player turn

async function playerMove(move) {
  if (phase !== "player") return;
  const h = hands[active];
  const myGen = gen;

  if (move === "H") {
    h.cards.push(draw());
    sfx.tick();
    renderHands(); renderShoe(); renderCount();
    if (handValue(h.cards).bust) { h.done = true; await nextHand(myGen); }
    else { setActions(true); updateBookHint(); }
    return;
  }
  if (move === "S") { h.done = true; await nextHand(myGen); return; }

  if (move === "D") {
    if (h.cards.length !== 2 || h.bet > get().chips) return;
    addChips(-h.bet);
    h.doubled = true;
    h.cards.push(draw());
    h.done = true;
    sfx.coin();
    renderHands(); renderShoe(); renderCount();
    await nextHand(myGen);
    return;
  }
  if (move === "P") {
    if (!canSplit(h.cards) || hands.length > 1 || h.bet > get().chips) return;
    addChips(-h.bet);
    const second = h.cards.pop();
    const aces = h.cards[0].rank === "A";
    hands.push({ cards: [second], bet: h.bet, doubled: false, fromSplit: true, done: false,
                 result: null, tcAtBet: h.tcAtBet, kellyAtBet: h.kellyAtBet });
    h.fromSplit = true;
    sfx.coin();
    renderHands();
    await sleep(220);
    if (gen !== myGen) return;
    h.cards.push(draw());
    hands[1].cards.push(draw());
    renderHands(); renderShoe(); renderCount();
    // Split aces get exactly one card each and stand.
    if (aces) { h.done = true; hands[1].done = true; await nextHand(myGen); }
    else { setActions(true); updateBookHint(); }
    return;
  }
}

async function nextHand(myGen) {
  const next = hands.findIndex((h) => !h.done);
  if (next >= 0) {
    active = next;
    renderHands();
    setActions(true);
    updateBookHint();
    return;
  }
  setActions(false);
  await dealerTurn(myGen);
}

async function dealerTurn(myGen) {
  phase = "dealer";
  flashMsg("Dealer plays");
  renderDealer(true);
  await sleep(430);

  const allBust = hands.every((h) => handValue(h.cards).bust);
  while (!allBust && dealerShouldHit(dealer)) {
    if (gen !== myGen) return;
    dealer.push(draw());
    sfx.tick();
    renderDealer(true); renderShoe(); renderCount();
    await sleep(430);
  }
  if (gen !== myGen) return;
  finish();
}

// ---------------------------------------------------------------- settling

function finish() {
  phase = "settle";
  renderDealer(true);

  const s = get();
  let net = 0, labels = [];
  for (const h of hands) {
    const r = settleHand(h.cards, dealer, { doubled: h.doubled, fromSplit: h.fromSplit });
    const unit = h.bet;
    addChips(r.payout * unit);
    h.result = r.label;
    net += r.net * unit;
    labels.push(r.label);
  }
  if (insuranceBet && !isBlackjack(dealer)) net -= insuranceBet;

  // The counterfactuals replay the same hands with different bet sizes.
  const tcAtBet = hands[0].tcAtBet ?? 0;
  const unitNet = hands.reduce((a, h) => {
    const r = settleHand(h.cards, dealer, { doubled: h.doubled, fromSplit: h.fromSplit });
    return a + r.net * (h.doubled ? 1 : 1);
  }, 0);
  s.sizing.flat = Math.max(0, s.sizing.flat + unitNet * FLAT_BET);
  const kf = kellyFraction(tcAtBet);
  const kStake = Math.max(FLAT_BET * 0.2, s.sizing.kelly * kf);
  s.sizing.kelly = Math.max(0, s.sizing.kelly + unitNet * kStake);

  const kellySaid = hands[0].kellyAtBet ?? 0;
  const bet = hands[0].bet;
  if (kellySaid > 0 && Math.abs(bet - kellySaid) / kellySaid < 0.35) s.sizing.sizedWell += 1;
  s.sizing.peakEdgeSeen = Math.max(s.sizing.peakEdgeSeen, edgeFromCount(tcAtBet));
  s.sizing.hands += 1;
  s.sizing.history.unshift({ tc: tcAtBet, bet, kelly: kellySaid, net, label: labels.join(" / ") });
  s.sizing.history = s.sizing.history.slice(0, 40);
  save();
  bumpRounds("sizing");

  const label = labels.join(" · ");
  els.msg.textContent = `${label}   ${net >= 0 ? "+" : ""}${fmt(net)}`;
  els.msg.className = "bj-msg show " + (net > 0 ? "win" : net < 0 ? "lose" : "push");
  if (net > 0) { sfx.win(labels.includes("Blackjack") ? 2 : 1); els.felt.classList.add("bj-win"); }
  else if (net < 0) sfx.lose();
  setTimeout(() => els.felt.classList.remove("bj-win"), 900);

  phase = "bet";
  els.deal.disabled = false;
  els.deal.textContent = "Deal again";
  setActions(false);
  syncStake();
  renderHands();
  renderCount();
  renderLedger();
  renderCounterfactual();
  cue(tcAtBet, bet, kellySaid);
}

function cue(tcAtBet, bet, kellySaid) {
  const s = get();
  if (s.sizing.hands >= 1) teach("bjBasics");
  if (s.sizing.hands >= 3) teach("kelly");
  if (tcAtBet >= 2.5 && bet <= FLAT_BET) teach("missedEdge");
  if (s.sizing.hands >= 10) teach("varianceVsEdge");
}

// ---------------------------------------------------------------- rendering

function setActions(on) {
  const h = hands[active];
  const two = h && h.cards.length === 2;
  els.hit.disabled = !on;
  els.stand.disabled = !on;
  els.double.disabled = !on || !two || !h || h.bet > get().chips;
  els.split.disabled = !on || !two || !h || !canSplit(h.cards) || hands.length > 1 || h.bet > get().chips;
}

function cardHTML(c, faceDown, i) {
  // A face-down card renders no rank and no suit at all. This is a table about information
  // edges, so the dealer's hole card must not sit in the DOM waiting to be read out of
  // devtools — it is re-rendered with its real face the moment it is legitimately revealed.
  const shown = faceDown ? null : c;
  const red = shown && (shown.suit === "H" || shown.suit === "D");
  return `
    <div class="bj-card ${faceDown ? "" : "flipped"}" style="--i:${i}">
      <div class="bj-card-inner">
        <div class="bj-face bj-back"></div>
        <div class="bj-face bj-front ${red ? "red" : ""}">
          <span class="bj-rank">${shown ? shown.rank : ""}</span>
          <span class="bj-suit">${shown ? SUIT_GLYPH[shown.suit] : ""}</span>
          <span class="bj-rank bj-rank--flip">${shown ? shown.rank : ""}</span>
        </div>
      </div>
    </div>`;
}

function renderDealer(revealHole = false) {
  const show = phase === "dealer" || phase === "settle" || revealHole;
  els.dealerCards.innerHTML = dealer
    .map((c, i) => cardHTML(c, i === 1 && !show, i))
    .join("");
  const visible = show ? dealer : dealer.slice(0, 1);
  const v = handValue(visible);
  els.dealerTotal.textContent = dealer.length ? (show ? v.total + (v.bust ? " bust" : "") : v.total + " +?") : "";
  els.dealerTotal.className = "bj-total" + (show && v.bust ? " bust" : "");
}

function renderHands() {
  els.playerRow.innerHTML = hands.map((h, idx) => {
    const v = handValue(h.cards);
    const bj = isBlackjack(h.cards) && !h.fromSplit;
    const tag = bj ? "Blackjack" : v.bust ? "Bust" : v.total + (v.soft && v.total !== 21 ? " soft" : "");
    return `
      <div class="bj-seat ${hands.length > 1 && idx === active && phase === "player" ? "active" : ""} ${h.result ? "settled" : ""}">
        <div class="bj-seat-label">
          ${hands.length > 1 ? `Hand ${idx + 1}` : "You"}
          <span class="bj-total ${v.bust ? "bust" : bj ? "bj" : ""}">${h.cards.length ? tag : ""}</span>
        </div>
        <div class="bj-cards">${h.cards.map((c, i) => cardHTML(c, false, i)).join("")}</div>
        <div class="bj-chip">${fmt(h.bet)}${h.doubled ? " ×2" : ""}</div>
      </div>`;
  }).join("") || `<div class="bj-seat"><div class="bj-seat-label">You</div><div class="bj-cards"></div></div>`;
  renderDealer();
}

function renderShoe() {
  const pct = (cardsLeft() / SHOE_SIZE) * 100;
  els.shoeFill.style.width = pct + "%";
  els.shoeCount.textContent = cardsLeft();
}

function renderCount() {
  const t = tc();
  const edge = edgeFromCount(t);
  const kf = kellyFraction(t);
  const kStake = Math.round(get().chips * kf);

  els.rc.textContent = (running > 0 ? "+" : "") + running;
  els.tcv.textContent = (t > 0 ? "+" : "") + t.toFixed(1);
  els.edge.textContent = (edge >= 0 ? "+" : "−") + Math.abs(edge * 100).toFixed(2) + "%";
  els.edge.className = edge > 0 ? "pos" : "neg";
  els.kelly.textContent = kStake > 0 ? fmt(kStake) : "table min";
  els.kelly.className = kStake > 0 ? "pos" : "";

  const heat = Math.max(0, Math.min(1, (t + 2) / 8));
  els.heat.style.width = heat * 100 + "%";
  els.heat.className = t >= 2 ? "hot" : t <= -1 ? "cold" : "";

  els.countRead.textContent =
    t >= 3 ? "The shoe is rich in tens and aces. This is the moment the edge is actually yours — bet like it."
    : t >= 2 ? "Turning in your favour. A bigger bet is now the mathematically correct one."
    : t >= 1 ? "Roughly break-even. Keep the bet small."
    : t <= -1 ? "Low cards are gone and the shoe favours the dealer. Bet the minimum and wait."
    : "The shoe is neutral. With no edge, the correct bet is the smallest one the table allows.";
}

function updateBookHint() {
  if (!showBook || phase !== "player") { els.bookHint.textContent = ""; return; }
  const h = hands[active];
  if (!h || !h.cards.length || !dealer.length) { els.bookHint.textContent = ""; return; }
  const move = basicStrategy(h.cards, dealer[0], {
    allowDouble: h.cards.length === 2, allowSplit: hands.length === 1 && canSplit(h.cards),
  });
  els.bookHint.innerHTML = `The book says <b style="color:var(--brass-lit)">${STRATEGY_NAME[move]}</b>.
    Blackjack is a solved game — this table is not an opinion.`;
}

function flashMsg(text) {
  els.msg.textContent = text;
  els.msg.className = "bj-msg show";
}

function renderLedger() {
  const h = get().sizing.history;
  if (!h.length) { els.ledger.innerHTML = `<tr><td colspan="4" class="empty">No hands yet.</td></tr>`; return; }
  els.ledger.innerHTML = h.slice(0, 9).map((r) => `
    <tr>
      <td class="${r.tc >= 2 ? "win" : r.tc <= -1 ? "lose" : ""}">${r.tc > 0 ? "+" : ""}${r.tc.toFixed(1)}</td>
      <td>${fmt(r.bet)}</td>
      <td>${r.kelly > 0 ? fmt(r.kelly) : "min"}</td>
      <td class="${r.net >= 0 ? "win" : "lose"}" style="text-align:right">${r.net >= 0 ? "+" : ""}${fmt(r.net)}</td>
    </tr>`).join("");
}

function renderCounterfactual() {
  const s = get();
  const v = { you: s.chips, kelly: s.sizing.kelly, flat: s.sizing.flat };
  const max = Math.max(v.you, v.kelly, v.flat, 1);
  for (const k of ["you", "kelly", "flat"]) {
    document.getElementById("cf-" + k).textContent = fmt(v[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (v[k] / max) * 100) + "%";
  }
}
