# CHIEFTAIN — design doc

> Learn why the house always wins. Then learn how investors do.

A browser game that teaches finance and markets using real casino mechanics. The casino is
the **villain the game teaches you to beat**, not the fantasy it sells you. Every table shows
its true RTP and house edge up front, and every edge in the game is a *real* cost —
fees, spread, inflation, taxes, vig — never a rigged RNG.

- Audience: young-adult self-learners, 18-30. Sold direct-to-consumer.
- Home: chieftainunit.com (replacing the Chieftain AI site; old site backed up to
  `C:\Users\chaca\chieftain-website-BACKUP-20260914-165818`).
- Stack: static HTML/CSS/JS, ES modules, no build step, deployed on the existing Netlify site.

## Why "Chieftain" and not "Casino ___"

Renamed from **HOUSE EDGE to Chieftain on 2026-09-22**, consolidating with the
chieftainunit.com brand it ships under.

Naming research is unambiguous: never put "Casino", "Slots", "Vegas", "Jackpot" or "Bet" in
the product name or store listing. 2025-26 brought a wave of state-AG suits against social
casino apps (Washington AG v. Playtika, a $24.9M jury verdict against High 5 Casino, NY AG
action on sweepstakes casinos), Apple flags "frequent or intense simulated gambling" as 17+,
and ad networks throttle fill on that inventory. "Chieftain" carries none of that risk and
matches the domain — it gives up the old name's double meaning, which is the one real cost.

**"House edge" remains the term of art throughout the product and must never be renamed.**
It is the thing every table teaches and it appears ~37 times in `src/`. Only the capitalised
product name changed. Any future find-and-replace on this phrase has to be case-sensitive.

Hard rules, adopted permanently:
1. No real money in, no cash-out, no transferable or tradeable currency, ever. The moment
   chips are redeemable the product is a sweepstakes casino and needs gambling licensing.
2. No near-miss dressing. Near-miss animation is the single mechanic most implicated in
   problem-gambling reinforcement, and it has no honest use here.
3. The house edge is always visible and always diegetic — it is a fee, a spread, or inflation
   the player can inspect, never a hidden weighted table.
4. Always show the counterfactual: what the boring, diversified, low-fee choice would have
   returned over the same draws.
5. Reward comprehension, not volume wagered. Progression gates on understanding.
6. "Educational purposes only." Not an RIA or broker-dealer. No personalized advice. No real
   company logos.

## The nine tables

Player-facing RTP and house-edge figures are the real ones, so the math the player learns is
the math that exists.

| # | Table | Casino form | Skill | RTP | House edge | Teaches |
|---|-------|-------------|-------|-----|-----------|---------|
| 1 | Sector Reels | Slots (reels/RNG) | Low | 94-97% | 3-6% | Diversification vs. concentration; expense ratios as the edge |
| 2 | The Sizing Table | Blackjack (cards) | High | 99%+ | 0.5-1% | Position sizing, Kelly criterion, betting bigger only with edge |
| 3 | The Wheel | Roulette (wheel) | Low | 94-97% | 2.7-5.4% | Idiosyncratic vs. systematic risk; the zero pocket is inflation |
| 4 | Two Hands | Baccarat (cards) | Low | 98-99% | 1-1.2% | Index fund vs. active fund vs. get-rich-quick, priced by fee drag |
| 5 | The Options Pit | Craps (dice) | Medium | 95-99% | 1-5% | Option payoffs; pass=call, don't pass=put, free odds=fairly priced |
| 6 | Number Chase | Bingo/Keno (lottery) | None | 70-95% | 5-30% | Lottery brain: penny stocks, meme stocks, 0DTE. Worst EV, best story |
| 7 | The Climb | Crash (multiplier/RNG) | Low | 96-99% | 1-4% | Compounding, exit discipline, bubbles, time in market vs. timing it |
| 8 | The Book | Live dealer | Medium | 96-99% | 1-4% | Market makers, bid-ask spread, who is on the other side of your trade |
| 9 | The Line | Sports/esports betting | High | 90-98% | 2-10% | Odds as implied probability; finding mispricing is fundamental analysis |

