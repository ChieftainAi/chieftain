import { spawn } from "node:child_process";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9345;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  "--disable-gpu","--no-first-run","--hide-scrollbars","--window-size=1440,1000",
  "--user-data-dir=" + process.env.TEMP + "/cdp-mob"], { stdio: "ignore" });
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
const ev = async e => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;
await send("Page.enable"); await send("Runtime.enable");
await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Page.navigate", { url: process.argv[2] + "#/broker" }); await sleep(2400);
await ev(`document.getElementById("brk-rebal").click()`); await sleep(400);
const r = await ev(`({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  tiny: [...document.querySelectorAll("button,a[href]")].filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0 && (b.height < 32 || b.width < 32);
  }).map(el => el.className.toString().slice(0,26) + " " + Math.round(el.getBoundingClientRect().width) + "x" + Math.round(el.getBoundingClientRect().height))
})`);
console.log("overflow:", r.overflow, "px");
console.log("sub-32px targets:", r.tiny.length ? r.tiny : "none");
ws.close(); chrome.kill(); process.exit(0);
