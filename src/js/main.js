import * as state from "./state.js";
import * as hub from "./hub.js";
import * as rules from "./rules.js";
import * as chips from "./chips.js";
import * as vault from "./vault.js";
import * as games from "./games.js";
import * as broker from "./broker.js";
import * as prestige from "./prestige.js";
import * as climb from "./climb.js";
import * as reels from "./reels.js";
import * as sizing from "./sizing.js";
import * as wheel from "./wheel.js";
import * as line from "./line.js";
import * as twohands from "./twohands.js";
import * as pit from "./pit.js";
import * as chase from "./chase.js";
import * as book from "./book.js";
import { byId } from "./tables.js";
import { mountShell, syncShell, refreshChipCount } from "./shell.js";
import { stripHTML, mountStrip } from "./strip.js";
import { showChip } from "./lessons.js";

const MODES = { climb, reels, sizing, wheel, line, twohands, pit, chase, book };
const PAGES = { "/": hub, "/games": games, "/broker": broker, "/rules": rules,
                "/chips": chips, "/ladder": prestige, "/vault": vault };

let current = null;
const root = document.getElementById("view");
const railEl = document.getElementById("rail");
const stage = document.getElementById("stage");

function route() {
  if (current && current.unmount) current.unmount();

  const hash = location.hash.replace(/^#/, "") || "/";
  const m = hash.match(/^\/table\/([a-z]+)$/);
  const table = m ? byId(m[1]) : null;

  if (table && MODES[table.id]) {
    current = MODES[table.id];
  } else if (PAGES[hash]) {
    current = PAGES[hash];
  } else {
    current = hub;
    location.replace("#/");            // unknown route or unbuilt table — back to the floor
  }

  // A table gets a progress strip above the felt. The right rail is suppressed on table
  // routes, so without this the player has no sight of the Ladder while actually playing —
  // which is exactly when knowing what the hand meant is most useful.
  const tableId = table && MODES[table.id] ? table.id : null;
  root.innerHTML = (tableId ? stripHTML(tableId) : "") + current.view();
  current.mount();
  if (tableId) mountStrip(root, showChip);

  // A table view brings its own side panels, so the shell rail would be a third column.
  // Only the shell pages fill it.
  if (current.rail) {
    railEl.innerHTML = current.rail();
    railEl.hidden = false;
    stage.classList.add("has-rail");
  } else {
    railEl.innerHTML = "";
    railEl.hidden = true;
    stage.classList.remove("has-rail");
  }

  syncShell(hash, table && MODES[table.id] ? table.id : null);
  refreshChipCount();                  // chips collected at a table update the sidebar badge
  window.scrollTo(0, 0);
}

// Let plain links drive the hash router.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-nav]");
  if (!a) return;
  e.preventDefault();
  const href = a.getAttribute("href").replace(/^#/, "") || "/";
  if (location.hash.replace(/^#/, "") === href) route();   // same route — re-render in place
  else location.hash = href;
});

window.addEventListener("hashchange", route);

mountShell();
state.render();
route();