Build order is by animation payoff per unit of effort and by how cleanly the lesson lands:
**7 (The Climb) -> 1 (Sector Reels) -> 2 (The Sizing Table) -> 3 (The Wheel) -> 9 (The Line)
-> 4 -> 5 -> 6 -> 8.** The first five are built; 4, 5, 6 and 8 remain.

## Content tiers

Two distinct bodies of writing, deliberately separated:

- **Tier 1 — Chips (authored in-repo).** Short concept cards written for the game: expected
  value, variance, house edge, diversification, compounding, fees, loss aversion, the
  disposition effect. This is the "basics of finance" the game actually teaches, and it did
  not exist anywhere yet — it is written here.
- **Tier 2 — The Vault (scraped).** 86,210 words across 37 pages from wyandanchlibrary.com,
  in `content/wyandanch/`. This material is *advanced* — Menger, Graham, Damodaran, Soros,
  GARCH, factor models, microstructure. It is the wrong altitude for a beginner's first hour
  and the right altitude for the unlock tier behind each table. Re-run `scrape_wl.py` to refresh.

Open question flagged to the owner: wyandanchlibrary.com's prose is someone's original
writing. Using its *concepts and structure* is fine. Shipping its *sentences* inside a product
being sold is a copyright question, so Tier 2 is treated as a reading/reference layer with
attribution and links back to the source, not as copy to paste into lessons.

## Technical decisions (from research)

- No game engine. DOM + CSS for all text and UI, canvas only where motion demands it
  (the Climb curve, the reels). Phaser/Godot/Unity are the wrong cost-benefit here, and
  Godot 4 web export is currently broken on iOS/macOS Safari.
- GSAP became fully free for commercial use on 2025-04-30, all plugins included. Worth using
  for chip arcs, card flips and win timelines. Howler.js (MIT, ~7KB) for audio.
- Art: Kenney.nl is CC0 (playing-cards pack, 54-sound casino SFX pack) — zero cost, zero legal
  risk. Never ship CC-BY-NC in a product being sold. Maintain `CREDITS.txt` from day one.
- **No live market data.** Alpha Vantage, Finnhub, Polygon and Tiingo all forbid commercial use
  on their free tiers, and yfinance scrapes endpoints against Yahoo's ToS. Bundle a historical
  snapshot as static JSON and simulate paths from it. This also removes rate limits and cost.
- Save state: localStorage now; Supabase free tier only if cross-device sync or leaderboards
  are added later.
- Selling: Lemon Squeezy as merchant of record (5% + $0.50, handles VAT/sales tax in 100+
  countries, license-key API included). Treat license keys as a soft gate — client-side JS
  cannot be truly protected and hardening it is not worth the hours.

## Table 9 — The Line: the two decisions it is built around

Worth recording, because both were tuned against simulation rather than guessed.

**1. The edge is earned, and it is scarce.** Every read in the game is an estimate of a hidden
true probability, and the only thing that separates the three actors is how wrong they are:

| Estimator | Error (sd) | Note |
|---|---|---|
| The book | 2.8 pts | sharp, not perfect — this is where a real edge can hide |
| Your unresearched read | 8.5 pts | plus a 0.35 lean toward the underdog |
| Your researched read | 1.4 pts | sharper than the book. Two games a week, no more |
| The closing line | 1.4 pts | the best public forecast that will ever exist for that game |

Two research slots against five games is the whole argument: you can only beat a consensus
where you have done work the consensus has not. Simulated over 60k weeks, that produces
roughly **Sharp +3 to +8% ROI, Chalk −4.5%, gut-read bettor −4.6%** — and the gut bettor finds
four times as many "edges" as the sharp one, which is the trap the table is built to spring.
Crucially the gut read is *biased*, not merely noisy: an unbiased-but-noisy read comes out near
break-even because it catches genuine book error, which would have taught the wrong lesson.

**2. Unlike Table 3, the two sides do not cost the same.** The Wheel's lesson is that every bet
on the layout carries an identical −2.70%. The Line is the deliberate counterpoint: the markup
is loaded onto the underdog, scaled by how lopsided the game is, so a coin flip prices at a
symmetric −110/−110 while a longshot carries roughly twice the favourite's cost. That is the
**favourite-longshot bias**, it is real in every wagering market ever measured, and it is the
same appetite that prices lottery tickets, far OTM options and penny stocks.

