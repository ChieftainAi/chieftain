// The prestige ladder: ten rungs, one content tier each. Reaching rung ten means every
// concept in the game has been read and its check passed.
//
// THE ECONOMY, AND WHY IT IS SHAPED THIS WAY
//
// Every table in this game is negative-expectation on purpose — that is house rule 3, and it
// is the entire premise. So a coin ladder cannot be ground out: playing more loses more, as a
// matter of arithmetic. That is not a problem to design around, it is the design. Coins are
// paid overwhelmingly by comprehension, and each tier's check unlocks a positive-expectation
// play. The residual gap to the next rung has to be closed at the tables, using the edge the
// check just handed you. You cannot buy a rung by grinding, and you cannot buy one by reading
// alone either. You have to learn the thing and then go do it.
//
// Buying a rung costs two thirds of the bank, so every rung is climbed from a third of the
// height of the last one. Tuned so the play-gap sits near 30% of the bank at every rung —
// roughly twenty well-sized Index Mode spins — which keeps the late game from turning into a
// grind while the checks get genuinely harder.
import { STUDY } from "./study.js";

/** Bank required to buy each rung. */
const THRESHOLD = [0, 1500, 2400, 3800, 6000, 9500, 15000, 24000, 38000, 60000, 95000];

/** Buying a rung leaves you this share of your bank. */
export const KEEP_ON_PRESTIGE = 1 / 3;

/** A tier's check pays this share of its threshold; its reading cards split this share. */
const CHECK_SHARE = 0.45;
const READ_SHARE = 0.10;

export const MAX_LEVEL = 10;

export const thresholdFor = (level) => THRESHOLD[level] || Infinity;
export const checkBounty = (tier) => Math.round(thresholdFor(tier) * CHECK_SHARE);
export const readBounty = (tier) =>
  Math.round((thresholdFor(tier) * READ_SHARE) / (STUDY[tier]?.length || 1));

/**
 * What each rung grants. Every one of these is a real mechanical change, not a badge —
 * and note what the advanced rungs buy: a sharper read and more of the attention that a
 * sharper read needs. Learning literally becomes the mechanic.
 */
export const UNLOCKS = {
  1:  { id: "indexMode", label: "Index Mode at Sector Reels",
        note: "The same machine at a 0.03% fee with real market drift — RTP 107%. The first play in the building with a positive expectation." },
  2:  { id: "compound",  label: "Compounding hold",
        note: "Index Mode can be held for ten spins at once. Time in the market, rather than ten decisions about it." },
  3:  { id: "chart",     label: "The price chart",
        note: "Candlesticks, with the open, high, low and close of every round you have played." },
  4:  { id: "vol",       label: "Realized volatility",
        note: "The chart starts reporting how much the thing actually moves, which is the number sizing needs." },
  5:  { id: "volSizing", label: "Volatility-sized staking",
        note: "A stake calculator that uses measured variance instead of a guess. This is what charts are genuinely for." },
  6:  { id: "slot3",     label: "A third research slot",
        note: "Margin of safety means acting only on a wide gap — which takes one more look than you had." },
  7:  { id: "deepen1",   label: "Sharper read — 1.1 points",
        note: "Your researched estimate at The Line tightens from 1.4 points of error to 1.1." },
  8:  { id: "slot4",     label: "A fourth research slot",
        note: "Cycles reward the patient. More looks, so more weeks where the right move is no bet at all." },
  9:  { id: "deepen2",   label: "Sharper read — 0.9 points",
        note: "Your researched estimate tightens again, to 0.9 points. About as good as anyone gets." },
  10: { id: "capstone",  label: "The full ladder",
        note: "Every concept in the game read and checked. Nothing left to unlock, which is the point of the exercise." },
};

/** Has the player earned a given capability? Tables ask this rather than counting spins. */
export function hasUnlock(level, id) {
  for (let n = 1; n <= level; n++) if (UNLOCKS[n]?.id === id) return true;
  return false;
}

export const TIERS = [
  { n: 1,  band: "basics",   name: "What money is",
    blurb: "Prices, scarcity, and the thing a coin is actually a claim on." },
  { n: 2,  band: "basics",   name: "Time and interest",
    blurb: "Inflation, compounding, and why a number today is not a number in ten years." },
  { n: 3,  band: "charts",   name: "Reading a candle",
    blurb: "Open, high, low, close, and what a timeframe silently decides for you." },
  { n: 4,  band: "charts",   name: "Volume and scale",
    blurb: "What confirms a move, what a gap is, and why a log axis is not a trick." },
  { n: 5,  band: "charts",   name: "What a chart cannot tell you",
    blurb: "Trend, drawdown, and the honest limits of pattern reading." },
  { n: 6,  band: "advanced", name: "Value and margin of safety",
    blurb: "Graham: price is what you pay, and the gap to worth is the only protection there is." },
  { n: 7,  band: "advanced", name: "Valuation",
    blurb: "Damodaran: a business is worth its cash flows discounted, and the discount rate is where the argument lives." },
  { n: 8,  band: "advanced", name: "Reflexivity and cycles",
    blurb: "Soros, Marks, Taleb: markets that change the thing they are measuring." },
  { n: 9,  band: "advanced", name: "Volatility and fat tails",
    blurb: "Clustering, GARCH, and why the normal distribution keeps lying to you." },
  { n: 10, band: "advanced", name: "Factors and microstructure",
    blurb: "What actually explains a return, and who is on the other side of the trade." },
];

export const tierByN = (n) => TIERS.find((t) => t.n === n);

/** Pass marks rise with the band. The late tiers are supposed to be hard. */
export function passMark(tier) {
  const band = tierByN(tier)?.band;
  return band === "basics" ? 0.7 : band === "charts" ? 0.75 : 0.8;
}

/** How many questions a check draws from that tier's pool. */
export function checkLength(tier) {
  const band = tierByN(tier)?.band;
  return band === "basics" ? 4 : band === "charts" ? 5 : 6;
}
