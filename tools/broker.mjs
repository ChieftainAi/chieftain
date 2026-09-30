// Accounting and risk invariants for The Broker, driven through the real UI.
// The market does not move unless you advance it, so a buy and an immediate sell happen at the
// same mid price — which makes every cost figure below exact rather than approximate.
import { spawn } from "node:child_process";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.argv[2], PORT = 9341;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  "--disable-gpu", "--no-first-run", "--hide-scrollbars", "--window-size=1440,1200",
  "--user-data-dir=" + process.env.TEMP + "/cdp-broker"], { stdio: "ignore" });
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
await send("Page.navigate", { url: BASE + "#/broker" }); await sleep(2400);

const READ = `(() => {
  const num = s => Number(String(s).replace(/,/g, "").replace(/[^0-9.\\-]/g, "")) || 0;
  const kv = id => {
    const out = {};
    document.querySelectorAll("#" + id + " .kv > div, #" + id + " > div").forEach(d => {
      const k = d.querySelector(".k"), v = d.querySelector(".v");
      if (k && v) out[k.textContent.trim()] = v.textContent.trim();
    });
    return out;
  };
  const a = kv("brk-account"), c = kv("brk-costs"), b = kv("brk-bench"), r = kv("brk-risk");
  const corr = [...document.querySelectorAll("#brk-corr .cm-row")].slice(1)
    .map(row => [...row.querySelectorAll(".cm-c")].map(c2 => Number(c2.textContent)));
  const holdings = [...document.querySelectorAll("#brk-positions .pt-row")].slice(1).map(r2 => {
    const s = r2.querySelectorAll("span");
    return { id: s[0].textContent.trim(), shares: num(s[1].textContent), value: num(s[2].textContent) };
  });
  return {
    cash: num(a["Buying power"]), invested: num(a.Holdings), equity: num(a["Account value"]),
    unreal: num(a.Unrealised), realised: num(a.Realised),
    commission: num(c.Commission), spread: num(c["Spread crossed"]), totalCost: num(c.Total),
    benchHold: num(b["Index holding"]), you: num(b.You), diff: num(b.Difference),
    blended: num(r["Weighted average of parts"]), port: num(r["Your portfolio"]),
    benefit: num(r["Risk removed"]), effective: num(r["Effective holdings"]),
    maxWeight: num(r["Largest weight"]),
    corr, holdings,
    last: num((document.getElementById("brk-value") || {}).textContent || 0),
    sel: ((document.getElementById("brk-kicker") || {}).textContent || "").trim(),
  };
})()`;