Closing line value is surfaced as a first-class stat because it is the honest answer to "was
that a good decision or just a good outcome" — a researched bet beats the close ~94% of the
time, a gut bet ~53%, long before either shows up in the profit column.

## The Ladder — ten rungs of prestige

The learning system. Ten rungs, one content tier each; reaching rung ten means every concept in
the game has been read and its check passed.

**The loop, per rung.** Read the tier's cards (small bounty each) → pass the tier's check (the
bulk of the coins, plus the capability it unlocks) → close the remaining gap to the threshold at
the tables, using the edge the check just gave you → buy the rung, which **costs two thirds of
the bank**, so the next climb starts from a third of the height.

**Why the coins cannot come from grinding.** Every table is negative-expectation by design
(rule 3). Playing more loses more, as arithmetic, so a coin ladder is unreachable by persistence.
That is the feature: comprehension pays 55% of each threshold (45% check, 10% cards), and each
check unlocks a positive-expectation play. The residual ~31% has to be earned with that edge.
Tuned flat on purpose — every rung needs the bank to grow about 31%, roughly twenty well-sized
Index Mode spins, about 180 spins across the whole ladder. Difficulty escalates in the **checks**,
not the grind.

| Rung | Band | Threshold | Check pays | Unlocks |
|---|---|---|---|---|
| 1 What money is | basics | 1,500 | 675 | Index Mode at Sector Reels (RTP 107%) |
| 2 Time and interest | basics | 2,400 | 1,080 | Compounding hold |
| 3 Reading a candle | charts | 3,800 | 1,710 | The price chart |
| 4 Volume and scale | charts | 6,000 | 2,700 | Realized volatility |
| 5 What a chart cannot tell you | charts | 9,500 | 4,275 | Volatility-sized staking |
| 6 Value and margin of safety | advanced | 15,000 | 6,750 | 3rd research slot at The Line |
| 7 Valuation | advanced | 24,000 | 10,800 | Deep read 1.4 → 1.1 pts |
| 8 Reflexivity and cycles | advanced | 38,000 | 17,100 | 4th research slot |
| 9 Volatility and fat tails | advanced | 60,000 | 27,000 | Deep read 1.1 → 0.9 pts |
| 10 Factors and microstructure | advanced | 95,000 | 42,750 | The Desk — complete |

Note what the advanced rungs actually buy: **more attention, and a sharper estimate**. Learning
is literally the mechanic — rungs 6-9 widen The Line's research slots and tighten its researched
read error, so the edge the player earns is the edge they studied for.

**The checks are the gate.** All of a tier's cards must be read before the check may be sat. Pass
marks rise by band (70% basics, 75% charts, 80% advanced), the paper is dealt from a pool larger
than the draw with options shuffled, and attempts are counted and displayed — a rung passed on
the seventh try is a different fact than one passed first time. 73 questions across 10 pools,
each with a written explanation shown on the review screen whether you passed or not.

**Ruin.** A negative-expectation casino can take everything, and a player with nothing has no way
back onto the ladder. So `restake()` rebuilds a bank under 50 chips to 250, and the count is
recorded and shown. Not a free retry — a recorded one.

**Content split** (basics 2 / charts 3 / advanced 5, weighted to the advanced end): 38 concept
cards in `src/js/study.js`, distinct from the 46 gameplay-triggered chips in `lessons.js`. A chip
fires at the table at the moment a hand makes it obvious; a study card is read deliberately, in
order, and examined. Tiers 6-10 cover the same ground as `content/wyandanch/` — Graham,
Damodaran, Soros, Marks, Taleb, GARCH, factor models, microstructure — with the concepts credited
and every sentence written for this game.

**Chart literacy** (`src/js/chart.js`) draws from seeded generators, so a spec always produces the
identical chart and a check question about it is answerable. The underlying process is an honest
random walk with optional drift: there is no hand-drawn head-and-shoulders anywhere in the module,
because tier five's claim that the patterns are mostly in the reader is only true if the charts
really are coin flips. Nine chart kinds: annotated single candle, the four wick shapes, one series
at three timeframes, candles with volume/MA/gaps, linear-vs-log, drawdown comparison, twin random
walks, volatility clustering, and a fat-tail histogram against the normal curve.

