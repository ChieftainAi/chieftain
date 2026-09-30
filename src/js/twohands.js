// Table 4 — Two Hands (baccarat).
//
// The only table in the building where the player makes no decisions at all after the bet is
// placed. That is deliberate: this is a lesson about *choosing a product*, not about playing a
// hand. You pick one of three, the tableau deals itself, and the only thing that ever mattered
// was which of the three you picked.
//
// And the choice is a genuine inversion of the Sector Reels lesson. Banker is the only wager in
// the building that charges a visible, itemised 5% fee — and it is the best bet on the floor.
// Player looks free and is quietly worse. Tie pays 8:1, tells the best story, and is the worst
// number in the game at −14.36%. Fees are not the enemy; expected return *after* fees is the
// only thing that was ever the point.
import {
  freshShoe, playCoup, settle, total, pip, PROB, BETS, ev, COMMISSION, DECKS, PENETRATION,
  SUIT_GLYPH,
} from "./baccarat-rules.js";
import { get, addChips, bumpRounds, save, fmt } from "./state.js";
import { teach } from "./lessons.js";
import { sfx, isMuted, toggleMute } from "./sfx.js";

const DENOMS = [5, 25, 100];
const DEAL_MS = 420;            // between cards
const SETTLE_MS = 700;          // after the last card, before chips move

let els, shoe = [], cut = 0, idx = 0;
let bet = null, stake = 0, denom = 25;
let coup = null, phase = "betting", gen = 0, bankBefore = 0;
let timers = [];

const after = (ms, fn) => { const g = gen; timers.push(setTimeout(() => { if (g === gen) fn(); }, ms)); };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const pct = (x) => (x * 100).toFixed(2) + "%";
const signPct = (x) => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(2) + "%";

function draw() {
  if (idx >= cut) { shoe = freshShoe(); idx = 0; cut = Math.floor(shoe.length * PENETRATION); }
  return shoe[idx++];
}

/**
 * Fast-forward the three products over many coups, using the same tableau and the same
 * settlement code the table plays with. This exists because the headline lesson is not
 * visible by hand: Banker beats Player by 0.18 percentage points, and a gap that small does
 * not show up in a session, an evening, or a lifetime of evenings.
 */
function longRun(n) {
  const bank = { banker: 1000, player: 1000, tie: 1000 };
  let commission = 0, wins = { banker: 0, player: 0, tie: 0 };
  for (let i = 0; i < n; i++) {
    const c = playCoup(draw);
    wins[c.outcome] += 1;
    for (const id of ["banker", "player", "tie"]) {
      const st = bank[id] * 0.01;
      const r = settle(id, st, c);
      bank[id] = Math.max(0, bank[id] - st + r.returned);
      if (id === "banker") commission += r.commission;
    }
  }
  return { bank, commission, wins, n };
}

// ---------------------------------------------------------------- view

const cardHTML = (c, i) => `
  <div class="bj-card flipped" style="--i:${i}">
    <div class="bj-card-inner">
      <div class="bj-face bj-back"></div>
      <div class="bj-face bj-front ${c && (c.suit === "H" || c.suit === "D") ? "red" : ""}">
        <span class="bj-rank">${c ? c.rank : ""}</span>
        <span class="bj-suit">${c ? SUIT_GLYPH[c.suit] : ""}</span>
        <span class="bj-rank bj-rank--flip">${c ? c.rank : ""}</span>
      </div>
    </div>
  </div>`;

const spot = (id) => {
  const b = BETS[id];
  return `
    <button class="bac-spot bac-spot--${id}" data-spot="${id}">
      <span class="bac-spot-name">${b.label}</span>
      <span class="bac-spot-pays">${b.pays}</span>
      <span class="bac-spot-edge">${signPct(ev(id))}</span>
      <span class="bac-chip" data-chip="${id}"></span>
    </button>`;
};

