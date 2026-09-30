// The Ladder — the prestige page, and the spine of the learning system.
//
// The loop, per rung: read the tier's cards (small bounty each), pass the tier's check (the
// bulk of the coins, plus the capability it unlocks), then close the remaining gap to the
// threshold at the tables using the edge you just earned. Buying the rung costs two thirds of
// the bank, so the next climb starts from a third of the height.
//
// The check is the real gate. Reading is required before you may sit it, the pass mark rises
// with the band, and the paper is dealt fresh from a larger pool every attempt — so a retake
// is a different exam, not a memory test on button positions. Attempts are counted and shown,
// because a rung passed on the seventh try is a different fact than one passed first time.
import { get, addChips, save, render, fmt, restake, RESTAKE_FLOOR, RESTAKE_TO } from "./state.js";
import {
  TIERS, tierByN, MAX_LEVEL, thresholdFor, checkBounty, readBounty,
  checkLength, passMark, UNLOCKS, KEEP_ON_PRESTIGE,
} from "./curriculum.js";
import { STUDY } from "./study.js";
import { deal, poolSize } from "./checks.js";
import { draw } from "./chart.js";
import { sfx } from "./sfx.js";
import { refreshChipCount } from "./shell.js";

let host = null;
let mode = "ladder";          // ladder | check | result
let openCard = null;
let quiz = null;              // { tier, qs, at, picked: [], done }
let charts = {};              // canvas key -> chart spec
let repaintCharts = () => {};

const P = () => get().prestige;
const nextTier = () => Math.min(MAX_LEVEL, P().level + 1);
const isMaxed = () => P().level >= MAX_LEVEL;
const hasRead = (id) => P().read.includes(id);
const hasPassed = (t) => P().passed.includes(t);

const pct = (x) => Math.round(x * 100) + "%";

// ---------------------------------------------------------------- shell

export function view() {
  return `<div id="ladder-root"></div>`;
}

export function mount() {
  host = document.getElementById("ladder-root");
  // Entering the page always lands on the ladder. Without this, leaving mid-check and coming
  // back would drop you into a stale question or a result screen for a check already banked.
  mode = "ladder";
  quiz = null;
  openCard = null;
  paint();
}

export function unmount() {
  host = null;
  mode = "ladder";
  quiz = null;
  openCard = null;
  window.removeEventListener("resize", repaintCharts);
}

function paint() {
  if (!host) return;
  charts = {};
  host.innerHTML =
    mode === "check" ? checkHTML()
    : mode === "result" ? resultHTML()
    : ladderHTML();
  bind();
  mountCanvases();
  window.removeEventListener("resize", repaintCharts);
  window.addEventListener("resize", repaintCharts);
}

function mountCanvases() {
  const nodes = [...host.querySelectorAll("[data-chart]")];
  repaintCharts = () => nodes.forEach((n) => draw(n, charts[n.dataset.chart]));
  repaintCharts();
}

let chartSeq = 0;
function chartCanvas(spec, h) {
  if (!spec) return "";
  const key = "c" + chartSeq++;
  charts[key] = { ...spec, h };
  return `<div class="ch-wrap"><canvas data-chart="${key}"></canvas>${
    spec.label ? `<p class="ch-cap">${spec.label}</p>` : ""}</div>`;
}

// ---------------------------------------------------------------- the ladder

function rungHTML(t) {
  const lvl = P().level;
  const done = t.n <= lvl;
  const current = t.n === lvl + 1;
  const state = done ? "done" : current ? "current" : "locked";
  const u = UNLOCKS[t.n];
  const tries = P().attempts[t.n] || 0;
  return `
    <div class="rung ${state}" data-rung="${t.n}">
      <div class="rung-n">${done ? "✓" : String(t.n).padStart(2, "0")}</div>
      <div class="rung-body">
        <div class="rung-top">
          <b>${t.name}</b>
          <span class="rung-band ${t.band}">${t.band}</span>
        </div>
        <p class="rung-blurb">${t.blurb}</p>
        <p class="rung-unlock"><i>Unlocks</i> ${u.label}</p>
      </div>
      <div class="rung-right">
        <span class="rung-cost">${fmt(thresholdFor(t.n))}</span>
        <span class="rung-sub">${done ? (tries ? `passed in ${tries} attempt${tries === 1 ? "" : "s"}` : "passed")
          : current ? "current rung" : "locked"}</span>
      </div>
    </div>`;
}

