// The keyframe translates by calc(-50% - 7px). Verify that lands the clone
// exactly where the original started, or the loop visibly jumps once a cycle.
import { spawn } from "node:child_process";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9338;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  "--disable-gpu","--no-first-run","--hide-scrollbars","--window-size=1440,1000",
  "--user-data-dir=" + process.env.TEMP + "/cdp-seam"], { stdio: "ignore" });
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
await send("Page.enable"); await send("Runtime.enable");
await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Page.navigate", { url: process.argv[2] + "#/" }); await sleep(2200);
const r = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
  const track = document.querySelector(".belt-track");
  const tiles = [...track.children];
  track.style.animation = "none";                       // freeze to measure
  const gap = parseFloat(getComputedStyle(track).gap);
  const total = track.scrollWidth;
  const first = tiles[0].getBoundingClientRect();
  const clone = tiles[9].getBoundingClientRect();
  const travelNeeded = clone.left - first.left;         // clone 0 back to origin
  const keyframe = total / 2 + gap / 2;                 // what calc(-50% - Ngap/2) gives
  return { tileW: Math.round(first.width), gap, total: Math.round(total),
           travelNeeded: +travelNeeded.toFixed(2), keyframe: +keyframe.toFixed(2),
           drift: +(keyframe - travelNeeded).toFixed(2) };
})()` });
console.log(JSON.stringify(r.result?.result?.value, null, 2));
ws.close(); chrome.kill(); process.exit(0);
