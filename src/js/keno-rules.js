// Table 6 — keno mathematics.
//
// Eighty numbers, twenty drawn, you pick a handful. The probabilities are hypergeometric and
// they are brutal in a very specific way: the headline prizes are real, they are just so rare
// that quoting them is a kind of lie by omission.
//
// Hitting all ten on a ten-spot is a 1 in 8.9 million shot. A paytable that pays 10,000 to 1 on
// it sounds enormous and is worth about a tenth of a penny per chip. Every number on this table
// is computed from the real distribution rather than asserted, so the expected value shown to
// the player is the one that actually exists.

export const POOL = 80;
export const DRAWN = 20;

/** n choose k, in floating point — the numbers here get large enough to need it. */
export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/** P(exactly `hit` of your `spots` are among the 20 drawn). */
export function pHit(spots, hit) {
  return (choose(spots, hit) * choose(POOL - spots, DRAWN - hit)) / choose(POOL, DRAWN);
}

/**
 * Paytables, quoted the way a real keno lounge quotes them: "pays X for 1", meaning the return
 * INCLUDING your stake. A 1-for-1 line is your money back, not a win.
 *
 * These are typical of a live keno paytable and land the house edge in the 25-30% band the
 * design doc gives for this table — the worst in the building, by a distance.
 */
export const PAYTABLE = {
  1:  { 1: 3 },
  2:  { 2: 12 },
  3:  { 2: 1, 3: 43 },
  4:  { 2: 1, 3: 3, 4: 130 },
  5:  { 3: 1, 4: 12, 5: 810 },
  6:  { 3: 1, 4: 4, 5: 90, 6: 1600 },
  7:  { 4: 2, 5: 22, 6: 360, 7: 7000 },
  8:  { 5: 10, 6: 80, 7: 1500, 8: 25000 },
  9:  { 5: 5, 6: 45, 7: 300, 8: 4000, 9: 40000 },
  10: { 5: 2, 6: 20, 7: 96, 8: 1500, 9: 5000, 10: 100000 },
};

export const MAX_SPOTS = 10;

/** Expected return per chip staked, stake included. 1.0 would be a fair game. */
export function expectedReturn(spots) {
  const pay = PAYTABLE[spots] || {};
  let r = 0;
  for (let h = 0; h <= spots; h++) r += pHit(spots, h) * (pay[h] || 0);
  return r;
}

/** House edge as a negative number, matching every other table in the building. */
export const houseEdge = (spots) => expectedReturn(spots) - 1;

/** Chance of winning anything at all on a ticket. */
export function pAnyPrize(spots) {
  const pay = PAYTABLE[spots] || {};
  let p = 0;
  for (let h = 0; h <= spots; h++) if ((pay[h] || 0) > 0) p += pHit(spots, h);
  return p;
}

/** The top prize and how rare it is — the two numbers that are never quoted together. */
export function topPrize(spots) {
  const pay = PAYTABLE[spots] || {};
  const hits = Object.keys(pay).map(Number).sort((a, b) => b - a);
  const best = hits[0];
  return { hit: best, pays: pay[best], p: pHit(spots, best), oneIn: 1 / pHit(spots, best) };
}

/** Draw 20 distinct numbers from 1..80. */
export function drawBalls() {
  const pool = Array.from({ length: POOL }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DRAWN);
}

export function settle(spots, picks, balls, stake) {
  const set = new Set(balls);
  const hits = picks.filter((n) => set.has(n));
  const pay = (PAYTABLE[spots] || {})[hits.length] || 0;
  return { hits, count: hits.length, multiple: pay, returned: stake * pay, net: stake * pay - stake };
}

/** Human framing for a probability nobody can feel. One ticket a day, how many years? */
export function yearsPerHit(p) {
  return 1 / p / 365;
}
