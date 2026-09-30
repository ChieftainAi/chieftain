// Table 4 — punto banco rules and mathematics.
//
// The full third-card tableau is implemented exactly as dealt in a real casino, because the
// lesson at this table depends on the payouts being the real ones. Nobody at a baccarat table
// makes a decision after the bet is placed — the draws are compulsory and mechanical — which is
// precisely why it is the right game for a lesson about *choosing a product*, not playing a hand.
//
// The three bets and their true edges on an eight-deck shoe:
//
//   Banker  wins 45.860%, pays 1:1 less 5% commission  ->  house edge 1.058%
//   Player  wins 44.625%, pays 1:1                     ->  house edge 1.235%
//   Tie     wins  9.516%, pays 8:1                     ->  house edge 14.360%
//
// Banker is the only bet in the building that charges a visible, itemised fee, and it is also
// the best bet in the building. That inversion is the whole table.
import { RANKS, SUITS, SUIT_GLYPH } from "./blackjack-rules.js";

export { RANKS, SUITS, SUIT_GLYPH };

export const DECKS = 8;
export const PENETRATION = 0.85;
export const COMMISSION = 0.05;

/** Baccarat card values: aces are 1, faces and tens are 0, everything else is its pip count. */
export const pip = (rank) =>
  rank === "A" ? 1 : ["10", "J", "Q", "K"].includes(rank) ? 0 : +rank;

/** A hand's total is the last digit of the sum. There is no bust. */
export const total = (cards) => cards.reduce((a, c) => a + pip(c.rank), 0) % 10;

export function freshShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++)
    for (const s of SUITS)
      for (const r of RANKS) shoe.push({ rank: r, suit: s });
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

/**
 * The tableau. Returns the finished coup, with the order the cards actually came out in so the
 * table can deal them one at a time. No player agency anywhere in here — that is the point.
 */
export function playCoup(draw) {
  const player = [draw(), draw()];
  const banker = [draw(), draw()];
  const steps = [
    { to: "player", card: player[0] }, { to: "banker", card: banker[0] },
    { to: "player", card: player[1] }, { to: "banker", card: banker[1] },
  ];

  const pNat = total(player) >= 8, bNat = total(banker) >= 8;
  let natural = pNat || bNat;

  if (!natural) {
    let third = null;
    // Player stands on 6 and 7, draws on 0-5.
    if (total(player) <= 5) {
      third = draw();
      player.push(third);
      steps.push({ to: "player", card: third });
    }

    const b = total(banker);
    let bankerDraws;
    if (third === null) {
      bankerDraws = b <= 5;                       // player stood: banker plays like the player
    } else {
      const t = pip(third.rank);
      bankerDraws =
        b <= 2 ? true
        : b === 3 ? t !== 8
        : b === 4 ? t >= 2 && t <= 7
        : b === 5 ? t >= 4 && t <= 7
        : b === 6 ? t === 6 || t === 7
        : false;                                  // 7 always stands
    }
    if (bankerDraws) {
      const c = draw();
      banker.push(c);
      steps.push({ to: "banker", card: c });
    }
  }

  const p = total(player), bk = total(banker);
  const outcome = p > bk ? "player" : bk > p ? "banker" : "tie";
  return { player, banker, steps, outcome, playerTotal: p, bankerTotal: bk, natural };
}

/**
 * Settle one bet. Player and Banker push on a tie — a detail that matters, because it is what
 * keeps their edges as low as they are.
 */
export function settle(bet, stake, coup) {
  if (stake <= 0) return { returned: 0, net: 0, commission: 0, push: false };
  const { outcome } = coup;

  if (bet === "tie") {
    return outcome === "tie"
      ? { returned: stake * 9, net: stake * 8, commission: 0, push: false }
      : { returned: 0, net: -stake, commission: 0, push: false };
  }
  if (outcome === "tie") return { returned: stake, net: 0, commission: 0, push: true };
  if (outcome !== bet) return { returned: 0, net: -stake, commission: 0, push: false };

  if (bet === "banker") {
    const commission = stake * COMMISSION;
    return { returned: stake + stake - commission, net: stake - commission, commission, push: false };
  }
  return { returned: stake * 2, net: stake, commission: 0, push: false };
}

/** The real eight-deck probabilities, used for the EV column and the counterfactuals. */
export const PROB = { banker: 0.458597, player: 0.446247, tie: 0.095156 };

export const BETS = {
  player: { label: "Player", pays: "1 : 1",
            teaches: "The active fund. No visible fee, slightly worse odds." },
  banker: { label: "Banker", pays: "1 : 1 less 5%",
            teaches: "The index fund. Charges an itemised fee and still wins." },
  tie:    { label: "Tie",    pays: "8 : 1",
            teaches: "The get-rich-quick pitch. Best story, worst number in the building." },
};

/**
 * Expected value per chip staked, derived from the probabilities rather than quoted at you.
 * Player and Banker push on a tie, so a tie contributes nothing to either; the Tie bet is the
 * only one where a tie is the win condition.
 */
export function ev(bet) {
  if (bet === "tie")    return PROB.tie * 8 - (1 - PROB.tie);
  if (bet === "banker") return PROB.banker * (1 - COMMISSION) - PROB.player;
  return PROB.player - PROB.banker;
}

export const houseEdge = (bet) => ev(bet);
