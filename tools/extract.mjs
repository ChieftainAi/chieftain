// Load a URL in headless Chrome over CDP and measure its real design tokens.
// Node 24 has a global WebSocket, so no dependencies.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_ = process.argv[2];
const OUT  = process.argv[3] || "tokens.json";
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`,
  "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--window-size=1440,2400", "--hide-scrollbars",
  "--user-data-dir=" + process.env.TEMP + "/cdp-extract",
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const j = await r.json();
      const p = j.find(t => t.type === "page");
      if (p) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome did not expose a page target");
}

const page = await targets();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
function send(method, params = {}) {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise(r => pending.set(i, r));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: URL_ });
await sleep(7000);   // let webfonts and any client-side render settle

const PROBE = `(() => {
  const out = {};
  const cs = (el) => getComputedStyle(el);

  // ---- author-declared custom properties on :root -------------------------
  const vars = {};
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules || []) {
      if (!rule.style) continue;
      const sel = rule.selectorText || "";
      const selL = sel.toLowerCase();
      if (!(selL.includes(":root") || selL === "html" || selL.includes(".dark") || selL.includes("data-theme"))) continue;
      for (const prop of rule.style) {
        if (prop.startsWith("--")) vars[sel + " | " + prop] = rule.style.getPropertyValue(prop).trim();
      }
    }
  }
  out.cssVars = vars;

  // ---- font stacks actually rendered, by frequency ------------------------
  const fontFreq = {}, sizeFreq = {}, weightFreq = {}, radiusFreq = {},
        bgFreq = {}, fgFreq = {}, shadowFreq = {}, trackFreq = {}, lhFreq = {};
  const bump = (o, k) => { if (k && k !== "none" && k !== "normal") o[k] = (o[k] || 0) + 1; };

  const els = document.querySelectorAll("*");
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;          // ignore invisible nodes
    const s = cs(el);
    bump(fontFreq, s.fontFamily);
    bump(weightFreq, s.fontWeight);
    bump(radiusFreq, s.borderRadius);
    bump(shadowFreq, s.boxShadow);
    bump(trackFreq, s.letterSpacing);
    if (el.childElementCount === 0 && el.textContent.trim()) {
      bump(sizeFreq, s.fontSize);
      bump(fgFreq, s.color);
      bump(lhFreq, s.lineHeight);
    }
    const bg = s.backgroundColor;
    if (bg && bg !== "rgba(0, 0, 0, 0)") bump(bgFreq, bg + "  @" + Math.round(r.width) + "x" + Math.round(r.height));
    const bi = s.backgroundImage;
    if (bi && bi !== "none" && bi.includes("gradient")) bump(bgFreq, "GRADIENT " + bi.slice(0, 160));
  }
  const top = (o, n = 14) => Object.entries(o).sort((a,b) => b[1]-a[1]).slice(0, n);
  out.fonts    = top(fontFreq, 8);
  out.sizes    = top(sizeFreq, 16);
  out.weights  = top(weightFreq, 8);
  out.radii    = top(radiusFreq, 12);
  out.shadows  = top(shadowFreq, 10);
  out.tracking = top(trackFreq, 8);
  out.lineHeights = top(lhFreq, 10);
  out.colorsFg = top(fgFreq, 14);
  out.backgrounds = top(bgFreq, 30);

  // ---- page-level anchors -------------------------------------------------
  const b = cs(document.body), h = cs(document.documentElement);
  out.body = { bg: b.backgroundColor, bgImage: b.backgroundImage.slice(0,200), color: b.color,
               font: b.fontFamily, size: b.fontSize, lh: b.lineHeight };
  out.html = { bg: h.backgroundColor, scheme: h.colorScheme };

  // ---- headings + buttons -------------------------------------------------
  const grab = (sel) => [...document.querySelectorAll(sel)].slice(0,4).map(el => {
    const s = cs(el), r = el.getBoundingClientRect();
    return { text: el.textContent.trim().slice(0,48), font: s.fontFamily, size: s.fontSize,
             weight: s.fontWeight, track: s.letterSpacing, lh: s.lineHeight, color: s.color,
             bg: s.backgroundColor, bgImage: s.backgroundImage.slice(0,140),
             radius: s.borderRadius, pad: s.padding, border: s.border,
             shadow: s.boxShadow.slice(0,140), w: Math.round(r.width), h: Math.round(r.height) };
  });
  out.h1 = grab("h1"); out.h2 = grab("h2"); out.h3 = grab("h3");
  out.buttons = grab("button, a[class*=btn], a[class*=button], [role=button]");
  out.cards = grab("[class*=card], article, section > div[class*=rounded]");
  out.navs  = grab("nav, header");

  // ---- webfont files in use ----------------------------------------------
  out.fontFiles = performance.getEntriesByType("resource")
    .map(e => e.name).filter(n => { const b = n.split("?")[0].toLowerCase();
      return b.endsWith(".woff2") || b.endsWith(".woff") || b.endsWith(".ttf") || b.endsWith(".otf"); }).slice(0, 20);
  out.title = document.title;
  out.pageHeight = document.documentElement.scrollHeight;
  return out;
})()`;

const res = await send("Runtime.evaluate", {
  expression: PROBE, returnByValue: true, awaitPromise: false,
});
if (res.result?.exceptionDetails) console.error("ERR:", JSON.stringify(res.result.exceptionDetails).slice(0,600));
const value = res.result?.result?.value;
writeFileSync(OUT, JSON.stringify(value, null, 2));

const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
if (shot.result?.data) writeFileSync(OUT.replace(/\.json$/, ".png"), Buffer.from(shot.result.data, "base64"));

console.log("wrote", OUT, "and png; page:", value?.title, "height", value?.pageHeight);
ws.close(); chrome.kill();
process.exit(0);