## Table 4 — Two Hands: the edge you can never see

Built 2026-09-15. The tableau is real punto banco, verified against published eight-deck
probabilities over 3M simulated coups (banker 45.826% vs 45.860%, player 44.634% vs 44.625%,
tie 9.540% vs 9.516% — all inside 0.034%).

The table was designed around one claim and then **rebuilt when simulation showed the claim was
misleading.** The original framing was "Banker charges a visible 5% fee and still wins" — true in
expectation (−1.06% vs −1.24%), but the ensemble said something more important:

| coups | Banker finishes ahead of Player |
|---|---|
| 100 | 47.7% |
| 1,000 | 49.6% |
| 10,000 | 53.0% |
| 50,000 | 55.7% |
| 200,000 | 67.7% |

A 0.18 percentage-point edge needs roughly **a million hands** to become reliable. A player would
have seen Banker behind about half the time and learned the opposite of the intended lesson.

So the table now teaches the asymmetry instead, which is the better lesson: **Tie at −14.36% is
annihilated inside a few hundred coups, while a real 0.18% edge stays invisible for a lifetime.**
Large costs announce themselves; small ones never do — which is exactly why people cannot choose
financial products by looking at returns, and must choose on cost structure instead. The "Play
10,000 coups" panel makes this visceral: Tie dies every single run, Banker and Player keep
swapping places.

Two implementation notes worth keeping:
- The three shadow bankrolls stake a **share of their own bank**, not a flat unit. At a flat
  stake all three hit absorbing zero within a few thousand coups and the comparison stops
  teaching anything.
- `settle()` always has its stake taken off and its return added back. A tie push returns the
  stake exactly and nets to zero on its own; special-casing it credited a free unit on roughly
  one coup in ten.

## Tables 5, 6 and 8 — the last three

Built 2026-09-15. **All nine tables are now playable.**

### Table 5 — The Options Pit (craps)
The pass line is a long call, don't pass is a long put, and the free-odds bet behind either is
the only wager in any casino paid at exactly true odds. Verified over 2M sequences: free-odds EV
is **0.000000%** at every point, pass line lands on −1.421% against a theoretical −1.414%.

The lesson is dilution. The flat bet never gets cheaper, but spread across a position that is
mostly priced at fair value the blended cost collapses:

| position | total at risk | blended edge |
|---|---|---|
| pass only | 1.00 units | −1.414% |
| pass + 2× odds | 2.33 units | −0.606% |
| pass + 10× odds | 7.67 units | −0.184% |

Nothing improved; the expensive part got diluted. That is why the cost of a portfolio is its
weighted average rather than the cost of its worst holding — and why the casino *rations* the
free bet, since it only exists to make the marked-up bet in front of it attractive.