function cardHTML(card, tier) {
  const got = hasRead(card.id);
  const open = openCard === card.id;
  return `
    <article class="study ${got ? "got" : ""} ${open ? "open" : ""}">
      <button class="study-head" data-card="${card.id}">
        <span class="study-tick">${got ? "✓" : ""}</span>
        <span class="study-title">${card.title}</span>
        <span class="study-pay">${got ? "read" : "+" + fmt(readBounty(tier))}</span>
      </button>
      ${open ? `<div class="study-body">${card.body}${chartCanvas(card.chart, 230)}</div>` : ""}
    </article>`;
}

function currentTierHTML() {
  const n = nextTier();
  const t = tierByN(n);
  const cards = STUDY[n] || [];
  const read = cards.filter((c) => hasRead(c.id)).length;
  const passed = hasPassed(n);
  const bank = get().chips;
  const need = thresholdFor(n);
  const ready = passed && bank >= need;
  const tries = P().attempts[n] || 0;

  return `
    <div class="panel tierpanel">
      <h2>Rung ${String(n).padStart(2, "0")} · ${t.band}</h2>
      <h2 class="tier-name">${t.name}</h2>
      <p class="tier-blurb">${t.blurb}</p>

      <div class="tier-steps">
        <div class="step ${read === cards.length ? "done" : "now"}">
          <b>1 · Study</b><span>${read} of ${cards.length} cards read</span>
        </div>
        <div class="step ${passed ? "done" : read === cards.length ? "now" : ""}">
          <b>2 · Check</b><span>${passed ? `passed${tries ? ` · ${tries} attempt${tries === 1 ? "" : "s"}` : ""}`
            : `${checkLength(n)} questions, ${pct(passMark(n))} to pass`}</span>
        </div>
        <div class="step ${ready ? "now" : ""}">
          <b>3 · Buy the rung</b><span>${fmt(need)} required</span>
        </div>
      </div>

      <div class="studylist">${cards.map((c) => cardHTML(c, n)).join("")}</div>

      ${passed ? `
        <div class="unlocked">
          <b>Unlocked · ${UNLOCKS[n].label}</b>
          <p>${UNLOCKS[n].note}</p>
        </div>` : `
        <div class="prize" style="margin-bottom:14px">
          <span class="prize-label">Passing pays</span>
          <span class="prize-fig">${fmt(checkBounty(n))}</span>
          <p class="prize-sub">and unlocks ${UNLOCKS[n].label}.</p>
        </div>
        <button class="btn btn-primary btn-lg check-cta" id="start-check"
                ${read === cards.length ? "" : "disabled"}>
          ${read === cards.length ? `Take the check — ${checkLength(n)} questions` : "Read all the cards first"}
        </button>
        <p class="hint">The paper is dealt from a pool of ${poolSize(n)}, so every attempt is a
        different one.</p>`}

      ${passed ? bankGateHTML(n, bank, need) : ""}
    </div>`;
}