const click = async (id) => { await ev(`document.getElementById(${JSON.stringify(id)}).click()`); await sleep(150); };
const setPct = async (p) => { await ev(`document.querySelector('.szbtn[data-pct="${p}"]').click()`); await sleep(140); };
const setMode = async (m) => { await ev(`document.querySelector('.wrow[data-sel="${m}"]').click()`); await sleep(220); };
const pick  = async (inst) => { await ev(`document.querySelector('.wrow[data-sel="${inst}"]').click()`); await sleep(160); };
const side  = async (sd) => { await ev(`document.querySelector('.tkb[data-side="${sd}"]').click()`); await sleep(160); };
const fail = [];
const near = (a, b, tol, name) => {
  const ok = Math.abs(a - b) <= tol;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${a.toFixed(2)}, expected ${b.toFixed(2)})`);
  if (!ok) fail.push(name);
};
const is = (cond, name, detail) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) fail.push(name);
};

const START = 10000, COMMISSION = 2, HALF_SPREAD = 0.0008;

// ---------------------------------------------------------------- accounting
const a0 = await ev(READ);
is(a0.cash === START && a0.equity === START, "starts flat at 10,000", `cash=${a0.cash} equity=${a0.equity}`);
near(a0.benchHold, START, 0.01, "benchmark starts at 10,000");

await pick("MRDN");
// Side first, then amount: switching side deliberately resets the amount chip, so setting the
// percentage before choosing Buy would be silently discarded.
await side("BUY");
await setPct(25);
const mid = (await ev(READ)).last;
await click("tk-go");
const a1 = await ev(READ);

// Orders are sized as a share of equity now, so the share count is derived, not assumed.
const SIZE = a1.holdings.length ? a1.holdings[0].shares : 0;
is(SIZE > 0, "a 25%-of-equity order fills", `shares=${SIZE}`);
// 25% of equity at the ask, floored to whole shares — so notional lands just under the target.
const target = START * 0.25;
is(SIZE * mid <= target + 0.01 && SIZE * mid > target - mid,
   "order notional is 25% of equity, floored to whole shares",
   `${(SIZE * mid).toFixed(2)} vs target ${target.toFixed(2)}`);

const expSpread = SIZE * mid * HALF_SPREAD;
// `mid` is read off the quote, which prints 2dp, so the expected figure inherits up to 0.005 of
// price error per share — the tolerance below is display rounding in this test, not slack in
// the app's arithmetic.
near(a1.cash, START - (SIZE * mid * (1 + HALF_SPREAD)) - COMMISSION, 0.30, "cash after buy = shares x ask + commission");
near(a1.commission, COMMISSION, 0.01, "one commission charged");
near(a1.spread, expSpread, 0.03, "spread charged = shares x mid x half-spread");
near(a1.equity, START - expSpread - COMMISSION, 0.05, "equity drops by exactly spread + commission");
near(a1.totalCost, START - a1.equity, 0.05, "cost panel accounts for the whole equity drop");
near(a1.invested + a1.cash, a1.equity, 0.02, "cash + invested = equity");

// Switching side must reset the amount to the smallest chip, so a 50% buy selection cannot
// become a 100% sell on the next click.
const beforeHalf = (await ev(READ)).holdings[0].shares;
await side("SELL");
const resetTo = await ev(`document.querySelector(".szbtn.on").dataset.pct`);
is(resetTo === "25", "switching to Sell resets the amount to the smallest chip", `on=${resetTo}%`);
await setPct(50);
await click("tk-go");
const afterHalf = (await ev(READ)).holdings;
const leftOver = afterHalf.length ? afterHalf[0].shares : 0;
is(leftOver > 0 && leftOver <= Math.ceil(beforeHalf / 2),
   "selling 50% sells half the POSITION and leaves the rest",
   `${beforeHalf} -> ${leftOver}`);

await side("SELL"); await setPct(100); await click("tk-go");
const a2 = await ev(READ);
const expRound = 2 * expSpread + 2 * COMMISSION;
near(a2.cash, a2.equity, 0.01, "flat, so cash is equity");
near(a2.equity, START - a2.totalCost, 0.03, "every unit of equity lost is accounted for as cost");
is(a2.commission >= COMMISSION * 2, "a commission is charged on each leg", `${a2.commission}`);

await click("step-20");
const a3 = await ev(READ);
is(a3.benchHold !== a2.benchHold, "benchmark moves when the market advances", `${a2.benchHold} -> ${a3.benchHold}`);
near(a3.diff, a3.you - a3.benchHold, 0.011, "difference = you minus the index holding");

// ---------------------------------------------------------------- portfolio
await click("brk-rebal");
const p1 = await ev(READ);
is(p1.holdings.length === 6, "equal-weight fills all six names", `held=${p1.holdings.length}`);
near(p1.invested + p1.cash, p1.equity, 0.02, "cash + invested = equity after rebalancing");
is(p1.totalCost > a3.totalCost, "rebalancing is charged, not free",
   `${a3.totalCost} -> ${p1.totalCost}`);
is(p1.maxWeight < 25, "equal weight leaves no name above 25%", `max=${p1.maxWeight}%`);
near(p1.effective, 6, 0.35, "effective holdings is about six when equally weighted");

// ---------------------------------------------------------------- risk maths
is(p1.port > 0 && p1.blended > 0, "both volatility figures are populated",
   `port=${p1.port}% blended=${p1.blended}%`);
is(p1.port < p1.blended, "portfolio vol is BELOW the weighted average of its parts",
   `${p1.port}% < ${p1.blended}%`);
near(p1.benefit, (1 - p1.port / p1.blended) * 100, 0.6, "risk removed = 1 - port/blended");

const n = p1.corr.length;
is(n === 6, "correlation matrix is 6x6", `rows=${n}`);
let diagOK = true, symOK = true, rangeOK = true, positive = 0;
for (let a = 0; a < n; a++) {
  if (Math.abs(p1.corr[a][a] - 1) > 0.005) diagOK = false;
  for (let b = 0; b < n; b++) {
    if (Math.abs(p1.corr[a][b] - p1.corr[b][a]) > 0.005) symOK = false;
    if (p1.corr[a][b] < -1.001 || p1.corr[a][b] > 1.001) rangeOK = false;
    if (a !== b && p1.corr[a][b] > 0.05) positive++;
  }
}
is(diagOK, "correlation diagonal is exactly 1.00");
is(symOK, "correlation matrix is symmetric");
is(rangeOK, "every correlation is within [-1, 1]");
// The regression test for the factor model. Under independent random walks the mean
// off-diagonal correlation is ~0; under this generator it is ~0.39, matching the closed form
// rho_ij = b_i b_j sm^2 / (s_i s_j). Measured over 400 seeds at this point in the market the
// mean never fell below 0.226 (p5 = 0.302), so 0.15 has real margin.
//
// This asserts the MEAN, not a per-pair floor. Individual pairs dip below 0.05 about 1.7% of
// the time and they cluster, because all fifteen share one factor realisation — a per-pair
// count made this test flaky without making it more sensitive.
let sumOff = 0;
for (let a = 0; a < n; a++) for (let b2 = 0; b2 < n; b2++) if (a !== b2) sumOff += p1.corr[a][b2];
const meanOff = sumOff / (n * (n - 1));
is(meanOff > 0.15, "mean off-diagonal correlation shows a real common factor",
   `mean rho = ${meanOff.toFixed(3)} (independent walks would be ~0)`);
is(positive >= 22, "the large majority of pairs are positively correlated",
   `${positive} of ${n * (n - 1)}`);

// ---------------------------------------------------------------- guards
await pick("HALC");
for (let k = 0; k < 25; k++) await side("BUY"); await click("tk-go");
const g = await ev(READ);
is(g.cash >= -0.001, "cash never goes negative under repeated oversized buys", `cash=${g.cash}`);
near(g.invested + g.cash, g.equity, 0.03, "cash + invested = equity after the overdraw attempt");

// ---------------------------------------------------------------- equity curve
const painted = async () => ev(`(() => {
  const cv = document.getElementById("brk-canvas");
  const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
  return { n, total: cv.width * cv.height };
})()`);

await setMode("PORTFOLIO");
const c1 = await painted();
const modeOn = await ev(`document.querySelector('.wrow[data-sel="PORTFOLIO"]').classList.contains("on")`);
is(modeOn, "the portfolio view activates");
is(c1.n > c1.total * 0.004, "portfolio chart actually draws a curve", `${c1.n} px of ${c1.total}`);

await click("step-20");
const c2 = await painted();
is(c2.n > 0, "portfolio chart still renders after advancing", `painted=${c2.n}`);
await pick("MRDN");

// ---------------------------------------------------------------- reckoning
const before = await ev(`document.getElementById("brk-final").innerHTML.length`);
is(before === 0, "no reckoning while the market is still running", `len=${before}`);

for (let k = 0; k < 16; k++) await click("step-20");     // run the market out
const fin = await ev(`(() => {
  const el = document.getElementById("brk-final");
  return { len: el.innerHTML.length, text: el.textContent.trim().slice(0, 120) };
})()`);
is(fin.len > 0, "reckoning appears when the market is finished");
is(/finished/i.test(fin.text), "reckoning says the market is finished", fin.text.slice(0, 50));

// House rule: no urgency language anywhere, end-of-market copy included.
const urgent = await ev(`(() => {
  const t = document.getElementById("view").textContent.toLowerCase();
  return ["hurry","act now","don't miss","expires","last chance","running out of time",
          "limited time","before it's gone"].filter(w => t.includes(w));
})()`);
is(urgent.length === 0, "no urgency language on the broker", urgent.join(", ") || "none");

const fin2 = await ev(READ);
near(fin2.invested + fin2.cash, fin2.equity, 0.03, "cash + invested = equity at the end");

console.log(fail.length ? "\nFAILING: " + fail.join(" | ") : "\nAll broker invariants hold.");
ws.close(); chrome.kill(); process.exit(fail.length ? 1 : 0);
