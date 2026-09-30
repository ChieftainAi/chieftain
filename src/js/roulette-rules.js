// Roulette fundamentals — pure, verifiable.
//
// European single-zero wheel: 37 pockets. Every bet on the layout is paid as though there were
// 36 equally likely outcomes, while 37 exist. That one extra pocket is the entire house edge,
// and it is identical — 2.70% — on every single bet type. Which makes roulette the cleanest
// possible demonstration that concentration changes your variance and not your expectation.

/** Physical pocket order on a European wheel, clockwise from zero. */
export const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const POCKETS = 37;

export const colorOf = (n) => (n === 0 ? "green" : RED.has(n) ? "red" : "black");

/**
 * Every bet type, with the true count of winning pockets and the casino payout.
 * payout is "to one" — a winning 35:1 straight returns the stake plus 35 times it.
 */
export const BETS = {
  straight: { hits: (n, k) => n === k,                            covers: 1,  payout: 35, label: (k) => `Straight ${k}` },
  dozen:    { hits: (n, k) => n !== 0 && Math.ceil(n / 12) === k,  covers: 12, payout: 2,  label: (k) => `${["1st", "2nd", "3rd"][k - 1]} dozen` },
  column:   { hits: (n, k) => n !== 0 && n % 3 === k % 3,          covers: 12, payout: 2,  label: (k) => `Column ${k}` },
  color:    { hits: (n, k) => n !== 0 && colorOf(n) === k,         covers: 18, payout: 1,  label: (k) => k === "red" ? "Red" : "Black" },
  parity:   { hits: (n, k) => n !== 0 && (n % 2 === 0) === (k === "even"), covers: 18, payout: 1, label: (k) => k === "even" ? "Even" : "Odd" },
  half:     { hits: (n, k) => n !== 0 && (k === "low" ? n <= 18 : n >= 19), covers: 18, payout: 1, label: (k) => k === "low" ? "1 to 18" : "19 to 36" },
};

// Column bets: column 1 is 1,4,7..., i.e. n % 3 === 1; column 3 is n % 3 === 0.
BETS.column.hits = (n, k) => n !== 0 && (k === 3 ? n % 3 === 0 : n % 3 === k);

export const parseBet = (id) => {
  const [type, raw] = id.split(":");
  const key = /^-?\d+$/.test(raw) ? +raw : raw;
  return { type, key };
};

export const betLabel = (id) => {
  const { type, key } = parseBet(id);
  return BETS[type].label(key);
};

export const betWins = (id, n) => {
  const { type, key } = parseBet(id);
  return BETS[type].hits(n, key);
};

export const betPayout = (id) => BETS[parseBet(id).type].payout;
export const betCovers = (id) => BETS[parseBet(id).type].covers;

/** Expected value per unit staked. Should be -1/37 for every bet on the wheel. */
export function betEV(id) {
  const covers = betCovers(id);
  const payout = betPayout(id);
  const p = covers / POCKETS;
  return p * payout - (1 - p);
}

/** Which pockets a whole set of bets covers, so coverage and variance can be shown. */
export function coveredPockets(bets) {
  const set = new Set();
  for (const id of Object.keys(bets)) {
    for (let n = 0; n < POCKETS; n++) if (betWins(id, n)) set.add(n);
  }
  return set;
}

/** Settle a spin. Returns total returned to the player (stake included on wins). */
export function settle(bets, n) {
  let staked = 0, returned = 0;
  const winners = [];
  for (const [id, amt] of Object.entries(bets)) {
    staked += amt;
    if (betWins(id, n)) { returned += amt * (betPayout(id) + 1); winners.push(id); }
  }
  return { staked, returned, net: returned - staked, winners };
}

/**
 * Standard deviation of the return per unit staked for a single bet — the number that actually
 * differs between a straight-up bet and an even-money one, while the EV does not.
 */
export function betStdev(id) {
  const p = betCovers(id) / POCKETS;
  const payout = betPayout(id);
  const ev = betEV(id);
  const e2 = p * payout * payout + (1 - p) * 1;
  return Math.sqrt(e2 - ev * ev);
}
