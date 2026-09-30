// Screenshot local routes of CHIEFTAIN over CDP. Rebuild-friendly: no deps, Node 24.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.argv[2] || "http://localhost:8777/index.html";
const ROUTES = process.argv.slice(3);
const PORT = 9334;
const W = Number(process.env.SHOT_W || 1440), H = Number(process.env.SHOT_H || 1000);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  "--disable-gpu","--no-first-run","--no-default-browser-check","--hide-scrollbars",
  `--window-size=${W},${H}`, "--user-data-dir=" + process.env.TEMP + "/cdp-shot"], { stdio: "ignore" });
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
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise(r => pending.set(i, r)); };
await send("Page.enable"); await send("Runtime.enable");
await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });
const logs = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    logs.push("console: " + m.params.args.map(a => a.description || a.value).join(" "));
  if (m.method === "Runtime.exceptionThrown")
    logs.push("EXCEPTION: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
});
for (const route of ROUTES) {
  await send("Page.navigate", { url: BASE + "#" + route });
  await sleep(600);
  await send("Runtime.evaluate", { expression: `location.hash='${route}';` });
  await sleep(1400);
  const err = await send("Runtime.evaluate", { expression: `(()=>{const v=document.getElementById('view');return {len:v?v.innerHTML.length:-1,h:document.documentElement.scrollHeight};})()`, returnByValue: true });
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const name = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
  if (logs.length) { for (const l of logs) console.log("  !! " + l); logs.length = 0; }
  writeFileSync(`shot_${name}.png`, Buffer.from(shot.result.data, "base64"));
  console.log(name, JSON.stringify(err.result?.result?.value));
}
ws.close(); chrome.kill(); process.exit(0);
