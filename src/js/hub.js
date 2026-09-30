// The Floor — the front page.
//
// Stripped to three things on 2026-09-22 at the user's direction: the belt, and below it a
// place to go and read. The hero headline, the suggested-next card, the rung bonus row and the
// right rail all moved off this page. The bank and prestige readouts live in the topbar now, so
// the front page does not restate them.
//
// The reasoning worth keeping: a front page that opens with a wall of copy makes you read before
// you can look. The belt shows nine places you could go in one glance, and the reader below it
// is there for the moment you want the why instead of the what.
import { TABLES } from "./tables.js";
import { beltHTML } from "./belt.js";
import { CHIPS, hasSeen } from "./lessons.js";
import { get } from "./state.js";
import { MAX_LEVEL } from "./curriculum.js";
import { SHELF, totalWords } from "./vault-index.js";
import { ALL_CONCEPTS } from "./study.js";

const door = (href, kicker, name, count, body) => `
  <a class="door" href="${href}" data-nav>
    <span class="door-kicker">${kicker}</span>
    <span class="door-name">${name}</span>
    <span class="door-count">${count}</span>
    <span class="door-body">${body}</span>
    <span class="door-go" aria-hidden="true">&rarr;</span>
  </a>`;

export function view() {
  const s = get();
  const seen = Object.keys(CHIPS).filter(hasSeen).length;
  const totalChips = Object.keys(CHIPS).length;
  const live = TABLES.filter((t) => t.status === "live").length;

  return `
    ${beltHTML()}

    <section class="learn-more" aria-labelledby="lm-h">
      <div class="lm-head">
        <h2 id="lm-h">Learn more</h2>
        <p>Every table above is a real casino game with its real payout maths. The house edge is
        never hidden and never a rigged draw — at each one it is a fee, a spread, or inflation,
        printed where you can watch it take your money. These are the four ways in.</p>
      </div>
      <div class="doors">
        ${door("#/ladder", "Start here", "The Ladder",
               `${s.prestige.level}/${MAX_LEVEL} rungs`,
               `Ten rungs of ${ALL_CONCEPTS.length} cards. Pass a rung's check and it pays you, then
                hands you a capability the tables do not give away.`)}
        ${door("#/chips", "While you play", "Chips",
               `${seen}/${totalChips} concepts`,
               `Short ideas that surface mid-hand, at the moment the table is demonstrating the
                thing they describe.`)}
        ${door("#/rules", "The maths", "House Rules",
               `${live} tables`,
               `Where each table's edge comes from, what it costs you per round, and what the
                boring low-fee version of the same bet would have returned.`)}
        ${door("#/vault", "Go deeper", "The Vault",
               `${SHELF.length} pieces`,
               `${Math.round(totalWords / 1000)}k words of advanced reading — Graham, Damodaran,
                factor models — indexed and linked at source.`)}
      </div>
    </section>`;
}

export function mount() {
  document.querySelectorAll("[data-table]").forEach((b) =>
    b.addEventListener("click", () => { location.hash = "#/table/" + b.dataset.table; })
  );
}