export function view() {
  const s = get().twohands;
  return `
    <a class="back-link" href="#/" data-nav>&larr; The Floor</a>

    <div class="table-head">
      <div>
        <h1>Two Hands</h1>
        <p class="sub">Two hands are dealt. You do not play either of them — you only choose which
        one to back, and then the rules deal themselves out with nobody making a single decision.
        <em>Banker charges an itemised 5% fee and is still the best bet in the building.</em></p>
      </div>
    </div>

    <div class="bac-wrap">
      <div>
        <div class="bac-felt">
          <div class="bac-hands">
            <div class="bac-hand" data-hand="player">
              <div class="bac-hand-head"><span>Player</span><b id="bac-ptot">—</b></div>
              <div class="bj-cards" id="bac-pcards"></div>
            </div>
            <div class="bac-versus" id="bac-versus">vs</div>
            <div class="bac-hand" data-hand="banker">
              <div class="bac-hand-head"><span>Banker</span><b id="bac-btot">—</b></div>
              <div class="bj-cards" id="bac-bcards"></div>
            </div>
          </div>

          <div class="bac-msg" id="bac-msg"></div>

          <div class="bac-spots">${["player", "tie", "banker"].map(spot).join("")}</div>
        </div>

        <div class="panel" style="margin-top:16px">
          <h2>The three products</h2>
          <div class="ln-scroll">
            <table class="ledger bac-ev">
              <thead><tr>
                <th>Bet</th><th>Wins</th><th>Pays</th><th>Fee</th>
                <th>House edge</th><th style="text-align:right">What it is</th>
              </tr></thead>
              <tbody>
                ${["banker", "player", "tie"].map((id) => `
                  <tr class="${id === "banker" ? "bac-best" : ""}">
                    <td>${BETS[id].label}</td>
                    <td>${pct(PROB[id])}</td>
                    <td>${BETS[id].pays}</td>
                    <td>${id === "banker" ? "5%" : "none"}</td>
                    <td class="${id === "banker" ? "win" : "lose"}">${signPct(ev(id))}</td>
                    <td style="text-align:right">${BETS[id].teaches}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <p class="cf-note">Read the fee column against the edge column. <b>The only bet that
          charges you a fee is the only bet worth making.</b> Player looks free and costs you more;
          Tie charges nothing and costs you fourteen times as much. A fee is not a cost — it is one
          line in a cost, and the number that matters is what is left after all of them.</p>
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Your bet</h2>
          <div class="denoms" id="bac-denoms">
            ${DENOMS.map((d) => `<button class="denom ${d === denom ? "on" : ""}" data-denom="${d}">${d}</button>`).join("")}
          </div>
          <p class="hint">Click a spot to back it. Shift-click or right-click to take chips back.</p>
          <div class="actions" style="margin-top:14px">
            <button class="btn btn-primary btn-lg" id="bac-deal">Deal</button>
            <button class="btn" id="bac-clear">Clear</button>
            <button class="btn btn-ghost" id="bac-mute">${isMuted() ? "Sound off" : "Sound on"}</button>
          </div>
          <p class="hint" id="bac-staked">Nothing staked.</p>
          <p class="edge-note">Eight decks &middot; commission <b>5%</b> on winning Banker bets
          &middot; ties push on Player and Banker. Nothing here is redeemable.</p>
        </div>

        <div class="panel">
          <h2>Commission paid</h2>
          <p class="rail-big" id="bac-commission">${fmt(s.commissionPaid)}</p>
          <p class="cf-note" id="bac-commission-note">Every chip of it visible, itemised, and
          taken out of a winning bet.</p>
        </div>

        <div class="panel">
          <h2>The long run</h2>
          <p class="cf-note">Banker beats Player by <b>0.18 percentage points</b>. That is a real
          edge and it is nearly invisible: after <b>200,000</b> coups the better product is ahead
          in only about <b>68%</b> of runs. You would need roughly a <b>million</b> hands before
          it was reliably visible in your own results.</p>
          <div class="actions" style="margin-top:12px">
            <button class="btn" id="bac-longrun">Play 10,000 coups</button>
          </div>
          <div id="bac-longrun-out"></div>
          <p class="cf-note">Press it a few times. Tie is annihilated every single run, because
          &minus;14.36% is an edge big enough to see. Banker and Player keep swapping places,
          because 0.18% is not. <b>Big costs are obvious and small ones are invisible — which is
          exactly why people cannot pick products by looking at returns.</b></p>
        </div>

        <div class="panel">
          <h2>Same coups, three products</h2>
          <div class="counterfactual">
            <div class="cf-row cf-disc">
              <span class="cf-name">Always Banker<small>pays the 5%</small></span>
              <span class="cf-val" id="cf-banker">${fmt(s.banker)}</span>
              <span class="cf-bar"><span id="cf-banker-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-you">
              <span class="cf-name">Always Player<small>no fee at all</small></span>
              <span class="cf-val" id="cf-player">${fmt(s.player)}</span>
              <span class="cf-bar"><span id="cf-player-bar" style="width:33%"></span></span>
            </div>
            <div class="cf-row cf-moon">
              <span class="cf-name">Always Tie<small>pays 8 to 1</small></span>
              <span class="cf-val" id="cf-tie">${fmt(s.tie)}</span>
              <span class="cf-bar"><span id="cf-tie-bar" style="width:33%"></span></span>
            </div>
          </div>
          <p class="cf-note">Three shadow bankrolls, flat-betting the same coups you are playing.
          The fee-paying line is the one that lasts.</p>
        </div>

        <div class="panel">
          <h2>The road</h2>
          <div class="bac-road" id="bac-road"></div>
          <p class="cf-note">Casinos print this board and hand you a pencil. Each coup is dealt
          from a freshly shuffled shoe and is <b>independent of every coup before it</b> — the
          streaks are real, they simply carry no information. This is the same pattern-matching
          tier five warns you about, and the house supplies the paper for free because it keeps
          you at the table.</p>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- mount

export function mount() {
  gen++;
  clearTimers();
  shoe = freshShoe(); idx = 0; cut = Math.floor(shoe.length * PENETRATION);
  bet = null; stake = 0; coup = null; phase = "betting";

  els = {
    pcards: document.getElementById("bac-pcards"),
    bcards: document.getElementById("bac-bcards"),
    ptot: document.getElementById("bac-ptot"),
    btot: document.getElementById("bac-btot"),
    msg: document.getElementById("bac-msg"),
    versus: document.getElementById("bac-versus"),
    deal: document.getElementById("bac-deal"),
    clear: document.getElementById("bac-clear"),
    mute: document.getElementById("bac-mute"),
    staked: document.getElementById("bac-staked"),
    commission: document.getElementById("bac-commission"),
    road: document.getElementById("bac-road"),
  };

  document.querySelectorAll("[data-spot]").forEach((b) => {
    b.addEventListener("click", (e) => place(b.dataset.spot, e.shiftKey ? -1 : 1));
    b.addEventListener("contextmenu", (e) => { e.preventDefault(); place(b.dataset.spot, -1); });
  });
  document.getElementById("bac-denoms").addEventListener("click", (e) => {
    const b = e.target.closest("[data-denom]");
    if (!b) return;
    denom = +b.dataset.denom;
    document.querySelectorAll("[data-denom]").forEach((x) => x.classList.toggle("on", x === b));
    sfx.tick();
  });
  els.deal.addEventListener("click", deal);
  document.getElementById("bac-longrun").addEventListener("click", showLongRun);
  els.clear.addEventListener("click", () => { bet = null; stake = 0; renderBet(); sfx.tick(); });
  els.mute.addEventListener("click", () => {
    els.mute.textContent = toggleMute() ? "Sound off" : "Sound on";
  });

  renderBet();
  renderRoad();
  renderCounterfactual();
}

export function unmount() {
  gen++;
  clearTimers();
}

// ---------------------------------------------------------------- betting

function place(id, dir) {
  if (phase !== "betting") return;
  if (bet && bet !== id) { bet = id; stake = 0; }       // one product at a time, like real life
  bet = id;
  if (dir > 0) {
    if (stake + denom > get().chips) { els.staked.textContent = "Not enough chips for that."; return; }
    stake += denom;
    sfx.coin();
    if (id === "tie") teach("tieTrap");
  } else {
    stake = Math.max(0, stake - denom);
    if (stake === 0) bet = null;
    sfx.tick();
  }
  renderBet();
}

function renderBet() {
  document.querySelectorAll("[data-chip]").forEach((c) => {
    const on = bet === c.dataset.chip && stake > 0;
    c.textContent = on ? fmt(stake) : "";
    c.className = "bac-chip" + (on ? " on" : "");
  });
  document.querySelectorAll("[data-spot]").forEach((b) =>
    b.classList.toggle("on", bet === b.dataset.spot && stake > 0));
  els.staked.innerHTML = stake > 0
    ? `<b>${fmt(stake)}</b> on ${BETS[bet].label} &middot; edge <span class="${
        ev(bet) > -0.02 ? "up" : "down"}">${signPct(ev(bet))}</span>`
    : "Nothing staked.";
}

// ---------------------------------------------------------------- the coup

function deal() {
  if (phase === "dealing") return;
  if (phase === "settled") { resetTable(); return; }
  if (!bet || stake <= 0) { els.staked.textContent = "Back one of the three first."; return; }
  if (stake > get().chips) { els.staked.textContent = "Not enough chips."; return; }

  bankBefore = get().chips;
  addChips(-stake);
  phase = "dealing";
  els.deal.disabled = true;
  els.clear.disabled = true;
  els.msg.className = "bac-msg";
  els.msg.textContent = "";
  els.pcards.innerHTML = "";
  els.bcards.innerHTML = "";
  els.ptot.textContent = "—";
  els.btot.textContent = "—";
  sfx.lever();

  coup = playCoup(draw);

  // Deal the cards out in the order the tableau actually produced them.
  const shown = { player: [], banker: [] };
  coup.steps.forEach((step, i) => {
    after(DEAL_MS * (i + 1), () => {
      shown[step.to].push(step.card);
      const host = step.to === "player" ? els.pcards : els.bcards;
      host.innerHTML = shown[step.to].map(cardHTML).join("");
      (step.to === "player" ? els.ptot : els.btot).textContent = total(shown[step.to]);
      sfx.reelStop(i);
      if (i === 3 && coup.natural) {
        els.msg.className = "bac-msg show";
        els.msg.textContent = "Natural — no third card";
      }
      if (i >= 4) {
        els.msg.className = "bac-msg show";
        els.msg.textContent = `${step.to === "player" ? "Player" : "Banker"} draws — the tableau says so`;
      }
    });
  });

  after(DEAL_MS * coup.steps.length + SETTLE_MS, finish);
}

function finish() {
  const r = settle(bet, stake, coup);
  addChips(r.returned);

  const s = get();
  const t = s.twohands;
  t.coups += 1;
  t.wagered += r.push ? 0 : stake;
  t.commissionPaid += r.commission;
  t.history.unshift(coup.outcome);
  t.history = t.history.slice(0, 60);

  // Three shadow bankrolls flat-betting the same coup, so the comparison is like for like.
  // Each shadow stakes the same SHARE of its own bank that you staked of yours, so the three
  // lines differ only by which product they bought. Two details matter here. Staking a share
  // rather than a flat unit means a negative-expectation line decays geometrically instead of
  // hitting an absorbing zero — at a flat stake all three bust inside a few thousand coups and
  // the comparison stops teaching anything. And the stake always comes off and settle()'s
  // return always goes back on: a push returns the stake exactly, so it nets to zero by itself,
  // and special-casing it would hand out a free unit on roughly one coup in ten.
  const frac = Math.min(0.25, stake / Math.max(1, bankBefore));
  for (const id of ["banker", "player", "tie"]) {
    const st = t[id] * frac;
    const sr = settle(id, st, coup);
    t[id] = Math.max(0, t[id] - st + sr.returned);
  }
  save();
  bumpRounds("twohands");

  const won = r.net > 0, push = r.push;
  els.msg.className = "bac-msg show " + (push ? "push" : won ? "win" : "lose");
  els.msg.textContent = push
    ? `Tie — ${BETS[bet].label} pushes, stake back`
    : `${BETS[coup.outcome].label} wins ${coup.playerTotal}–${coup.bankerTotal}` +
      `   ${won ? "+" : "−"}${fmt(Math.abs(r.net))}` +
      (r.commission ? `  (after ${fmt(r.commission)} commission)` : "");
  if (push) sfx.tick(); else if (won) sfx.win(bet === "tie" ? 2 : 1); else sfx.lose();

  document.querySelector(`[data-spot="${coup.outcome}"]`)?.classList.add("hit");

  phase = "settled";
  els.deal.disabled = false;
  els.clear.disabled = false;
  els.deal.textContent = "Next coup";
  renderRoad();
  renderCounterfactual();
  renderCommission();

  teach("bacNoDecisions");  // earned by a coup, not handed over on arrival
  if (t.coups >= 1) teach("theCommission");
  if (t.coups >= 6) teach("beadPlate");
  if (t.coups >= 12) teach("netOfFees");
}

function resetTable() {
  phase = "betting";
  els.deal.textContent = "Deal";
  els.msg.className = "bac-msg";
  els.msg.textContent = "";
  document.querySelectorAll("[data-spot]").forEach((b) => b.classList.remove("hit"));
  renderBet();
}

// ---------------------------------------------------------------- panels

function showLongRun() {
  const btn = document.getElementById("bac-longrun");
  btn.disabled = true;
  btn.textContent = "Dealing 10,000…";
  // Let the button repaint before a synchronous burst of ten thousand coups.
  after(16, () => {
    const r = longRun(10000);
    const lead = r.bank.banker >= r.bank.player ? "Banker" : "Player";
    document.getElementById("bac-longrun-out").innerHTML = `
      <div class="bac-lr">
        <div class="bac-lr-row"><span>Banker</span><b>${fmt(r.bank.banker)}</b></div>
        <div class="bac-lr-row"><span>Player</span><b>${fmt(r.bank.player)}</b></div>
        <div class="bac-lr-row bac-lr-tie"><span>Tie</span><b>${fmt(r.bank.tie)}</b></div>
        <p class="bac-lr-note">${lead} finished ahead this run &middot;
        ${fmt(r.commission)} paid in commission &middot; ties ${(r.wins.tie / r.n * 100).toFixed(1)}%</p>
      </div>`;
    btn.disabled = false;
    btn.textContent = "Play another 10,000";
    sfx.tick();
    teach("theLongRun");
  });
}

function renderCommission() {
  const t = get().twohands;
  els.commission.textContent = fmt(t.commissionPaid);
  const ahead = t.banker - t.player;
  document.getElementById("bac-commission-note").innerHTML = t.coups < 4
    ? `Every chip of it visible, itemised, and taken out of a winning bet.`
    : `Paid <b>${fmt(t.commissionPaid)}</b> in fees so far. The Banker line is currently
       <b class="${ahead >= 0 ? "up" : "down"}">${ahead >= 0 ? "ahead of" : "behind"}</b> the
       no-fee Player line by ${fmt(Math.abs(ahead))} — and over this many coups that tells you
       <b>nothing at all</b>. The gap between them is 0.18%; what you are looking at is noise.`;
}

function renderRoad() {
  const h = get().twohands.history;
  els.road.innerHTML = h.length
    ? h.slice(0, 48).map((o, i) =>
        `<i class="bac-bead ${o} ${i === 0 ? "fresh" : ""}" title="${BETS[o].label}">${
          o === "banker" ? "B" : o === "player" ? "P" : "T"}</i>`).join("")
    : `<span class="rl-hist-empty">No coups yet</span>`;
}

function renderCounterfactual() {
  const t = get().twohands;
  const v = { banker: t.banker, player: t.player, tie: t.tie };
  const max = Math.max(v.banker, v.player, v.tie, 1);
  for (const k of ["banker", "player", "tie"]) {
    document.getElementById("cf-" + k).textContent = fmt(v[k]);
    document.getElementById("cf-" + k + "-bar").style.width = Math.max(2, (v[k] / max) * 100) + "%";
  }
}
