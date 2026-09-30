// The session arc.
//
// A sitting has a shape: you arrive with one thing to do, you do it, and you leave knowing what
// you got. Before this the floor showed a new player three empty states and nine identical
// cards, and nothing ever told them what happened afterwards.
//
// Two rules govern everything here, and both come from house rule 2.
//
//   1. The objective is a SUGGESTION, never a requirement. Nothing expires, nothing is lost by
//      ignoring it, and there is no penalty for doing something else entirely.
//   2. Time is reported, never counted toward. "You played 12 rounds in 9 minutes" is a fact
//      about what happened. "4 minutes left" would be pressure, and this project has already
//      thrown away a countdown widget and a fake live feed for exactly that reason.
import { get, save, sessionMinutes } from "./state.js";
import { CHIPS, chipsForRung, hasSeen } from "./lessons.js";
import { MAX_LEVEL, tierByN, checkBounty, checkLength, thresholdFor } from "./curriculum.js";
import { STUDY } from "./study.js";
import { TABLES, byId } from "./tables.js";
import { BY_TABLE } from "./chips.js";
import { nextStep } from "./strip.js";

/**
 * Which table best teaches the rung the player is working on. Derived from the chip→rung
 * mapping: whichever live table owns the most concepts that rung checks. Falls back to the
 * floor's first open table for rungs 3 and 4, which are chart literacy and have no table.
 */
export function tableForRung(n) {
  const wanted = new Set(chipsForRung(n));
  if (!wanted.size) return null;

  let best = null, bestScore = -Infinity;
  for (const t of TABLES) {
    if (t.status !== "live") continue;
    const owned = (BY_TABLE[t.id] || []).filter((k) => wanted.has(k));
    if (!owned.length) continue;
    const unmet = owned.filter((k) => !hasSeen(k)).length;
    // Prefer a table that still has something unmet to show, then one that covers more of the
    // rung — but break near-ties toward the earlier table. Without that last term a player on
    // rung 1 gets pointed at table 9, which happens to own two rung-1 concepts and is also the
    // hardest thing in the building. The build order is a difficulty order; respect it.
    const score = unmet * 10 + owned.length * 2 - t.n * 2;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

/**
 * The one thing worth doing right now, phrased as an invitation. Mirrors `nextStep()` from the
 * strip so the floor and the tables never disagree about what comes next.
 */
export function objective() {
  const s = get();
  const step = nextStep();
  if (!step) {
    return { kind: "done", title: "You have finished the Ladder",
             body: "Every concept in the game is read and checked. Play whatever you like.",
             cta: null, href: null };
  }

  const n = step.rung;
  const tier = tierByN(n);
  const table = tableForRung(n);
  const cards = STUDY[n] || [];
  const read = cards.filter((c) => s.prestige.read.includes(c.id)).length;

  if (step.kind === "read") {
    return {
      kind: "read", rung: n,
      title: `Read ${tier.name.toLowerCase()}`,
      body: `${cards.length - read} card${cards.length - read === 1 ? "" : "s"} left on rung ` +
            `${String(n).padStart(2, "0")}. Reading them pays as you go, and the check after is ` +
            `worth ${checkBounty(n).toLocaleString("en-US")}.`,
      cta: "Open the Ladder", href: "#/ladder",
    };
  }
  if (step.kind === "check") {
    return {
      kind: "check", rung: n,
      title: `Sit the rung ${String(n).padStart(2, "0")} check`,
      body: `${checkLength(n)} questions on ${tier.name.toLowerCase()}. Passing pays ` +
            `${checkBounty(n).toLocaleString("en-US")} and unlocks the next thing this game can do.`,
      cta: "Take the check", href: "#/ladder",
    };
  }
  if (step.kind === "earn") {
    const short = Math.ceil(thresholdFor(n) - s.chips);
    return {
      kind: "earn", rung: n, table,
      title: table ? `Play ${table.name}` : "Use the edge you unlocked",
      body: `${short.toLocaleString("en-US")} short of rung ${String(n).padStart(2, "0")}. ` +
            `The casino is negative-expectation by design, so the way across is the edge you ` +
            `have already earned — not more spins.`,
      cta: table ? `Go to ${table.name}` : null,
      href: table ? `#/table/${table.id}` : null,
    };
  }
  return {
    kind: "buy", rung: n,
    title: `Buy rung ${String(n).padStart(2, "0")}`,
    body: `You have the bank for ${tier.name.toLowerCase()}. Buying it costs two thirds of ` +
          `what you are holding, and starts the next climb from a third of the height.`,
    cta: "Open the Ladder", href: "#/ladder",
  };
}

export function objectiveHTML() {
  const o = objective();
  return `
    <section class="objective objective--${o.kind}">
      <div class="objective-body">
        <span class="objective-k">${o.kind === "done" ? "Complete" : "Suggested next"}</span>
        <h2>${o.title}</h2>
        <p>${o.body}</p>
      </div>
      ${o.cta && o.href
        ? `<a class="btn btn-primary objective-cta" href="${o.href}" data-nav>${o.cta}</a>`
        : ""}
    </section>`;
}

/**
 * The end-of-sitting summary. Shown on the floor when the player comes back from playing, and
 * only once per sitting — it reports, then gets out of the way.
 */
export function shouldSummarise() {
  const s = get().session;
  return s.rounds > 0 && !s.summarised;
}

export function summaryHTML() {
  const s = get();
  const ses = s.session;
  const mins = sessionMinutes();
  const met = ses.concepts.map((k) => CHIPS[k]).filter(Boolean);
  const tables = ses.tables.map((id) => byId(id)).filter(Boolean);
  const step = nextStep();

  return `
    <section class="summary">
      <div class="summary-head">
        <span class="objective-k">This sitting</span>
        <h2>${ses.rounds} round${ses.rounds === 1 ? "" : "s"}${mins ? ` over ${mins} minute${mins === 1 ? "" : "s"}` : ""}</h2>
      </div>

      <div class="summary-grid">
        <div class="cd-block cd-block--accent">
          <span class="cd-num">${ses.rounds}</span><span class="cd-label">Rounds</span>
        </div>
        <div class="cd-block">
          <span class="cd-num">${met.length}</span><span class="cd-label">Concepts</span>
        </div>
        <div class="cd-block">
          <span class="cd-num">${tables.length}</span><span class="cd-label">Tables</span>
        </div>
        <div class="cd-block">
          <span class="cd-num">${s.prestige.level}</span><span class="cd-label">Rung</span>
        </div>
      </div>

      ${met.length ? `
        <p class="objective-k" style="margin-top:14px">What you met</p>
        <ul class="summary-list">
          ${met.slice(-4).map((c) => `<li>${c.title}</li>`).join("")}
        </ul>` : ""}

      ${step ? `
        <p class="summary-next">Next: <b>${step.label}</b> — ${step.detail}
          ${step.href ? `<a href="${step.href}" data-nav>open</a>` : ""}</p>` : ""}

      <button class="btn summary-dismiss" id="summary-dismiss">Got it</button>
    </section>`;
}

/** Mark the summary as shown so it does not follow the player around. */
export function dismissSummary() {
  get().session.summarised = true;
  save();
}