### Table 6 — Number Chase (keno)
Hypergeometric throughout; every distribution verified to sum to 1. Paytables were tuned so all
ten spot counts sit in a −24% to −28% band (the first draft put the 10-spot at −33.9%, outside
the design doc's 5-30% commitment).

The table's job is to print the two numbers that are never quoted together: the 10-spot jackpot
pays **100,000 to 1** and lands **once in 8,911,711** tickets — one a day for 24,416 years. It
contributes about **0.0112** of the ~0.73 returned per chip. The headline prize is the
advertisement, not the product.

### Table 8 — The Book (live dealer)
The only table where the player is the house. You quote a two-sided market on three dice (fair
value 10.5) and the crowd deals against you. Wider quotes earn more per trade and attract fewer
trades; ~22% of arriving flow is **informed** and only ever deals when it is right.

That makes the spread legible as what it actually is: not greed, but the minimum a liquidity
provider can survive on given that some counterparties know more than they do. It also explains
why spreads widen around news — that is when the informed share of flow peaks.

## The Sector Reels instrument — rungs 02-05 delivered

Built 2026-09-16. These four grants were **declared on the Ladder but wired to nothing**, so the
app was promising capabilities it did not have. All four now land on Sector Reels, which means
one table gets progressively richer as you climb rather than nine tables each gaining a trinket.

| Rung | Grant | What it actually does |
|---|---|---|
| 02 | Compounding hold | One click plays 10 spins without asking again — time in the market rather than ten decisions about it |
| 03 | The price chart | A real series of your bank across spins, via a new `series` kind in `chart.js` (the only kind that plots supplied data rather than generating it) |
| 04 | Realized volatility | Measured vol per spin and worst drawdown, computed from that series |
| 05 | Volatility-sized staking | Half-Kelly from the measured edge and variance, with one-click apply |

The order is deliberate and the dependency is real: you cannot size off a volatility you have not
measured, and you cannot measure one without a series to measure. A rung you have not bought shows
what it *would* add and points at the Ladder rather than hiding — the Ladder already told you it
exists, so being coy here would be silly.

**The honest refusal.** On the Casino Floor the edge is negative, and the sizer says so: Kelly
sizes a losing game at zero. There is no stake that makes a negative-expectation game worth
playing, which is the answer the formula gives and the one nobody wants. In Index Mode the edge
is positive and it offers a real fraction.

**Bug found by the test hanging.** The hold loop chained itself with `setTimeout`, and `unmount()`
did not clear it — so leaving the table mid-hold left it spinning against a torn-down DOM *and
charging the bank for it*. `unmount()` now cancels the timer and resets the counter, and
`instr.mjs` asserts that leaving mid-hold moves neither the spin count nor the bank.

## The Vault — a reading room, not a reprint

Built 2026-09-16 at `#/vault`, replacing the dead "Soon" item in the sidebar.

**The licence question, settled.** The scrape carries no licence anywhere — "Open Source Finance
Education" is a tagline on the site, not a grant, and a search of all 38 files turns up no CC,
MIT, public-domain or copyright terms at all. Absent an explicit licence the default is all
rights reserved, so reproducing 86,560 words of someone else's prose inside a product being sold
is a genuine exposure. This confirms the call the design doc made early.

**So what ships is the catalogue, not the content.** `src/js/vault-index.js` holds titles, source
URLs, word counts, section lists as a table of contents, and an orientation note for each piece
*written by us*. Every card links out; the words stay on their site. The scraped markdown remains
in `content/wyandanch/` as research, which is a different act from publishing it.

**Enforced by test, not by care.** `vaultt.mjs` samples distinctive passages from every scraped
file and asserts none appear anywhere in `src/js/` — 148 passages checked, 0 leaked. It also
asserts every entry links out, that all links point at the source domain with `rel=noopener`,
and that the attribution block names the source and states the text is not reproduced.

**Nothing is locked.** The Ladder gates capability because capability is the game; gating a
reading list would be theatre, and it is a public web page regardless. What the rung does is
*sort* the shelf — 38 texts tagged with the rung they pair with, filterable by "matched to your
rung", "reads ahead", or one of the four tracks (Fundamental 6, Macro 9, Practitioner 9,
Quantitative 14).

One entry, `growth-investing-principles`, is a failed scrape holding only a title. It is listed
with that stated plainly rather than quietly dropped.

## Mobile — verified, not assumed

Audited 2026-09-16. Until this point the app had **never been rendered below 1500px**. For a
direct-to-consumer product aimed at 18-30s that was the largest untested risk in the build.

**The first finding was that my first finding was wrong.** A 390px screenshot looked catastrophic
— headline clipped, text running off the edge — but measurement showed `VW=500`: headless Chrome
clamps to a 500px minimum window on Windows, so the image was a 500px render cropped into a 390px
canvas, not a layout failure. `--window-size` cannot test a phone at all.

**So the tooling had to change.** `scratchpad/mobile.mjs` drives Chrome over the DevTools protocol
and calls `Emulation.setDeviceMetricsOverride`, which sets the CSS viewport, device pixel ratio
and mobile flag independently of the OS window. Node 24 ships a global `WebSocket`, so it needs no
dependency. It reports, per route: viewport, scrollWidth, horizontal overflow, page height in
screens, every element exceeding the viewport (ignoring children of scroll containers), and every
tap target under 32px.

**At a true 390x844 the layout was already sound** — `overflow=0` on every route. The real
problems were size and reach, both measured rather than guessed:

