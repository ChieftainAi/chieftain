// The app shell: persistent table tabs across the top, section nav down the left side.
// Style-4 layout (sidebar + tabs + right rail) on the existing felt-and-brass palette.
import { TABLES } from "./tables.js";
import { CHIPS } from "./lessons.js";
import { hasSeen } from "./lessons.js";
import { get } from "./state.js";
import { MAX_LEVEL } from "./curriculum.js";
import { SHELF } from "./vault-index.js";

/** Each table gets its own accent so the floor reads as nine places, not one list. */
export const ACCENT = {
  // Muted into the neutral palette (2026-09-22). The tables still need to be
  // told apart at a glance, but a saturated hue on a #181818 ground reads as
  // arcade, not instrument. Every value below clears 4.5:1 on the ground.
  reels:    "#9a8fd4",   // slots — violet
  sizing:   "#80b28d",   // blackjack — sage
  wheel:    "#eb7485",   // roulette — rose
  twohands: "#818cf8",   // baccarat — indigo
  pit:      "#d39a6a",   // craps — tan
  chase:    "#c9a961",   // keno — brass
  climb:    "#6fb3ad",   // crash — teal
  book:     "#9aa5b1",   // live dealer — steel
  line:     "#7fb0cf",   // sports — slate blue
};

const tab = (t) => {
  const live = t.status === "live";
  const cls = live ? "tab" : "tab is-soon";
  const inner = `
    <i class="tab-dot" style="--a:${ACCENT[t.id] || "#8fa398"}"></i>
    <span>${t.name}</span>`;
  return live
    ? `<a class="${cls}" href="#/table/${t.id}" data-nav data-tab="${t.id}">${inner}</a>`
    : `<span class="${cls}" aria-disabled="true" data-tab="${t.id}">${inner}</span>`;
};

export function mountShell() {
  const tabs = document.getElementById("tabs");
  if (tabs) tabs.innerHTML = TABLES.map(tab).join("");

  const open = TABLES.filter((t) => t.status === "live").length;
  setText("side-open", `${open}/${TABLES.length}`);

  const keys = Object.keys(CHIPS);
  setText("side-chips-seen", `${keys.filter(hasSeen).length}/${keys.length}`);

  // Off-canvas sidebar on narrow screens.
  const side = document.getElementById("side");
  const toggle = document.getElementById("side-toggle");
  const scrim = document.getElementById("scrim");
  if (!side || !toggle || !scrim) return;

  const close = () => {
    side.classList.remove("is-open");
    scrim.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };
  toggle.addEventListener("click", () => {
    const nowOpen = !side.classList.contains("is-open");
    side.classList.toggle("is-open", nowOpen);
    scrim.hidden = !nowOpen;
    toggle.setAttribute("aria-expanded", String(nowOpen));
  });
  scrim.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  // The tap that picked a table must not leave the drawer up. hashchange alone misses the
  // case where you pick the route you are already on, so close on the click itself too.
  document.addEventListener("click", (e) => {
    if (e.target.closest("a[data-nav], .tab")) close();
  });
  window.addEventListener("hashchange", close);

  // Widening past the breakpoint turns the drawer back into a static sidebar; the scrim
  // would otherwise be left covering the page with nothing to dismiss it.
  const wide = window.matchMedia("(min-width: 981px)");
  wide.addEventListener("change", (e) => { if (e.matches) close(); });
}

/** Highlight whichever tab and section the current route belongs to. */
export function syncShell(route, tableId) {
  document.querySelectorAll("[data-tab]").forEach((el) =>
    el.classList.toggle("on", el.dataset.tab === tableId)
  );
  const section = route === "/rules" ? "rules" : route === "/chips" ? "chips"
    : route === "/ladder" ? "ladder" : route === "/vault" ? "vault"
    : route === "/games" ? "games" : route === "/broker" ? "broker" : "floor";
  document.querySelectorAll("[data-side]").forEach((el) =>
    el.classList.toggle("on", el.dataset.side === section && !tableId)
  );

  // On narrow screens the strip scrolls; the table you are at should be the one you can see.
  const active = document.querySelector(".tab.on");
  if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/** Chips-seen count changes as you play, so the sidebar badge needs a refresh hook. */
export function refreshChipCount() {
  const keys = Object.keys(CHIPS);
  setText("side-chips-seen", `${keys.filter(hasSeen).length}/${keys.length}`);
  setText("side-prestige", `${get().prestige.level}/${MAX_LEVEL}`);
  const open = SHELF.filter((e) => e.rung <= get().prestige.level).length;
  setText("side-vault", `${open}/${SHELF.length}`);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
