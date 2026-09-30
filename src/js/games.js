// #/games — the full floor directory.
//
// The front page shows the belt (art and a name, nothing else). This is where the numbers live:
// the casino form each table is built on, its real RTP and house edge, how much skill actually
// moves the result, and the market idea it exists to teach.
import { TABLES } from "./tables.js";
import { ACCENT } from "./shell.js";
import { tileArt } from "./art.js";
import { tableForRung } from "./session.js";
import { get } from "./state.js";
import { MAX_LEVEL } from "./curriculum.js";

const card = (t, recommended) => {
  const a = ACCENT[t.id] || "#9aa5b1";
  const live = t.status === "live";
  const inner = `
    <span class="tc-art">${tileArt(t.id, a)}</span>
    ${live ? `<span class="chip-pill">Open</span>` : `<span class="chip-pill soon">Building</span>`}
    <div class="tc-top">
      <div>
        <div class="tc-num">TABLE ${String(t.n).padStart(2, "0")}</div>
        <div class="tc-name">${t.name}</div>
        <div class="tc-form">${t.form}</div>
      </div>
    </div>
    <p class="tc-teaches"><b>${t.teaches}.</b> ${t.blurb}</p>
    <div class="odds">
      <div><span class="k">RTP</span><span class="v rtp">${t.rtp}</span></div>
      <div><span class="k">House edge</span><span class="v edge">${t.edge}</span></div>
      <div><span class="k">Skill</span><span class="v skill">${t.skill}</span></div>
    </div>
    ${live ? `<span class="tc-go">Take a seat <i>&rarr;</i></span>` : ""}`;

  const cls = "table-card" + (recommended ? " table-card--rec" : "");
  const flag = recommended ? `<span class="tc-rec">Teaches your current rung</span>` : "";
  return live
    ? `<button class="${cls}" style="--a:${a}" data-table="${t.id}">${flag}${inner}</button>`
    : `<div class="table-card locked" style="--a:${a}">${inner}</div>`;
};

export function view() {
  const live = TABLES.filter((t) => t.status === "live").length;
  const rec = tableForRung(Math.min(MAX_LEVEL, get().prestige.level + 1));
  return `
    <div class="page-head">
      <p class="eyebrow">The directory</p>
      <h1>Nine tables</h1>
      <p class="lede">Each one is a real casino game rebuilt so its maths teaches a market idea.
      The house edge is printed on every felt — it is never hidden, and it is never a rigged
      draw. What takes your money here is a fee, a spread, or inflation, the same three things
      that take it outside.</p>
    </div>
    <div class="section-head">
      <h2>All tables</h2>
      <p>${live} of ${TABLES.length} open</p>
    </div>
    <div class="tables">${TABLES.map((t) => card(t, rec && t.id === rec.id)).join("")}</div>`;
}

export function mount() {
  document.querySelectorAll("[data-table]").forEach((b) =>
    b.addEventListener("click", () => { location.hash = `/table/${b.dataset.table}`; }));
}