| | before | after |
|---|---|---|
| `.back-link` (all nine tables) | 19px | 36px |
| `.rail-sub a` | 15px | 32px |
| `.kn-num` x80 (keno) | 28px, 10 cols | ~36px, 8 cols |
| `.ln-research` x5 | 25px | 34px |
| Vault page height | 19.9 screens | 13.7 |
| Floor page height | 7.6 screens | 7.4 |

WCAG 2.5.8 sets 24px as the AA floor, so most of those technically passed; 15px and 19px did not,
and none were comfortable. Every route now reports zero targets under 32px.

**Two mistakes worth keeping.** Adding `min-height: 34px` to a cell that already had
`aspect-ratio: 1` in a 10-column grid forced the keno board 21px wider than the viewport — the
fix was fewer columns, not a taller cell. And the phone block was first inserted in the middle of
the stylesheet, where the later base rules overrode it: media queries carry no specificity, so an
override block has to sit at the end. Both were caught by re-measuring after the change, not by
reading the CSS.

## Accessibility — audited, measured in a real engine

Audited 2026-09-16 with `scratchpad/a11y.mjs` and `scratchpad/focus.mjs`, both driving Chrome
over the DevTools protocol. Nothing here is a heuristic about what the CSS probably does:
contrast is computed against the colour actually painted behind the text, focus is tested with
real Tab keypresses, names come from the resolved accessible name.

**Three of the first four alarms were tooling artifacts, and checking mattered more than fixing.**

1. *"No focusable element anywhere has a visible focus style"* — 350 of them. False. `:focus-visible`
   does not reliably match a programmatic `.focus()`, so a scripted probe fails every control.
   Driving real `Input.dispatchKeyEvent` Tab presses shows **every stop has a ring**. Had I
   trusted the first reading I would have added redundant outlines to 350 controls.
2. *"Prize card text at 1.16:1"* — false. `.prize` is painted with a gradient, and
   `backgroundColor` reads transparent for gradients, so the probe walked past it to the dark
   panel behind. Computed against the real gradient the text is **4.71–8.13:1**. The audit now
   reads the first gradient stop.
3. The 390px "catastrophic mobile breakage" from the same session was the same class of mistake.

**What was genuinely broken, and is now fixed:**

| issue | before | after |
|---|---|---|
| `--ink-faint` on every surface | 2.97–3.91:1 | scale shifted up; 4.55:1 worst case |
| `.down` loss text (used `--red`) | 4.33:1 | `--red-lit`, 7.07:1 |
| `.prize-label` white at 0.8 on purple | 4.33:1 | opacity 0.92 |
| three `<canvas>` elements | no accessible name | `role="img"` + a description of what the text nearby says |
| heading outline on every table | jumped h1 → h3 | 53 section labels moved to `<h2>` |
| brand mark + 9 art SVGs | announced as unnamed images | `aria-hidden="true"` |

The muted scale is worth a note: the reference palette named one muted grey, `#8b8fa3`. Measured,
that value passes AA everywhere (4.55–5.99:1) but the tier *below* it did not, and that tier
carried nearly every label and caption in the app. So the scale shifted up one step — `#8b8fa3`
is now the faintest tier rather than the secondary one, and secondary moved to `#a3a9bd`.

**Result: 0 findings across all seven audited routes** — no contrast failures, no unnamed
controls, no heading jumps, no unlabelled canvases.

## The session arc — closing the play/learning loop

Built 2026-09-19. Before this, the learning spine and the game were joined in **one direction
only**: rungs granted capability via `hasUnlock()`, used in two of nine table modules. Nothing
at a table ever reported back. Seven of nine tables referenced the Ladder nowhere at all, and
the app's only next-action prompt lived in the right rail — which `main.js` suppresses on table
routes, so it was invisible precisely while the player was playing.

### What was built

**The chip→rung mapping** (`lessons.js`). Study cards, checks and Vault entries were all
rung-keyed; the 46 chips — the only content met during play — were keyed only by table. All 46
now carry a `rung`, with `rungOfChip()` / `chipsForRung()` / `seenForRung()` alongside. Rungs 3
and 4 own no chips: chart literacy has no table, and that gap is surfaced rather than papered
over by force-fitting.

