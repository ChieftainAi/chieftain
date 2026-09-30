// Belt guarantees: 9 tab stops not 18, clones inert, motion stops under
// prefers-reduced-motion, and no horizontal page overflow at phone width.
// Mobile width goes through Emulation.setDeviceMetricsOverride, NOT
// --window-size: headless Chrome on Windows clamps the window to 500px and
// silently renders at 500, which looks like catastrophic breakage and isn't.
import { spawn } from "node:child_process";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.argv[2], PORT = 9337;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  "--disable-gpu","--no-first-run","--hide-scrollbars","--window-size=1440,1000",
  "--user-data-dir=" + process.env.TEMP + "/cdp-belt"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let page;
for (let i = 0; i < 40 && !page; i++) {
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === "page"); } catch {}
  if (!page) await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (m, p = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p })); return new Promise(r => pending.set(i, r)); };
const evalp = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable");
await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });

const load = async () => { await send("Page.navigate", { url: BASE + "#/" }); await sleep(2200); };
const fail = [];
const check = (name, ok, detail) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fail.push(name); };

// ---- normal motion --------------------------------------------------------
await load();
const t = await evalp(`(() => {
  const tiles = [...document.querySelectorAll(".belt-tile")];
  const real = tiles.filter(el => !el.hasAttribute("aria-hidden"));
  const clones = tiles.filter(el => el.hasAttribute("aria-hidden"));
  const focusable = tiles.filter(el => el.tagName === "BUTTON" && !el.closest("[aria-hidden=true]") && !el.hasAttribute("aria-hidden"));
  const track = document.querySelector(".belt-track");
  const cs = getComputedStyle(track);
  const named = real.filter(el => (el.getAttribute("aria-label")||"").length > 0).length;
  return { tiles: tiles.length, real: real.length, clones: clones.length,
           focusable: focusable.length, named,
           anim: cs.animationName, dur: cs.animationDuration,
           cloneButtons: clones.filter(el => el.tagName === "BUTTON").length,
           overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
})()`);
check("18 tiles rendered (9 real + 9 clones)", t.tiles === 18 && t.real === 9 && t.clones === 9, JSON.stringify(t.tiles + "/" + t.real + "/" + t.clones));
check("clones are not buttons (no tab stops)", t.cloneButtons === 0, `cloneButtons=${t.cloneButtons}`);
check("every real tile has an accessible name", t.named === 9, `named=${t.named}`);
check("belt animates by default", t.anim === "belt-run", `${t.anim} ${t.dur}`);

// ---- reduced motion -------------------------------------------------------
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await load();
const rm = await evalp(`(() => { const cs = getComputedStyle(document.querySelector(".belt-track"));
  const v = getComputedStyle(document.querySelector(".belt-view"));
  return { anim: cs.animationName, overflowX: v.overflowX }; })()`);
check("belt stops under prefers-reduced-motion", rm.anim === "none", `animationName=${rm.anim}`);
check("belt becomes a scroll strip when stopped", rm.overflowX === "auto", `overflow-x=${rm.overflowX}`);
await send("Emulation.setEmulatedMedia", { features: [] });

// ---- phone width ----------------------------------------------------------
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await load();
const mob = await evalp(`(() => ({
  overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  tiny: [...document.querySelectorAll("button,a[href]")].filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32);
  }).map(el => ({ tag: el.tagName, cls: el.className.toString().slice(0,40),
                  txt: (el.textContent||"").trim().slice(0,30),
                  w: Math.round(el.getBoundingClientRect().width),
                  h: Math.round(el.getBoundingClientRect().height) }))
}))()`);
check("no horizontal page overflow at 390px", mob.overflowX <= 0, `overflow=${mob.overflowX}px`);
check("no sub-32px tap targets at 390px", mob.tiny.length === 0, JSON.stringify(mob.tiny));

console.log(fail.length ? "\nFAILING: " + fail.join(", ") : "\nAll belt guarantees hold.");
ws.close(); chrome.kill(); process.exit(fail.length ? 1 : 0);