function bankGateHTML(n, bank, need) {
  const ready = bank >= need;
  const short = Math.max(0, need - bank);
  const growth = bank > 0 ? need / bank - 1 : Infinity;
  return `
    <div class="gate ${ready ? "ready" : ""}">
      <div class="gate-bar"><i style="width:${Math.min(100, (bank / need) * 100)}%"></i></div>
      <div class="gate-row">
        <span>Bank <b>${fmt(bank)}</b></span>
        <span>Required <b>${fmt(need)}</b></span>
      </div>
      ${ready
        ? `<button class="btn btn-cash btn-lg" id="buy-rung">Buy rung ${String(n).padStart(2, "0")}
             — costs ${fmt(bank * (1 - KEEP_ON_PRESTIGE))} chips</button>
           <p class="hint">You keep <b>${fmt(bank * KEEP_ON_PRESTIGE)}</b> and climb the next rung from there.</p>`
        : `<p class="gate-note">Short by <b>${fmt(short)}</b> — the bank has to grow about
           <b>${Math.round(growth * 100)}%</b>. Go and use the edge you just unlocked; the casino
           itself is negative-expectation, so the only way to close this is the positive-expectation
           play, not more spins.</p>`}
    </div>`;
}

function ladderHTML() {
  const s = get();
  const lvl = P().level;
  const maxed = isMaxed();
  const concepts = Object.values(STUDY).flat();
  const readAll = concepts.filter((c) => hasRead(c.id)).length;

  return `
    <section class="hero hero--narrow">
      <p class="eyebrow">The Ladder</p>
      <h1>Ten rungs. <em>One body of material each.</em></h1>
      <p class="lede">Every rung is bought with a bank you built, and buying it <strong>costs you two thirds of that bank</strong> — so you climb the
      next one from a third of the height, with harder material and a higher pass mark.
      ${maxed ? "You have reached the top. There is nothing left to unlock."
              : "At the top, there is nothing left in the game you have not been checked on."}</p>
      <div class="hero-stats">
        <span class="badge badge--accent">Prestige <b>${lvl}/${MAX_LEVEL}</b></span>
        <span class="badge">Concepts <b>${readAll}/${concepts.length}</b></span>
        <span class="badge">Checks <b>${P().passed.length}/${MAX_LEVEL}</b></span>
        ${maxed ? `<span class="badge badge--live">Complete</span>`
                : `<span class="badge badge--hot">Next reward <b>${fmt(checkBounty(nextTier()))}</b></span>`}
      </div>
    </section>

    <div class="lad-grid">
      <div>
        ${maxed ? maxedHTML() : currentTierHTML()}
      </div>
      <div>
        <div class="panel">
          <h2>Why you cannot grind this</h2>
          <p class="cf-note">Every table in this building is negative-expectation on purpose. Play
          more and you lose more — that is arithmetic, not difficulty. So the coins come
          overwhelmingly from comprehension, and each check unlocks a play that actually has a
          positive expectation. <b>The ladder is not a measure of persistence. It cannot be.</b></p>
        </div>

        <div class="panel">
          <h2>Standing</h2>
          <div class="blocks" style="margin-bottom:14px">
            <div class="cd-block cd-block--accent">
              <span class="cd-num">${lvl}</span><span class="cd-label">Rung</span>
            </div>
            <div class="cd-block">
              <span class="cd-num">${readAll}</span><span class="cd-label">Read</span>
            </div>
            <div class="cd-block">
              <span class="cd-num">${P().passed.length}</span><span class="cd-label">Checks</span>
            </div>
            <div class="cd-block">
              <span class="cd-num">${s.rounds}</span><span class="cd-label">Rounds</span>
            </div>
          </div>
          <div class="count-grid">
            <div><span class="k">Bank</span><b>${fmt(s.chips)}</b></div>
            <div><span class="k">Rebuilt from ruin</span><b class="${P().restakes ? "neg" : ""}">${P().restakes}</b></div>
          </div>
          ${s.chips < RESTAKE_FLOOR ? `
            <button class="btn btn-lg" id="restake" style="width:100%;margin-top:12px">
              Rebuild the bank to ${fmt(RESTAKE_TO)}</button>
            <p class="hint">Your bank is effectively gone. A negative-expectation game can do
            that, and in the real world there is no button. This one is counted.</p>` : ""}
        </div>

        <div class="panel">
          <h2>The rungs</h2>
          <div class="rungs">${TIERS.map(rungHTML).join("")}</div>
        </div>
      </div>
    </div>`;
}

