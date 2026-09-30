// The table progress strip.
//
// Until now the learning spine and the game were joined in one direction only: rungs granted
// capability, and nothing at a table ever reported back. Seven of the nine tables referenced
// the Ladder nowhere at all, and the single next-action prompt in the app lived in the right
// rail — which `main.js` suppresses on every table route, so it was invisible precisely while
// the player was playing.
//
// This strip is the return path. It sits above the felt on every table and says three things:
// where you are on the Ladder, what the hand you just played demonstrated, and what the single
// next step is. All three are facts the game already knew and simply never told anyone.
//
// It reports and it never pressures. No countdown, no streak, no expiring anything — house
// rule 2 has already cost this project a timer widget and a fake activity feed, and a strip
// that nagged would be the same mistake wearing a different hat.
import { get, sessionMinutes } from "./state.js";
import { CHIPS, rungOfChip, chipsForRung, seenForRung } from "./lessons.js";
import { MAX_LEVEL, tierByN, thresholdFor, checkBounty, checkLength } from "./curriculum.js";
import { STUDY } from "./study.js";
import { byId } from "./tables.js";

/**
 * The single most useful next action, in the order the Ladder actually requires them.
 * Returns null at max prestige, where there is nothing left to point at.
 */
export function nextStep() {
  const s = get();
  const p = s.prestige;
  if (p.level >= MAX_LEVEL) return null;

  const n = p.level + 1;
  const cards = STUDY[n] || [];
  const read = cards.filter((c) => p.read.includes(c.id)).length;
  const passed = p.passed.includes(n);
  const need = thresholdFor(n);

  if (read < cards.length) {
    return { kind: "read", rung: n, label: `Read ${cards.length - read} more card${cards.length - read === 1 ? "" : "s"}`,
             detail: `Rung ${String(n).padStart(2, "0")} · ${tierByN(n).name}`, href: "#/ladder" };
  }
  if (!passed) {
    return { kind: "check", rung: n, label: `Take the rung ${String(n).padStart(2, "0")} check`,
             detail: `${checkLength(n)} questions · pays ${checkBounty(n).toLocaleString("en-US")}`, href: "#/ladder" };
  }
  if (s.chips < need) {
    const short = need - s.chips;
    return { kind: "earn", rung: n, label: `Earn ${Math.ceil(short).toLocaleString("en-US")} more`,
             detail: `to buy rung ${String(n).padStart(2, "0")} · use the edge you unlocked`, href: null };
  }
  return { kind: "buy", rung: n, label: `Buy rung ${String(n).padStart(2, "0")}`,
           detail: `${tierByN(n).name} · you have enough`, href: "#/ladder" };
}

/** The most recent concept met this sitting, if any, with the rung that checks it. */
function latestBeat() {
  const c = get().session.concepts;
  if (!c.length) return null;
  const key = c[c.length - 1];
  const chip = CHIPS[key];
  if (!chip) return null;
  return { key, title: chip.title, rung: rungOfChip(key) };
}

/** How much of the current rung's concept set this table can still teach. */
function rungConcepts() {
  const lvl = get().prestige.level;
  const n = Math.min(MAX_LEVEL, lvl + 1);
  const all = chipsForRung(n);
  return { rung: n, met: seenForRung(n).length, total: all.length };
}

export function stripHTML(tableId) {
  const s = get();
  const step = nextStep();
  const beat = latestBeat();
  const rc = rungConcepts();
  const table = byId(tableId);
  const mins = sessionMinutes();

  const progress = rc.total ? Math.round((rc.met / rc.total) * 100) : 0;

  return `
    <div class="strip" role="complementary" aria-label="Your progress">
      <div class="strip-rung">
        <span class="strip-k">Rung</span>
        <b class="strip-lvl">${s.prestige.level}<span>/${MAX_LEVEL}</span></b>
      </div>

      <div class="strip-mid">
        ${beat
          ? `<button class="strip-beat" data-beat="${beat.key}">
               <span class="strip-k">You just met</span>
               <span class="strip-beat-title">${beat.title}</span>
               ${beat.rung ? `<span class="strip-tag">checked at rung ${String(beat.rung).padStart(2, "0")}</span>` : ""}
             </button>`
          : `<div class="strip-beat strip-beat--idle">
               <span class="strip-k">${table ? table.name : "This table"}</span>
               <span class="strip-beat-title">Play a round and the concept it demonstrates shows up here.</span>
             </div>`}
        ${rc.total ? `
          <div class="strip-bar" role="img"
               aria-label="${rc.met} of ${rc.total} rung ${rc.rung} concepts met">
            <i style="width:${progress}%"></i>
          </div>
          <span class="strip-k strip-count">${rc.met}/${rc.total} concepts for rung ${String(rc.rung).padStart(2, "0")}</span>`
        : ""}
      </div>

      ${step ? `
        <div class="strip-next">
          <span class="strip-k">Next</span>
          ${step.href
            ? `<a class="btn strip-cta" href="${step.href}" data-nav>${step.label}</a>`
            : `<span class="strip-cta strip-cta--flat">${step.label}</span>`}
          <span class="strip-detail">${step.detail}</span>
        </div>`
      : `<div class="strip-next"><span class="strip-k">Ladder</span>
           <span class="strip-cta strip-cta--flat">Complete</span></div>`}

      ${s.session.rounds
        ? `<span class="strip-session">${s.session.rounds} round${s.session.rounds === 1 ? "" : "s"}${
             mins ? ` · ${mins} min` : ""} this sitting</span>`
        : ""}
    </div>`;
}

/** Wire the strip's one interactive element: expanding the beat into the full chip. */
export function mountStrip(host, openChip) {
  const b = host.querySelector("[data-beat]");
  if (b) b.addEventListener("click", () => openChip(b.dataset.beat));
}
