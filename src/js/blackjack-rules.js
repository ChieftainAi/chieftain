// Blackjack fundamentals — pure, no DOM, so they can be simulated and verified.
//
// House rules implemented (the standard, player-favourable Vegas set):
//   6-deck shoe, reshuffled at 25% penetration
//   Dealer stands on all 17, including soft 17
//   Blackjack pays 3:2, dealer peeks for blackjack
//   Double on any first two cards
//   Split once (no resplit), no double after split, split aces get one card each
//   Insurance offered on a dealer ace, pays 2:1
// With perfect basic strategy that set gives the house roughly a 0.5% edge, which is why
// this is the only table in the building where skill genuinely moves the number.

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const SUITS = ["S", "H", "D", "C"];
export const SUIT_GLYPH = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const DECKS = 6;
export const PENETRATION = 0.75;      // reshuffle once three quarters of the shoe is gone

export const cardValue = (rank) => (rank === "A" ? 11 : ["10", "J", "Q", "K"].includes(rank) ? 10 : +rank);

/** Hi-Lo: low cards good for the player when gone, high cards bad. */
export const countValue = (rank) => {
  const v = cardValue(rank);
  if (v >= 10) return -1;            // tens and aces
  if (v >= 7) return 0;              // 7, 8, 9
  return 1;                          // 2 through 6
};

export function freshShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++)
    for (const s of SUITS)
      for (const r of RANKS) shoe.push({ rank: r, suit: s });
  // Fisher-Yates
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

/** Best total for a hand, plus whether it is soft (an ace still counting as 11). */
export function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0, bust: total > 21 };
}

export const isBlackjack = (cards) => cards.length === 2 && handValue(cards).total === 21;

export const canSplit = (cards) =>
  cards.length === 2 && cardValue(cards[0].rank) === cardValue(cards[1].rank);

/** Dealer plays a fixed strategy: draw until 17 or more, standing on soft 17. */
export function dealerShouldHit(cards) {
  const { total } = handValue(cards);
  return total < 17;
}

/**
 * Basic strategy for this rule set. Returns "H", "S", "D" (double else hit),
 * "P" (split), or "R" for surrender where offered (not offered here, so never returned).
 */
export function basicStrategy(cards, dealerUp, { allowDouble = true, allowSplit = true } = {}) {
  const up = cardValue(dealerUp.rank);      // 2..11, where 11 is an ace
  const { total, soft } = handValue(cards);

  if (allowSplit && canSplit(cards)) {
    const pair = cardValue(cards[0].rank);
    if (pair === 11) return "P";                             // always split aces
    if (pair === 8) return "P";                              // always split eights
    if (pair === 10) return "S";                             // never split tens
    if (pair === 9) return [7, 10, 11].includes(up) ? "S" : "P";
    if (pair === 7) return up <= 7 ? "P" : "H";
    if (pair === 6) return up <= 6 ? "P" : "H";
    if (pair === 5) return allowDouble && up <= 9 ? "D" : "H";  // treat as a hard ten
    if (pair === 4) return up === 5 || up === 6 ? "P" : "H";
    if (pair === 3 || pair === 2) return up <= 7 ? "P" : "H";
  }

  if (soft) {
    if (total >= 19) return "S";
    if (total === 18) {
      if (up >= 3 && up <= 6) return allowDouble ? "D" : "S";
      if (up === 2 || up === 7 || up === 8) return "S";
      return "H";                                            // 9, 10, ace
    }
    if (total === 17) return allowDouble && up >= 3 && up <= 6 ? "D" : "H";
    if (total === 16 || total === 15) return allowDouble && up >= 4 && up <= 6 ? "D" : "H";
    if (total === 14 || total === 13) return allowDouble && up >= 5 && up <= 6 ? "D" : "H";
    return "H";
  }

  if (total >= 17) return "S";
  if (total >= 13) return up <= 6 ? "S" : "H";
  if (total === 12) return up >= 4 && up <= 6 ? "S" : "H";
  if (total === 11) return allowDouble ? "D" : "H";
  if (total === 10) return allowDouble && up <= 9 ? "D" : "H";
  if (total === 9) return allowDouble && up >= 3 && up <= 6 ? "D" : "H";
  return "H";
}

export const STRATEGY_NAME = { H: "Hit", S: "Stand", D: "Double", P: "Split" };

/** Settle one player hand against the dealer. Returns the multiple of the bet returned. */
export function settleHand(playerCards, dealerCards, { doubled = false, fromSplit = false } = {}) {
  const p = handValue(playerCards);
  const d = handValue(dealerCards);
  const bet = doubled ? 2 : 1;

  if (p.bust) return { payout: 0, net: -bet, label: "Bust" };

  const pBJ = isBlackjack(playerCards) && !fromSplit;
  const dBJ = isBlackjack(dealerCards);

  if (pBJ && dBJ) return { payout: bet, net: 0, label: "Push" };
  if (pBJ) return { payout: bet * 2.5, net: bet * 1.5, label: "Blackjack" };
  if (dBJ) return { payout: 0, net: -bet, label: "Dealer blackjack" };
  if (d.bust) return { payout: bet * 2, net: bet, label: "Dealer busts" };
  if (p.total > d.total) return { payout: bet * 2, net: bet, label: "Win" };
  if (p.total < d.total) return { payout: 0, net: -bet, label: "Lose" };
  return { payout: bet, net: 0, label: "Push" };
}

// ---------------------------------------------------------------- the sizing layer

/**
 * Player edge from the true count. The standard approximation is that each unit of true
 * count above about +1 is worth roughly half a percent, starting from a ~0.5% deficit.
 */
export const edgeFromCount = (trueCount) => (trueCount - 1) * 0.005;

/**
 * Kelly stake as a fraction of bankroll. Blackjack's variance per unit wagered is about
 * 1.3, and Kelly for a variable-payoff game is edge / variance. Capped at 5% because
 * full Kelly on a thin edge is a rollercoaster no human sits through.
 */
export function kellyFraction(trueCount) {
  const edge = edgeFromCount(trueCount);
  if (edge <= 0) return 0;
  return Math.min(0.05, edge / 1.3);
}

export const trueCount = (running, cardsLeft) =>
  running / Math.max(0.5, cardsLeft / 52);