function maxedHTML() {
  const when = P().maxedAt ? new Date(P().maxedAt).toLocaleDateString() : "";
  return `
    <div class="panel tierpanel maxed">
      <h2>Prestige ${MAX_LEVEL} · complete</h2>
      <h2 class="tier-name">The full ladder</h2>
      <p class="tier-blurb">Every concept in the game read, every check passed${when ? ` — ${when}` : ""}.</p>
      <p>You started at a slot machine being told the fee was the whole story. You finish knowing
      what a price is, what it hides, what a chart can and cannot tell you, how to value a claim on
      cash, why the market can be wrong in a way that makes itself right, why the bell curve lies
      about the days that matter, and who is on the other side of your fills.</p>
      <p><strong>The house edge was never the only thing taking a cut. It was just the honest one,
      because it was printed on the felt.</strong></p>
    </div>`;
}

// ---------------------------------------------------------------- the check

function checkHTML() {
  const { tier, qs, at, picked } = quiz;
  const q = qs[at];
  const t = tierByN(tier);
  return `
    <section class="hero hero--narrow">
      <p class="eyebrow">Rung ${String(tier).padStart(2, "0")} check · ${t.band} · ${pct(passMark(tier))} to pass</p>
      <h1>${t.name}</h1>
    </section>

    <div class="panel quiz">
      <div class="quiz-prog">
        ${qs.map((_, i) => `<i class="${i < at ? "done" : i === at ? "now" : ""}"></i>`).join("")}
        <span>${at + 1} of ${qs.length}</span>
      </div>
      <h2 class="quiz-q">${q.q}</h2>
      ${chartCanvas(q.chart, 250)}
      <div class="quiz-opts">
        ${q.options.map((o, i) => `
          <button class="quiz-opt ${picked[at] === i ? "on" : ""}" data-opt="${i}">
            <span class="quiz-letter">${"ABCD"[i]}</span><span>${o}</span>
          </button>`).join("")}
      </div>
      <div class="quiz-nav">
        <button class="btn" id="quiz-back" ${at === 0 ? "disabled" : ""}>Back</button>
        <button class="btn btn-primary" id="quiz-next" ${picked[at] == null ? "disabled" : ""}>
          ${at === qs.length - 1 ? "Submit the check" : "Next"}
        </button>
      </div>
      <p class="hint">Nothing is marked until you submit. ${qs.length} questions,
      ${Math.ceil(passMark(tier) * qs.length)} correct to pass.</p>
    </div>`;
}

function resultHTML() {
  const { tier, qs, picked, score, passedNow } = quiz;
  const needed = Math.ceil(passMark(tier) * qs.length);
  const t = tierByN(tier);
  return `
    <section class="hero hero--narrow">
      <p class="eyebrow">Rung ${String(tier).padStart(2, "0")} · attempt ${P().attempts[tier] || 1}</p>
      <h1 class="${passedNow ? "pass" : "fail"}">${passedNow ? "Passed" : "Not yet"}</h1>
      <p class="lede">${score} of ${qs.length} correct — ${needed} needed.
      ${passedNow
        ? `That pays <strong>${fmt(checkBounty(tier))}</strong> and unlocks
           <strong>${UNLOCKS[tier].label}</strong>.`
        : `Nothing is lost but the attempt, and it is counted. Read the explanations below, then
           sit it again — you will get a different paper.`}</p>
    </section>

    <div class="panel">
      <h2>Every question, and why</h2>
      <div class="review">
        ${qs.map((q, i) => {
          const ok = picked[i] === q.answer;
          return `
            <article class="rev ${ok ? "ok" : "no"}">
              <p class="rev-q"><span>${ok ? "✓" : "✗"}</span>${q.q}</p>
              ${!ok && picked[i] != null
                ? `<p class="rev-yours">You chose: ${q.options[picked[i]]}</p>` : ""}
              <p class="rev-ans"><b>${q.options[q.answer]}</b></p>
              <p class="rev-why">${q.why}</p>
            </article>`;
        }).join("")}
      </div>
      <div class="quiz-nav" style="margin-top:16px">
        <button class="btn btn-primary btn-lg" id="back-ladder">Back to the ladder</button>
        ${passedNow ? "" : `<button class="btn btn-lg" id="retake">Sit it again</button>`}
      </div>
    </div>`;
}