**The signal** (`state.js`). `bumpRounds(table)` is called exactly once by all nine tables at
the end of every round — the one place the game already converged — so the hook went there
instead of into nine bespoke settle functions. `teach()` now calls `noteConcept()`, so a
concept is recorded when it is met rather than only rendered in a modal.

**The strip** (`strip.js`, rendered by `main.js` on every table route). Three facts the game
already knew and never told anyone: where you are on the Ladder, what the last hand
demonstrated and which rung checks it, and the single next step. The beat expands into the full
chip on tap — short in the flow, full on request, nothing deleted.

**The arc** (`session.js`). A sitting is stamped on first activity and goes stale after 45
minutes of no rounds. The floor opens with a suggested objective, and a returning player gets a
summary of what they just did. `tableForRung()` recommends a table by chip coverage minus table
number, so the build order is respected as a difficulty order — without that last term a rung-1
player was pointed at table 9.

### The constraint, and how it is enforced

House rule 2 has already cost this project a countdown widget and a fake activity feed. A
session records **up** and never counts down; the objective is a suggestion that never expires;
there is no streak anywhere. `session.mjs` scans five routes for deadline and streak language
on every run, so a future edit that drifts into urgency fails the suite rather than shipping.

### Defects fixed

| Defect | Was |
|---|---|
| Climb's chip cues keyed on the **global** round counter | 16 rounds elsewhere queued four modals on your first crash |
| `deVig` fired on the same slate as `theVig` | two modals stacked on the first slate |
| `cue()` skipped on the Index Mode unlock spin | the one spin that taught nothing else |
| Five tables opened a modal before the player had done anything | now earned by a completed round, as `lessons.js`'s own header always claimed |
| Floor bonus row hardcoded to `[1,2,3]`, art indexed past its array | rung-6 players saw claimed rewards and `undefined` art |
| `bustStreak` written every Climb round, read nowhere | removed |
| `whoIsAcross` / `t10adverse` shared 40 five-grams | chip rewritten as the table-moment version; **now 0** |

## The design system

Restyled 2026-09-15 from the original felt-and-brass look to a dark navy / electric-violet
crypto-gaming aesthetic. **Every colour, radius, shadow, glow and easing in the app resolves
through the `:root` block at the top of `src/styles.css`.** Change it there and the whole app
follows, canvas included.

No Tailwind. The committed stack is static HTML/CSS/JS with no build step, and adding a Tailwind
toolchain to get tokens would trade that away for something CSS custom properties already do.

| Role | Token | Value |
|---|---|---|
### Reference-matched palette (2026-09-15, second pass)

Values below are taken from a supplied reference screenshot and are not to be improvised on.
There is no Tailwind or shadcn in this project, so there is no framework default to fight — the
theme layer is the `:root` block in `styles.css` and every value resolves through it.

| Role | Token | Value |
|---|---|---|
| Ground | `--bg` | `#0a0f18` |
| Sidebar | `--side-bg` | `#10111c`, 220px |
| Cards | `--surface-1` / `--surface-2` | `#1c1f30` / `#181838` |
| Purple (primary, active) | `--grad-primary` | `#8228f0 → #8c5afa` |
| Orange (bonus, hot) | `--grad-hot` | `#fa6400 → #ff8c1a` |
| Indigo (hero) | `--grad-hero` | `#1e1e6e → #2a1b54` |
| Success pill | `--success` on `--success-bg` | `#22c55e` on `#0d2e20` |
| Text | `--ink` / `--ink-dim` | `#ffffff` / `#8b8fa3` |
| Radii | `--r` / `--r-lg` / `--r-pill` | 16 / 20 / 9999px |
| Borders | `--line` | `rgba(255,255,255,0.06)` |

**Artwork** is inline SVG (`src/js/art.js`): one scene per table plus a hero composition. Vector
rather than raster because it scales, costs no requests, carries no licence to track (house rule:
never ship CC-BY-NC in a product being sold), and recolours from each table's accent.

**Screenshot harness.** `scratchpad/shot.mjs` serves `src/` on an ephemeral port and drives
installed Chrome headless to a real PNG (`--headless=new --screenshot`). `file://` will not work
— the app is ES modules and module imports are blocked over that scheme. Two traps: Git Bash
rewrites a `#/route` argument into a Windows path unless `MSYS_NO_PATHCONV=1` is set, and
`DUMP=1` swaps the screenshot for `--dump-dom` when you need to confirm which page actually
rendered.

