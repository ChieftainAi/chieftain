// The floor belt — a slow, continuous train of the nine tables across the front page.
//
// Deliberately wordless: the art carries the table and the only text is its name. The detail
// (form, RTP, house edge, what it teaches) lives on #/games, because the front page is meant to
// make you want to walk over to a table, not to read a spec sheet about one.
//
// Three things this must not break, all of them existing house rules:
//   1. It never conveys urgency. Nothing here counts down or implies a table is leaving.
//   2. It stops dead under prefers-reduced-motion, and becomes a normal scroll strip.
//   3. The duplicated half of the track is inert — aria-hidden and untabbable — so assistive
//      tech and the Tab key see nine tables, not eighteen.
import { TABLES } from "./tables.js";
import { ACCENT } from "./shell.js";
import { tileArt } from "./art.js";

const tile = (t, clone) => {
  const a = ACCENT[t.id] || "#9aa5b1";
  const inner =
    `<span class="belt-art">${tileArt(t.id, a)}</span>` +
    `<span class="belt-name">${t.name}</span>`;

  // The clone exists only to make the loop seamless. It gets no role, no name and no tab stop.
  if (clone) return `<span class="belt-tile" style="--a:${a}" aria-hidden="true">${inner}</span>`;

  return t.status === "live"
    ? `<button class="belt-tile" style="--a:${a}" data-table="${t.id}"
         aria-label="${t.name} — open this table">${inner}</button>`
    : `<span class="belt-tile is-locked" style="--a:${a}"
         aria-label="${t.name} — still being built">${inner}</span>`;
};

export function beltHTML() {
  const real  = TABLES.map((t) => tile(t, false)).join("");
  const clone = TABLES.map((t) => tile(t, true)).join("");
  return `
    <section class="belt" aria-labelledby="belt-h">
      <div class="belt-head">
        <h2 id="belt-h">The Floor</h2>
        <a class="belt-all" href="#/games" data-nav>All nine tables &rarr;</a>
      </div>
      <div class="belt-view">
        <div class="belt-track">${real}${clone}</div>
      </div>
    </section>`;
}

export function mountBelt(root, go) {
  root.querySelectorAll(".belt-tile[data-table]").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.table)));
}
