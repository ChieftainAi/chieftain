# Chieftain

**Learn why the house always wins. Then learn how investors do.**

A browser game that teaches finance using real casino mechanics. Nine tables, each built on an
actual casino game with its actual payout maths, rebuilt so the thing it teaches you is how
markets work. Plus a brokerage simulator where the edge is the one you meet in a real trading
account: a spread, a commission, and the gap between what you did and what doing nothing would
have paid.

The casino is the villain the game teaches you to beat, not the fantasy it sells you.

No build step, no framework, no dependencies. Static HTML, CSS and ES modules.

---

## Run it

```bash
git clone <this repo>
cd chieftain
node tools/serve.mjs          # http://localhost:8777
```

That is the whole setup. `tools/serve.mjs` is a dependency-free dev server that sends
`Cache-Control: no-store`, because a caching dev server silently serves stale modules and makes
working changes look broken.

Deploying is `src/` as the publish directory. `netlify.toml` is already configured.

---

## What is in it

| | |
|---|---|
| **The Floor** | Nine playable tables - slots, blackjack, roulette, baccarat, craps, keno, crash, live dealer, sports betting - each carrying its real RTP and house edge, each teaching one market idea. |
| **The Broker** | A retail brokerage simulator: six correlated instruments, an order ticket, portfolio analytics, and a benchmark that bought the index once and never traded again. |
| **The Ladder** | Ten prestige rungs. Read the tier, pass its check, and the check unlocks a genuinely positive-EV capability. |
| **Chips** | 46 concept cards that fire mid-hand, at the moment the table is demonstrating the thing they describe. |
| **The Vault** | An indexed reading room pointing at advanced material - Graham, Damodaran, factor models - hosted elsewhere. |

---

## The design rules

These are non-negotiable and they are the reason the project exists. Contributions that break
them will not be merged, however good the code is.

1. **Nothing is redeemable, transferable or tradeable.** No real money in, no cash-out, ever.
   The moment chips are redeemable this is a sweepstakes casino and needs gambling licensing.

2. **No near-miss dressing.** Near-miss animation is the single mechanic most implicated in
   problem-gambling reinforcement, and it has no honest use here.

3. **The house edge is always a real, visible cost** - a fee, a spread, or inflation the player
   can inspect - and never a rigged draw. Nothing in this codebase weights an RNG against you.

4. **Always show the counterfactual.** Every table and the Broker display what the boring,
   low-fee version of the same decision would have returned.

5. **Progression gates on understanding, not on wagering volume.** You advance by passing
   comprehension checks. You cannot grind your way up, because every table is negative-EV by
   design - which is exactly why learning has to be the engine.

6. **No manufactured urgency.** No countdowns, no streaks, no expiring sessions, no daily
   rewards. This is enforced by test: `tools/` scans rendered routes for deadline and streak
   language, so drifting into retention tricks fails the suite.

---

## Architecture

```
src/
  index.html        the shell: sidebar, topbar, stage
  styles.css        every design token lives in the :root block
  js/
    main.js         hash router
    theme.js        feeds the same :root tokens to canvas, so DOM and canvas cannot drift
    broker.js       the brokerage simulator
    belt.js         the front-page conveyor of tables
    <table>.js      one module per table, each exporting view() / mount() / unmount()
    lessons.js      the 46 concept chips
    study.js        the Ladder's study cards
    checks.js       73 comprehension questions
tools/              verification harness (see below)
docs/DESIGN.md      the running spec, and the reasoning behind every decision
```

**Design tokens are centralised.** Colours, radii, type and spacing are custom properties in the
`:root` block of `styles.css`. `theme.js` reads those same properties and hands them to the
canvas drawing code, so the wheel, the reels and the charts always match the DOM. Change a token
in one place and everything follows.

---

## Verification

There is no test framework. `tools/` drives real Chrome over the DevTools protocol - Node 24 has
a global `WebSocket`, so there are no dependencies to install.

```bash
node tools/serve.mjs &                                        # serve first

node tools/broker.mjs   http://localhost:8777/index.html      # 41 accounting + risk invariants
node tools/a11y.mjs     http://localhost:8777/index.html / /broker /ladder /chips /rules /vault
node tools/belt.mjs     http://localhost:8777/index.html      # conveyor: a11y, reduced motion
node tools/mobile.mjs   http://localhost:8777/index.html      # overflow + tap targets at 390px
node tools/factor.mjs                                         # validates the market generator
node tools/shot.mjs     http://localhost:8777/index.html /    # screenshots any route
```

Under Git Bash, prefix these with `MSYS_NO_PATHCONV=1` or the shell rewrites `#/route`
arguments into Windows paths and every route silently renders as the home page.

`tools/README.md` documents the traps these already handle - they were all found the hard way.

---

## Two things are deliberately absent

**Live market data.** Every free stock-data tier (Alpha Vantage, Finnhub, Polygon, Tiingo)
forbids commercial use, and yfinance breaks Yahoo's terms. The Broker's six instruments are
generated from a seeded one-factor model instead:

```
r_i(t) = beta_i * r_market(t) + idiosyncratic_i(t)
```

That is not a shortcut. It is how equity returns actually decompose, and it is what makes the
correlation matrix and the "portfolio volatility versus the weighted average of its parts"
comparison measured rather than asserted. `tools/factor.mjs` validates the generator against the
closed form across 400 seeds.

**The Vault's source text.** The Vault indexes material published by
[Wyandanch Library](https://wyandanchlibrary.com/). That writing is theirs, and the site states
no licence - "open source finance education" is a tagline, not a grant - so this repository
catalogues it, orients you in it, and links to it. It does not reproduce it.

---

## Licence

Code is [MIT](LICENSE). The written educational content - lesson chips, study cards, check
questions, and the design doc - is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

"Chieftain" is the project's name. The licences grant no right to use the name or to present a
derivative as being Chieftain.

Typefaces are [Inter](https://github.com/rsms/inter) and
[IBM Plex Mono](https://github.com/IBM/plex), both SIL Open Font License.

---

**Simulation only.** Chieftain is not a broker-dealer or a registered investment adviser. It
gives no personalised advice, and nothing in it can be cashed out, traded, or redeemed for
anything of value. Simulated results do not predict real market performance.
