// The Chips collection — every Tier 1 concept, and which of them you have actually met.
// An uncollected chip shows its title and where it lives, but not its body: the card is
// written to land at the moment it explains, and reading it cold wastes it.
import { CHIPS, hasSeen } from "./lessons.js";
import { TABLES } from "./tables.js";
import { ACCENT } from "./shell.js";

// Mirrors the teach() calls in each table module.
export const BY_TABLE = {
  climb:  ["houseEdge", "sameEV", "volDrag", "ruin", "lossAversion", "dispositionEffect"],
  reels:  ["reelsIntro", "diversification", "correlation", "feeDrag", "timeInMarket"],
  sizing: ["bjBasics", "kelly", "missedEdge", "varianceVsEdge", "insurance"],
  wheel:  ["wheelEV", "theZero", "concentration"],
  line:   ["impliedProb", "theVig", "deVig", "gutRead", "circleOfCompetence", "clvChip",
           "outcomeBias", "favLongshot"],
  twohands: ["bacNoDecisions", "theCommission", "tieTrap", "beadPlate", "netOfFees", "theLongRun"],
  pit:    ["passIsACall", "dontIsAPut", "freeOdds", "dilution", "freeIsNotCheap"],
  chase:  ["chaseIntro", "quotedAndUnquoted", "lotteryBrain", "chaseVsBoring"],
  book:   ["youAreTheHouse", "theSpreadIsTheFee", "adverseSelection", "whoIsAcross"],
};

const chip = (key, table) => {
  const c = CHIPS[key];
  if (!c) return "";
  const got = hasSeen(key);
  return `
    <article class="chipcard ${got ? "got" : "locked"}">
      <span class="chipcard-state">${got ? "Collected" : "Not yet"}</span>
      <h2>${c.title}</h2>
      ${got
        ? `<div class="chipcard-body">${c.body}</div>`
        : `<p class="chipcard-hint">Appears at <b>${table.name}</b>, at the moment it explains.</p>`}
    </article>`;
};

export function view() {
  const keys = Object.keys(CHIPS);
  const seen = keys.filter(hasSeen).length;

  const groups = Object.entries(BY_TABLE).map(([id, list]) => {
    const t = TABLES.find((x) => x.id === id);
    if (!t) return "";
    const got = list.filter(hasSeen).length;
    return `
      <section class="chipgroup" style="--a:${ACCENT[id]}">
        <div class="section-head">
          <h2><i class="dot"></i>${t.name}</h2>
          <p>${got} of ${list.length} collected${t.status === "live" ? "" : " · table still building"}</p>
        </div>
        <div class="chipgrid">${list.map((k) => chip(k, t)).join("")}</div>
      </section>`;
  }).join("");

  return `
    <section class="hero hero--narrow">
      <p class="eyebrow">Tier 1 · ${seen} of ${keys.length} collected</p>
      <h1>Chips</h1>
      <p class="lede">Every concept this game teaches, and the table that teaches it. A chip you
      have not met yet keeps its contents — these are written to land right after the hand that
      makes them obvious, and reading one cold spends it for nothing.</p>
    </section>

    ${groups}`;
}

export function mount() {}
export function unmount() {}
