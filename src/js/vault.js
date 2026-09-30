// The Vault — the advanced reading room.
//
// Tier 2 of the content plan, and the one tier this game does not write. Thirty-eight pieces of
// someone else's original work, catalogued, oriented, matched to the rung they pair with, and
// linked out in full. No source prose is reproduced here; see the note at the top of
// vault-index.js for why that is not a detail.
//
// Nothing is locked. The Ladder gates capability because capability is the game; gating somebody
// out of a reading list would be theatre, and the material is a public web page anyway. What the
// rung does is sort the shelf — what pairs with where you are, and what is waiting further up.
import { SHELF, TRACKS, SOURCE, byTrack, totalWords, readingTime } from "./vault-index.js";
import { get, fmt } from "./state.js";
import { MAX_LEVEL, tierByN } from "./curriculum.js";

let host = null;
let filter = "all";      // all | matched | ahead | <track>

const lvl = () => get().prestige.level;
const matched = (e) => e.rung <= lvl();

function shelf() {
  if (filter === "matched") return SHELF.filter(matched);
  if (filter === "ahead") return SHELF.filter((e) => !matched(e));
  if (TRACKS[filter]) return byTrack(filter);
  return SHELF;
}

// ---------------------------------------------------------------- view

function entryHTML(e) {
  const open = matched(e);
  const t = tierByN(e.rung);
  return `
    <article class="vault-card ${open ? "" : "ahead"} ${e.stub ? "stub" : ""}">
      <div class="vault-top">
        <span class="vault-track vault-track--${e.track}">${TRACKS[e.track].label}</span>
        <span class="vault-rung ${open ? "open" : ""}">
          ${open ? "" : "from "}rung ${String(e.rung).padStart(2, "0")}
        </span>
      </div>
      <h2>${e.title}</h2>
      <p class="vault-note">${e.note}</p>
      ${e.sections.length ? `
        <p class="vault-toc">${e.sections.map((x) => `<span>${x}</span>`).join("")}</p>` : ""}
      <div class="vault-foot">
        <span class="vault-meta">${e.words.toLocaleString("en-US")} words &middot;
          ~${readingTime(e.words)} min &middot; pairs with <b>${t.name}</b></span>
        <a class="btn vault-go" href="${e.src}" target="_blank" rel="noopener noreferrer">
          Read at source &nearr;</a>
      </div>
    </article>`;
}

export function view() {
  return `<div id="vault-root"></div>`;
}

function render() {
  const list = shelf();
  const open = SHELF.filter(matched).length;

  return `
    <section class="hero hero--narrow">
      <p class="eyebrow">Tier 2 &middot; ${SHELF.length} texts &middot; ${totalWords.toLocaleString("en-US")} words</p>
      <h1>The Vault</h1>
      <p class="lede">The advanced shelf, and the one tier this game does not write. Graham,
      Damodaran, Soros, Marks, Taleb, GARCH, factor models, microstructure —
      <strong>all of it by ${SOURCE.name}</strong>, catalogued here, matched to the rung it pairs
      with, and linked out in full.</p>
      <div class="hero-stats">
        <span class="badge badge--accent">Matched to you <b>${open}/${SHELF.length}</b></span>
        <span class="badge">Your rung <b>${lvl()}/${MAX_LEVEL}</b></span>
        <span class="badge">Reading <b>~${Math.round(totalWords / 220 / 60)}h</b></span>
      </div>
    </section>

    <div class="vault-attrib">
      <div>
        <b>Every text here is written and published by ${SOURCE.name}.</b>
        <p>Chieftain indexes it, orients you in it, and links to it. It does not reproduce it —
        the words are theirs and they stay on their site. The notes below the titles are ours.</p>
      </div>
      <a class="btn" href="${SOURCE.home}" target="_blank" rel="noopener noreferrer">
        Visit ${SOURCE.name} &nearr;</a>
    </div>

    <div class="vault-filters" id="vault-filters">
      ${[["all", `All ${SHELF.length}`], ["matched", `Matched to your rung (${open})`],
         ["ahead", `Reads ahead (${SHELF.length - open})`]]
        .map(([k, label]) => `
          <button class="vault-filter ${filter === k ? "on" : ""}" data-filter="${k}">${label}</button>`).join("")}
      ${Object.entries(TRACKS).map(([k, t]) => `
        <button class="vault-filter ${filter === k ? "on" : ""}" data-filter="${k}">
          ${t.label} (${byTrack(k).length})</button>`).join("")}
    </div>

    ${filter !== "all" && TRACKS[filter]
      ? `<p class="vault-trackblurb">${TRACKS[filter].blurb}</p>` : ""}

    ${list.length
      ? `<div class="vault-grid">${list.map(entryHTML).join("")}</div>`
      : `<p class="rail-empty">Nothing on this shelf yet — climb a rung.</p>`}

    <p class="vault-tail">Sorted by the rung each text pairs with. Nothing is locked: the Ladder
    gates what you can <em>do</em>, not what you are allowed to read.</p>`;
}

export function mount() {
  host = document.getElementById("vault-root");
  paint();
}

export function unmount() { host = null; }

function paint() {
  if (!host) return;
  host.innerHTML = render();
  host.querySelector("#vault-filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    filter = b.dataset.filter;
    paint();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
