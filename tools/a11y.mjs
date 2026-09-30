// Contrast audit over the routes. Two traps this deliberately handles:
//  1. backgroundColor is transparent on gradient elements, so an element whose
//     paint comes from backgroundImage must have the gradient's first stop read
//     instead — otherwise the probe invents ~1:1 ratios that do not exist.
//  2. It walks up to the first ANCESTOR that actually paints, rather than
//     assuming the element itself has a background.
import { spawn } from "node:child_process";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.argv[2], ROUTES = process.argv.slice(3), PORT = 9336;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  "--disable-gpu","--no-first-run","--hide-scrollbars","--window-size=1440,1000",
  "--user-data-dir=" + process.env.TEMP + "/cdp-a11y"], { stdio: "ignore" });
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

const PROBE = `(() => {
  const px = v => parseFloat(v) || 0;
  const parse = c => { const m = (c||"").match(/[\d.]+/g); return m && m.length >= 3 ? m.slice(0,4).map(Number) : null; };
  const firstStop = bi => { const m = (bi||"").match(/(rgba?\([^)]+\))/); return m ? parse(m[1]) : null; };
  const lin = c => { c/=255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const lum = ([r,g,b]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const over = (fg, bg) => { const a = fg[3] === undefined ? 1 : fg[3];
    return [0,1,2].map(i => fg[i]*a + bg[i]*(1-a)); };
  function paintOf(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const s = getComputedStyle(n);
      const bc = parse(s.backgroundColor);
      if (bc && (bc[3] === undefined || bc[3] > 0.92)) return bc.slice(0,3);
      const gs = firstStop(s.backgroundImage);          // trap 2: gradients
      if (gs) return gs.slice(0,3);
      n = n.parentElement;
    }
    return [24,24,24];
  }
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    if (el.childElementCount) continue;
    const t = (el.textContent || "").trim();
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || px(s.opacity) < 0.15) continue;
    const fg = parse(s.color); if (!fg) continue;
    const bg = paintOf(el);
    const c = over(fg, bg);
    const L1 = lum(c), L2 = lum(bg);
    const ratio = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size = px(s.fontSize), bold = px(s.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (ratio < need) out.push({ text: t.slice(0,44), cls: el.className.toString().slice(0,34),
      size: Math.round(size), ratio: +ratio.toFixed(2), need,
      fg: s.color, bg: "rgb(" + bg.join(",") + ")" });
  }
  return out;
})()`;

let total = 0;
for (const route of ROUTES) {
  await send("Page.navigate", { url: BASE + "#" + route }); await sleep(500);
  await send("Runtime.evaluate", { expression: `location.hash='${route}'` }); await sleep(1500);
  const r = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true });
  const rows = r.result?.result?.value || [];
  total += rows.length;
  console.log(`${route}  ->  ${rows.length} finding(s)`);
  for (const f of rows.slice(0, 8))
    console.log(`   ${f.ratio}:1 (need ${f.need})  ${f.size}px  "${f.text}"  .${f.cls}  fg ${f.fg} on ${f.bg}`);
}
console.log("TOTAL:", total);
ws.close(); chrome.kill(); process.exit(0);