| Ground | `--bg` / `--bg-2` | `#0d0e17` / `#13141f`, with violet + ember radial blooms on `body` |
| Card surfaces | `--surface-1/2/3` | `#191a24`, `#1a1b2e`, `#22243a` |
| Hairline | `--line` / `--line-2` | `rgba(255,255,255,0.06)` / `0.10` |
| Primary | `--grad-primary` | `#7c3aed → #4f46e5` — buttons, active states, progress |
| Reward | `--grad-hot` | `#ff6b35 → #f7931e` — bonuses and payouts **only** |
| Success | `--success` | `#22c55e`, used for the live/open pill badges |
| Text | `--ink` / `--ink-dim` | `#f4f5fa` / `#8b8fa3` |
| Radii | `--r-sm/-r/-r-lg/-r-pill` | 12 / 16 / 20 / 9999px |
| Depth | `--shadow-md/-lg`, `--glow-accent` | soft ambient, violet glow on interactive lift |

Type is **Inter** (400–900) with JetBrains Mono kept for aligned figures; everything numeric
carries `font-variant-numeric: tabular-nums` so stats do not jitter as they update.

**Canvas reads the same tokens.** `src/js/theme.js` pulls the canonical custom properties off
`:root` once at load and hands them to the wheel, the reels, the Climb curve and the
candlestick engine as plain strings — canvas cannot resolve `var()` itself. It only reads the
canonical names, never the legacy aliases, because `getPropertyValue` returns an alias like
`--brass: var(--accent)` unresolved. Literal fallbacks cover the headless case.

**Legacy aliases.** `--brass`, `--felt`, `--green` and `--radius` survive as aliases onto the new
tokens, which is how several hundred older declarations rethemed without being rewritten one at a
time. New rules should use the semantic names.

**Components** (`.badge`, `.prize`, `.cd-block`, `.feed-*`, `.hero-cta`) are defined once and
reused across the floor, the Ladder and the table pages.

Two places where the spec was deliberately not followed literally:

- **No countdown timers.** The `.countdown` / `.cd-block` component is built exactly to spec
  (four rounded blocks, big numeral, small label) but nothing in the app counts down. Inventing a
  timer would be manufactured urgency, which is the retention mechanic house rule 2 exists to ban.
  The blocks carry real standing figures instead — rung, concepts read, checks passed, rounds.
- **No fake live feed.** The right rail shows a scrolling activity list with circular avatars as
  specified, but every row is a hand *this* player actually played, merged round-robin from the
  per-table histories. There are no other players — the game is single-player localStorage — so
  a feed of other people's wins would be fabricated social proof.

## Status

- [x] Research: casino mechanics, tech stack, market/legal
- [x] Content pipeline: 37 pages scraped to markdown + index
- [x] Design doc, table taxonomy, house rules
- [x] The Floor (hub) with all nine tables and their real odds
- [x] Table 7 — The Climb, playable
- [x] Table 1 — Sector Reels, playable
- [x] Table 2 — The Sizing Table, playable
- [x] Table 3 — The Wheel, playable
- [x] Table 9 — The Line, playable
- [x] Tier 1 lesson bank — 26 gameplay chips
- [x] The Ladder — 10-rung prestige system, 38 study cards, 73 check questions
- [x] Chart literacy engine (seeded candlesticks, volume, log scale, drawdown, fat tails)
- [x] Unlock wiring: Index Mode (rung 1), Line research slots and read sharpness (rungs 6-9)
- [x] Visual restyle — navy/violet token system across every page and canvas
- [x] Unlock wiring for rungs 2-5 — the Sector Reels instrument panel
- [x] Table 4 — Two Hands, playable
- [x] Table 5 — The Options Pit, playable
- [x] Table 6 — Number Chase, playable
- [x] Table 8 — The Book, playable
- [x] **All nine tables playable**
- [ ] Audio pass (Howler + Kenney SFX)
- [x] Vault reader — catalogue + attribution + deep links
- [ ] Deploy to chieftainunit.com
- [ ] Lemon Squeezy paywall
