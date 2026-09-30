// Table 9 — odds mathematics.
//
// Everything a sportsbook does to a price is in here, and none of it is invented. American odds
// convert to an implied probability; the two sides of a market are quoted so those probabilities
// sum to more than 100%; the excess is the overround and the book's cut of it is the hold. That
// surplus is the entire house edge at this table, and it is printed on the board.
//
//   -110 / -110  ->  52.38% + 52.38% = 104.76% overround, 4.55% hold
//
// De-vigging (dividing each side by the sum) recovers what the market actually believes, which
// is the number a player has to disagree with in order to have anything at all.

/** Profit on a one-chip stake. −150 returns 0.667, +150 returns 1.5. */
export const profitPerUnit = (a) => (a > 0 ? a / 100 : 100 / -a);

/** Total return on a one-chip stake, stake included. The European way of writing the same price. */
export const toDecimal = (a) => 1 + profitPerUnit(a);

/** The probability a price implies, vig and all. This is also the break-even win rate. */
export const toProb = (a) => 1 / toDecimal(a);

/** Books quote in increments, so a posted price is never the exact fair number. */
export function roundOdds(a) {
  const step = Math.abs(a) < 200 ? 5 : Math.abs(a) < 1000 ? 10 : 25;
  const r = Math.round(a / step) * step;
  return Math.abs(r) < 100 ? (r < 0 ? -100 : 100) : r;
}

/** Probability -> American odds. 0.5 is quoted −100, the pick'em price. */
export function toAmerican(p) {
  const q = Math.min(0.995, Math.max(0.005, p));
  return roundOdds(q >= 0.5 ? -(100 * q) / (1 - q) : (100 * (1 - q)) / q);
}

export function formatOdds(a) {
  return (a > 0 ? "+" : "") + a;
}

/**
 * Post a two-way market. A fair probability goes in, two quoted prices come out.
 *
 * The markup is deliberately NOT spread evenly. Books load more of it onto the underdog,
 * because that is where the money goes: across every wagering market ever studied, bettors
 * overpay for small chances at big payouts. The effect is old enough to have a name — the
 * favourite-longshot bias — and it is why the roulette table's "every bet costs the same"
 * does not hold here. On this board the exciting side costs several times more.
 *
 * With total overround O and skew s, the underdog is marked up by O(1+s) and the favourite by
 * whatever keeps the two sides summing to exactly 1 + O, so the book's total take is unchanged
 * and only its distribution moves.
 */
export function postMarket(pFair, overround, skew = 0.9) {
  const dog = pFair < 0.5 ? pFair : 1 - pFair;
  const fav = 1 - dog;
  // The bias scales with how lopsided the game is. A true coin flip is priced evenly at
  // -110 / -110; it is the 5-to-1 shot that carries the loaded end of the markup.
  const wDog = 1 + skew * (1 - 2 * dog);
  const wFav = (1 - dog * wDog) / fav;
  const qDog = dog * (1 + overround * wDog);
  const qFav = fav * (1 + overround * wFav);
  const home = toAmerican(pFair < 0.5 ? qDog : qFav);
  const away = toAmerican(pFair < 0.5 ? qFav : qDog);
  return { home, away };
}

/**
 * What one side actually costs, to someone who knows the true probability. This is the number
 * the "edge" column is measured against, and on a skewed board it differs by side.
 */
export function sideCost(pTrueSide, odds) {
  return -ev(pTrueSide, odds);
}

/** What the market believes once the vig is divided back out. */
export function devig(homeOdds, awayOdds) {
  const h = toProb(homeOdds);
  const a = toProb(awayOdds);
  const sum = h + a;
  return { home: h / sum, away: a / sum, overround: sum - 1, hold: (sum - 1) / sum };
}

/** Expected profit per chip staked, given your own probability. */
export function ev(p, odds) {
  return p * profitPerUnit(odds) - (1 - p);
}

/** Kelly fraction of bankroll. Negative means the bet is the wrong way round. */
export function kelly(p, odds) {
  const b = profitPerUnit(odds);
  return (p * b - (1 - p)) / b;
}

/** Decimal price improvement against the closing number — positive means you got the better of it. */
export function clv(takenOdds, closeOdds) {
  return toDecimal(takenOdds) / toDecimal(closeOdds) - 1;
}

/** Box-Muller. Used for scouting error, never for deciding who wins. */
export function gauss(sd = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd;
}

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