// ---------------------------------------------------------------- wiring

function bind() {
  const on = (sel, ev, fn) => host.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));

  on("[data-card]", "click", (e) => {
    const id = e.currentTarget.dataset.card;
    openCard = openCard === id ? null : id;
    if (openCard) readCard(id);
    else paint();
  });

  const startBtn = host.querySelector("#start-check");
  if (startBtn) startBtn.addEventListener("click", startCheck);

  const buyBtn = host.querySelector("#buy-rung");
  if (buyBtn) buyBtn.addEventListener("click", buyRung);

  const re = host.querySelector("#restake");
  if (re) re.addEventListener("click", () => {
    if (restake()) { sfx.unlock(); paint(); }
  });

  on("[data-opt]", "click", (e) => {
    quiz.picked[quiz.at] = +e.currentTarget.dataset.opt;
    sfx.tick();
    paint();
  });

  const back = host.querySelector("#quiz-back");
  if (back) back.addEventListener("click", () => { quiz.at = Math.max(0, quiz.at - 1); paint(); });

  const next = host.querySelector("#quiz-next");
  if (next) next.addEventListener("click", () => {
    if (quiz.at < quiz.qs.length - 1) { quiz.at++; sfx.tick(); paint(); }
    else submitCheck();
  });

  const bl = host.querySelector("#back-ladder");
  if (bl) bl.addEventListener("click", () => { mode = "ladder"; quiz = null; paint(); });

  const rt = host.querySelector("#retake");
  if (rt) rt.addEventListener("click", () => startCheck(quiz.tier));
}

function readCard(id) {
  const tier = nextTier();
  if (!hasRead(id)) {
    const s = get();
    s.prestige.read.push(id);
    save();
    addChips(readBounty(tier));
    sfx.coin();
  }
  paint();
}

function startCheck(tierArg) {
  const tier = typeof tierArg === "number" ? tierArg : nextTier();
  quiz = { tier, qs: deal(tier, checkLength(tier)), at: 0, picked: [], score: 0, passedNow: false };
  mode = "check";
  chartSeq = 0;
  sfx.lever();
  paint();
}

function submitCheck() {
  const { tier, qs, picked } = quiz;
  const score = qs.reduce((a, q, i) => a + (picked[i] === q.answer ? 1 : 0), 0);
  const needed = Math.ceil(passMark(tier) * qs.length);
  const passedNow = score >= needed;

  const s = get();
  s.prestige.attempts[tier] = (s.prestige.attempts[tier] || 0) + 1;
  const firstPass = passedNow && !hasPassed(tier);
  if (firstPass) s.prestige.passed.push(tier);
  save();
  if (firstPass) addChips(checkBounty(tier));

  quiz.score = score;
  quiz.passedNow = passedNow;
  mode = "result";
  if (passedNow) sfx.unlock(); else sfx.lose();
  paint();
}

function buyRung() {
  const n = nextTier();
  const bank = get().chips;
  if (!hasPassed(n) || bank < thresholdFor(n)) return;

  addChips(-(bank * (1 - KEEP_ON_PRESTIGE)));
  const s = get();
  s.prestige.level = n;
  s.prestige.best = Math.max(s.prestige.best, n);
  if (n >= MAX_LEVEL && !s.prestige.maxedAt) s.prestige.maxedAt = new Date().toISOString();
  save();
  // addChips() above re-rendered the topbar, but it ran BEFORE the level was
  // raised, so the prestige readout would have stayed a rung behind until the
  // next navigation. Render again now that the new level is committed.
  render();
  refreshChipCount();
  openCard = null;
  sfx.win(2);
  paint();
}
