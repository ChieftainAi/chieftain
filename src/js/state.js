// Player state. localStorage only — nothing leaves the browser, nothing is redeemable.
const KEY = "he_state_v1";
const STARTING_CHIPS = 1000;

const fresh = () => ({
  chips: STARTING_CHIPS,
  rounds: 0,
  climb: {
    history: [],        // { mult, stake, payout, cashedAt|null }
    disciplined: STARTING_CHIPS,  // counterfactual: always exit at 1.07x
    moonshot: STARTING_CHIPS,     // counterfactual: always hold for 10x
    biggestWin: 0,
  },
  wheel: {
    spins: 0,
    history: [],        // last numbers, newest first
    broad: STARTING_CHIPS,   // counterfactual: always on red
    single: STARTING_CHIPS,  // counterfactual: always straight up on one number
    wagered: 0,
    edgePaid: 0,
  },
  sizing: {
    hands: 0,
    history: [],        // { bet, kelly, tc, result, net }
    flat: STARTING_CHIPS,    // counterfactual: always bets the table minimum
    kelly: STARTING_CHIPS,   // counterfactual: always bets the Kelly-optimal fraction
    peakEdgeSeen: 0,
    sizedWell: 0,       // hands bet within 35% of Kelly
  },
  reels: {
    spins: 0,
    indexUnlocked: false,
    indexMode: false,
    history: [],        // { sectors, returns, covered, stake, net, correlated }
    shadow: STARTING_CHIPS,  // counterfactual: the same spins at an index fund's fee
    wagered: 0,
    feesPaid: 0,
    curve: [],              // bank after each spin, for the chart unlocked at rung 03
    rets: [],               // per-spin return, for the volatility readout at rung 04
  },
  twohands: {
    coups: 0,
    history: [],            // outcomes, newest first, for the road
    wagered: 0,
    commissionPaid: 0,
    banker: STARTING_CHIPS, // counterfactual: always Banker, pays the 5%
    player: STARTING_CHIPS, // counterfactual: always Player, pays nothing
    tie: STARTING_CHIPS,    // counterfactual: always Tie, pays 8:1 and bleeds
  },
  pit: {
    rolls: 0,
    decisions: 0,
    wagered: 0,
    oddsWagered: 0,
    history: [],              // { result, point, net }
    withOdds: STARTING_CHIPS, // counterfactual: pass line backed with max free odds
    flatOnly: STARTING_CHIPS, // counterfactual: pass line alone, all of it marked up
    dontSide: STARTING_CHIPS, // counterfactual: the other side of the same rolls
  },
  chase: {
    tickets: 0,
    wagered: 0,
    returned: 0,
    bestHits: 0,
    history: [],              // { spots, hits, net }
    chasing: STARTING_CHIPS,  // counterfactual: a ticket every draw
    boring: STARTING_CHIPS,   // counterfactual: the same stake into a broad low-fee basket
  },
  book: {
    sessions: 0,
    trades: 0,
    spreadEarned: 0,
    adverseLost: 0,
    history: [],              // { spread, filled, pnl, settle }
    wide: STARTING_CHIPS,     // counterfactual: quote 2.00 and trade rarely
    tight: STARTING_CHIPS,    // counterfactual: quote 0.20 and trade constantly
    taker: STARTING_CHIPS,    // counterfactual: cross the spread every round, both ways
  },
  /**
   * The current sitting. This is the first time anything in the app records a clock, and the
   * direction matters: a session counts UP from when you arrived so the game can tell you what
   * you did, and never counts DOWN toward anything. House rule 2 bans manufactured urgency, and
   * that has already cost this project a countdown widget and a fake live feed. A summary of
   * work done is information; a deadline is pressure. Only the first is allowed here.
   */
  session: {
    startedAt: null,        // ISO, stamped on the first activity of a sitting
    lastSeen: null,         // ISO, refreshed on every round
    rounds: 0,              // rounds played this sitting
    concepts: [],           // chip keys met this sitting, newest last
    tables: [],             // table ids visited this sitting
    summarised: false,      // has the end-of-sitting summary already been shown
  },
  // The prestige ladder. Ten rungs, one content tier each; reaching 10 means every concept
  // in the game has been read and checked. Coins are overwhelmingly paid by comprehension —
  // the casino itself is negative-expectation, so it can never be the engine, only the finisher.
  prestige: {
    level: 0,
    best: 0,
    read: [],           // concept ids studied, so a bounty is never paid twice
    passed: [],         // tier numbers whose check has been passed
    attempts: {},       // tier number -> check attempts, shown honestly on the ladder
    restakes: 0,        // times the bank was rebuilt from ruin
    maxedAt: null,      // ISO date the tenth rung was bought
  },
  line: {
    slates: 0,
    bets: 0,
    won: 0,
    staked: 0,
    returned: 0,
    clvBeat: 0,         // bets that got a better price than the closing line
    researched: 0,
    researchedBets: 0,
    vigPaid: 0,
    chalk: STARTING_CHIPS,   // counterfactual: flat bet the favourite in every game
    sharp: STARTING_CHIPS,   // counterfactual: only researched edges >= 3%, half Kelly
    history: [],        // { label, side, odds, stake, net, edge, clv, deep }
  },
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    // Merge onto a fresh object so older saves pick up new fields instead of crashing.
    const saved = JSON.parse(raw);
    const base = fresh();
    return {
      ...base, ...saved,
      climb: { ...base.climb, ...(saved.climb || {}) },
      reels: { ...base.reels, ...(saved.reels || {}) },
      sizing: { ...base.sizing, ...(saved.sizing || {}) },
      wheel: { ...base.wheel, ...(saved.wheel || {}) },
      line: { ...base.line, ...(saved.line || {}) },
      prestige: { ...base.prestige, ...(saved.prestige || {}) },
      session: { ...base.session, ...(saved.session || {}) },
      twohands: { ...base.twohands, ...(saved.twohands || {}) },
      pit: { ...base.pit, ...(saved.pit || {}) },
      chase: { ...base.chase, ...(saved.chase || {}) },
      book: { ...base.book, ...(saved.book || {}) },
    };
  } catch {
    return fresh();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { /* storage blocked; the session still plays, it just will not persist */ }
}

export const get = () => state;

export function reset() {
  state = fresh();
  save();
  render();
}

/** Adjust the bank and flash the counter in the right direction. */
export function addChips(delta) {
  state.chips = Math.max(0, Math.round((state.chips + delta) * 100) / 100);
  save();
  render(delta);
}

/**
 * A sitting goes stale after this long without a round. Crossing it starts a fresh one, which
 * is what makes an end-of-sitting summary meaningful rather than an ever-growing tally. It is
 * not a timer: nothing expires, nothing is lost, and the player is never told about it.
 */
const SESSION_GAP_MS = 45 * 60 * 1000;

/** Start a new sitting if this is the first activity, or the last one has gone stale. */
export function touchSession() {
  const now = Date.now();
  const last = state.session.lastSeen ? Date.parse(state.session.lastSeen) : 0;
  const stale = !state.session.startedAt || (last && now - last > SESSION_GAP_MS);
  if (stale) {
    state.session = {
      ...state.session,
      startedAt: new Date(now).toISOString(),
      rounds: 0,
      concepts: [],
      tables: [],
      summarised: false,
    };
  }
  state.session.lastSeen = new Date(now).toISOString();
  return state.session;
}

/** Minutes elapsed in the current sitting. Reported after the fact, never counted toward. */
export function sessionMinutes() {
  const { startedAt, lastSeen } = state.session;
  if (!startedAt || !lastSeen) return 0;
  return Math.max(0, Math.round((Date.parse(lastSeen) - Date.parse(startedAt)) / 60000));
}

/**
 * Record that the player met a concept. Called by teach() so the table can report what the
 * hand just demonstrated, rather than the chip modal being the only place learning is visible.
 */
export function noteConcept(key) {
  touchSession();
  if (!state.session.concepts.includes(key)) state.session.concepts.push(key);
  save();
}

/**
 * Every table calls this exactly once when a round resolves — the one place the whole game
 * already converges, which is why the play-to-learning signal hooks here instead of into nine
 * separate settle functions.
 */
export function bumpRounds(table = null) {
  state.rounds += 1;
  touchSession();
  state.session.rounds += 1;
  if (table && !state.session.tables.includes(table)) state.session.tables.push(table);
  save();
  render();
}

/**
 * Rebuild a ruined bank. A negative-expectation casino can take everything, and a player
 * with nothing left has no way back onto the ladder — so this exists, it is counted, and the
 * count is shown. It is not a free retry, it is a recorded one.
 */
export const RESTAKE_FLOOR = 50;
export const RESTAKE_TO = 250;

export function restake() {
  if (state.chips >= RESTAKE_FLOOR) return false;
  state.chips = RESTAKE_TO;
  state.prestige.restakes += 1;
  save();
  render(RESTAKE_TO);
  return true;
}

const fmt = (n) =>
  n >= 10000 ? Math.round(n).toLocaleString("en-US")
             : (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function render(delta = 0) {
  const chipEl = document.getElementById("bank-chips");
  const roundEl = document.getElementById("bank-rounds");
  const prestigeEl = document.getElementById("bank-prestige");
  if (!chipEl) return;
  chipEl.textContent = fmt(state.chips);
  roundEl.textContent = state.rounds;
  // The front page no longer carries a stats row, so the topbar is the only
  // place prestige is shown. MAX_LEVEL is not imported here on purpose —
  // curriculum.js imports from this module, and the cycle breaks the app.
  if (prestigeEl) prestigeEl.innerHTML = `${state.prestige.level}<i>/10</i>`;
  if (delta) {
    const cls = delta > 0 ? "flash-up" : "flash-down";
    chipEl.classList.remove("flash-up", "flash-down");
    void chipEl.offsetWidth;              // restart the animation
    chipEl.classList.add(cls);
  }
}

export { fmt, STARTING_CHIPS };
