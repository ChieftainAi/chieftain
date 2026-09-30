// Table 5 — craps rules and mathematics.
//
// The pass line is a long call: you win when the number comes back before the seven. Don't pass
// is a long put: you win on the crash. And the free odds bet behind either of them is the only
// wager in any casino paid at TRUE odds, with a house edge of exactly zero — which makes it the
// one place a player can see what a fairly priced derivative actually looks like.
//
// The whole table is built on one consequence of that: a zero-edge bet placed alongside a
// negative-edge bet dilutes the blended cost. Pass alone is −1.41%. Pass backed with 10x odds is
// −0.184%. The bet did not get better; it got *diluted* by something sold at fair value.

/** Ways to roll each total with two dice, out of 36. */
export const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

export const POINTS = [4, 5, 6, 8, 9, 10];

/** True odds paid on a free-odds bet behind the pass line, by point. */
export const TRUE_ODDS = {
  4: [2, 1], 10: [2, 1],
  5: [3, 2], 9: [3, 2],
  6: [6, 5], 8: [6, 5],
};

/** Laying odds against a point (behind don't pass) pays the inverse. */
export const LAY_ODDS = {
  4: [1, 2], 10: [1, 2],
  5: [2, 3], 9: [2, 3],
  6: [5, 6], 8: [5, 6],
};

export function rollDie() { return 1 + Math.floor(Math.random() * 6); }
export function rollDice() {
  const a = rollDie(), b = rollDie();
  return { a, b, total: a + b };
}

/** P(point repeats before a seven) — the only probability this table really turns on. */
export const pPointBefore7 = (point) => WAYS[point] / (WAYS[point] + WAYS[7]);

/**
 * House edge on the pass line. 244 of 495 resolved sequences win, which is 1.414%.
 * Don't pass is marginally better because the barred 12 pushes rather than winning.
 */
export const PASS_EDGE = -0.014141;
export const DONT_EDGE = -0.013636;

/**
 * The blended edge once free odds are taken behind the line. This is the number the table
 * exists to show: the odds portion is priced at exactly fair value, so it dilutes rather than
 * improves, and the dilution is enormous.
 *
 * Average pass-line wager with Nx odds = 1 + N * (average odds actually laid), and the edge is
 * the same 1.414% of the flat bet spread over the larger total.
 */
export function blendedEdge(multiple) {
  if (multiple <= 0) return PASS_EDGE;
  // Odds are only taken once a point is established, which happens on 24/36 come-out rolls.
  const pPoint = (WAYS[4] + WAYS[5] + WAYS[6] + WAYS[8] + WAYS[9] + WAYS[10]) / 36;
  const avgAction = 1 + multiple * pPoint;
  return PASS_EDGE / avgAction;
}

/** Expected value of a free-odds bet, per chip — exactly zero, by construction. */
export function oddsEV(point) {
  const p = pPointBefore7(point);
  const [num, den] = TRUE_ODDS[point];
  return p * (num / den) - (1 - p);
}

/**
 * Resolve one shooter sequence from a come-out roll to a decision. Returns every roll made, so
 * the table can play them out one at a time.
 */
export function playSequence() {
  const rolls = [];
  const come = rollDice();
  rolls.push(come);

  if ([7, 11].includes(come.total)) return { rolls, point: null, result: "pass", comeOut: come.total };
  if ([2, 3].includes(come.total)) return { rolls, point: null, result: "dont", comeOut: come.total };
  if (come.total === 12) return { rolls, point: null, result: "bar12", comeOut: 12 };

  const point = come.total;
  for (;;) {
    const r = rollDice();
    rolls.push(r);
    if (r.total === point) return { rolls, point, result: "pass", comeOut: point };
    if (r.total === 7) return { rolls, point, result: "dont", comeOut: point };
  }
}

/**
 * Settle a bet set against a finished sequence.
 * `flat` is the pass/don't-pass stake, `odds` the free-odds stake behind it.
 */
export function settle({ side, flat, odds }, seq) {
  const { result, point } = seq;
  let net = 0, oddsNet = 0, push = false;

  if (side === "pass") {
    if (result === "pass") {
      net = flat;
      if (point && odds > 0) {
        const [n, d] = TRUE_ODDS[point];
        oddsNet = odds * (n / d);
      }
    } else if (result === "bar12") {
      net = -flat;                       // 12 on the come-out loses the pass line
    } else {
      net = -flat;
      oddsNet = -odds;
    }
  } else {
    if (result === "dont") {
      net = flat;
      if (point && odds > 0) {
        const [n, d] = LAY_ODDS[point];
        oddsNet = odds * (n / d);
      }
    } else if (result === "bar12") {
      push = true;                       // barred twelve: the don't bettor pushes
    } else {
      net = -flat;
      oddsNet = -odds;
    }
  }

  const total = net + oddsNet;
  return {
    net: total,
    flatNet: net,
    oddsNet,
    push,
    returned: push ? flat + odds : flat + odds + total,
  };
}

/** The maximum odds the house will lay behind a point, under 3-4-5x rules. */
export const maxOdds = (point) =>
  point === 4 || point === 10 ? 3 : point === 5 || point === 9 ? 4 : 5;

export const oddsLabel = (point) => {
  const [n, d] = TRUE_ODDS[point] || [1, 1];
  return `${n}:${d}`;
};
