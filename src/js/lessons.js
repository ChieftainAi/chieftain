// Tier 1 content — "Chips". Short, written for a beginner, fired by something the player
// just did rather than handed over as a wall of text up front. Each one names a real concept
// so the vocabulary transfers to the actual world.
import { noteConcept } from "./state.js";

export const CHIPS = {
  houseEdge: {
    rung: 1,
    title: "The house edge is a fee",
    body: `
      <p>This table pays back <strong>98%</strong> of everything wagered over the long run. The
      missing 2% is the house edge, and here it is not hidden in the machine — it is the same
      2% a bad mutual fund takes off the top of your money every single year.</p>
      <p class="math">Expected value = 0.98 × (what you wagered)</p>
      <p>You can play perfectly and still bleed 2% a round. The only winning move against a fee
      is <strong>paying a smaller one</strong>. That is the entire argument for index funds,
      and you just met it at a crash table.</p>`,
  },
  sameEV: {
    rung: 5,
    title: "Greed does not change your expected value",
    body: `
      <p>Cash out at 1.10× or hold for 50× — the maths of this table are built so that
      <strong>every exit point has the identical expected value</strong>. The chance of reaching
      a big multiplier falls exactly as fast as the payout rises.</p>
      <p class="math">P(reach 2×) × 2 = P(reach 10×) × 10 = 0.98</p>
      <p>So if the average outcome is the same everywhere, what actually changes when you get
      greedy? <strong>Variance.</strong> Not your return — your survival.</p>`,
  },
  volDrag: {
    rung: 2,
    title: "Volatility drag: why the boring line wins",
    body: `
      <p>Here is the thing that breaks most people's intuition about markets. When you
      <strong>compound</strong> a bankroll, you do not earn the average return. You earn the
      geometric one, and volatility eats the difference.</p>
      <p class="math">+50% then −50% is not 0%. It is −25%.</p>
      <p>That is why the disciplined line in the panel beside you pulls ahead of the moonshot
      line even though both have the same expected value per round. Big swings destroy compounding.
      The real name for this is <strong>volatility drag</strong>, and it is the most under-appreciated
      force in investing.</p>`,
  },
  ruin: {
    rung: 5,
    title: "Risk of ruin",
    body: `
      <p>You just took a real hit. Notice something: a 50% loss needs a 100% gain to undo it.
      Losses are not symmetric with wins, and a bankroll that reaches zero has an expected
      future return of <strong>exactly zero forever</strong>, no matter how good your strategy was.</p>
      <p class="math">Survive first. Compound second.</p>
      <p>Professional traders size positions around <strong>risk of ruin</strong>, not around how
      good they feel about the trade. Staking a quarter of your stack on one round is how a
      positive expected value still ends in zero.</p>`,
  },
  lossAversion: {
    rung: 8,
    title: "That felt worse than winning felt good",
    body: `
      <p>Losing 100 chips hurts roughly <strong>twice as much</strong> as winning 100 chips feels
      good. That asymmetry is not a personal failing, it is measured human wiring — Kahneman and
      Tversky won a Nobel for describing it, and they called it <strong>loss aversion</strong>.</p>
      <p>It is also the number one reason ordinary investors underperform the funds they own.
      They panic-sell at the bottom, because the pain of a paper loss is so much louder than the
      pleasure of the eventual recovery.</p>
      <p>The fix is not to feel less. It is to <strong>decide your exit before you are in the
      trade</strong> — which is exactly what the auto-cashout field beside you is for.</p>`,
  },
  wheelEV: {
    rung: 1,
    title: "Every bet on this layout is the same bet",
    body: `
      <p>Look at the edge column on your board. A single number paying 35:1 and an even-money bet
      on red have the <strong>identical</strong> expected value: −2.70%. Not similar. Identical, to
      four decimal places.</p>
      <p class="math">straight: 1/37 × 35 − 36/37 = −2.70%
red:      18/37 × 1 − 19/37 = −2.70%</p>
      <p>The payouts are calculated as though 36 pockets existed. Thirty-seven do. That is the only
      trick in the game, and it applies evenly to everything.</p>
      <p>So what <em>does</em> change? The last column. Volatility runs from 1.00× on red to
      <strong>5.84×</strong> on a single number. Same expectation, six times the swing — and that
      is the exact trade you make choosing one stock over an index fund.</p>`,
  },
  theZero: {
    rung: 2,
    title: "The green zero is inflation",
    body: `
      <p>One pocket in thirty-seven. It pays nothing to almost everybody, and it is where 100% of
      the casino's money comes from. Remove it and roulette becomes a perfectly fair game.</p>
      <p class="math">house edge = 1 ÷ 37 = 2.70%</p>
      <p>Your savings account has one too. At <strong>3% inflation</strong>, money sitting in cash
      loses about that much purchasing power every year — quietly, with no statement line item,
      whether or not you ever place a bet. It is the closest thing in real finance to a green
      pocket, and the only way to beat it is to own something that grows faster than it.</p>
      <p>Note what that means: <strong>not playing is also a bet</strong>, and it has a house edge too.</p>`,
  },
  concentration: {
    rung: 9,
    title: "Two pockets out of thirty-seven",
    body: `
      <p>You have almost the whole wheel uncovered. Your expected value is exactly the same as
      somebody covering eighteen pockets — but your outcome distribution is nothing alike. You will
      mostly lose, occasionally win enormously, and your bankroll will look like a cliff face.</p>
      <p class="math">P(win) = 2/37 = 5.4%, payout 35:1</p>
      <p>This is the mathematical shape of a portfolio holding one or two speculative positions. The
      lottery-ticket feeling is real and so is the arithmetic: <strong>concentration buys you
      variance, and variance is not a reward</strong>. You are not being paid extra for taking it.</p>`,
  },
  bjBasics: {
    rung: 5,
    title: "This one is solved",
    body: `
      <p>Blackjack is the only game in the building with a <strong>correct answer</strong>. For
      every combination of your hand and the dealer's up card, one action has the highest expected
      value, and it has been computed exhaustively. That is basic strategy, and playing it takes
      the house edge down to about <strong>0.52%</strong>.</p>
      <p class="math">the dealer has no choices at all — draw to 17, then stop</p>
      <p>Hit "Show the book" any time you want to see the right play. Using it is not cheating,
      because there is nothing to intuit. The lesson is that <strong>some decisions are research
      problems, not gut problems</strong> — and in markets as at this table, the people who look up
      the answer beat the people who feel it out.</p>`,
  },
  kelly: {
    rung: 5,
    title: "The count tells you how much to bet",
    body: `
      <p>Every low card that leaves the shoe makes the remaining deck richer in tens and aces,
      which favours <em>you</em>. That is what the true count measures, and each point above +1 is
      worth roughly half a percent of edge.</p>
      <p class="math">edge ≈ (true count − 1) × 0.5%
Kelly stake = edge ÷ variance × bankroll</p>
      <p>This is the <strong>Kelly criterion</strong>, and it is the answer to the question almost
      nobody asks: not <em>what</em> to bet on, but <em>how much</em>. Bet more than Kelly and
      volatility eats you even while you are right. Bet less and you leave growth on the table.</p>
      <p>Same idea, outside the casino: a real edge you size at 1% of your portfolio makes you
      nothing, and a thin edge you size at 50% eventually ruins you.</p>`,
  },
  missedEdge: {
    rung: 6,
    title: "You had the edge and bet small",
    body: `
      <p>The true count was above +2.5 on that hand. The deck was genuinely in your favour — a real,
      measurable, positive expectation — and you wagered the table minimum.</p>
      <p>This is the most common and most expensive mistake there is, and it is not a gambling
      mistake. Professional investors describe it the same way: the returns come from a small
      number of high-conviction moments, and <strong>the whole game is being sized properly when
      one arrives</strong>.</p>
      <p class="math">a 2% edge bet at 1% of bankroll earns 0.02% — nothing</p>`,
  },
  varianceVsEdge: {
    rung: 9,
    title: "Edge is slow. Variance is loud.",
    body: `
      <p>Ten hands in, your bankroll is telling you almost nothing about whether you are playing
      well. A 0.5% edge is buried under swings many times its size, and it takes
      <strong>thousands</strong> of hands for skill to surface through the noise.</p>
      <p class="math">signal grows with n · noise grows with √n</p>
      <p>That ratio is why a bad investor can look brilliant for two years and a good one can look
      broken for the same stretch. Short-run results are mostly variance. Judge the
      <strong>process</strong>, because you can see it immediately, and it is the only part you
      control.</p>`,
  },
  insurance: {
    rung: 6,
    title: "Insurance is a bad bet (usually)",
    body: `
      <p>Insurance pays 2:1 that the dealer's hole card is a ten. For it to be worth taking, more
      than a third of the remaining cards must be tens — and in a neutral shoe only about
      <strong>30.8%</strong> are. So the bet carries roughly a 6% house edge and the book says
      decline.</p>
      <p class="math">take insurance only when the true count is +3 or higher</p>
      <p>Note what that means: it is not "never". It is <strong>a bad bet at a normal price that
      becomes a good bet at the right one</strong>. Which is the entire discipline of value
      investing, compressed into one side bet.</p>`,
  },
  reelsIntro: {
    rung: 1,
    title: "The reels are sectors, not cherries",
    body: `
      <p>Nothing on this machine is a symbol paytable. Each reel lands on a real market sector and
      draws a <strong>real return</strong> from that sector's own volatility. Your payout is the
      plain average of the reels you covered.</p>
      <p class="math">payout = stake × (1 + average return) − fee</p>
      <p>Which means covering more reels does not raise your expected return by one chip. It only
      changes <strong>how far from average</strong> any single spin can land.</p>`,
  },
  diversification: {
    rung: 9,
    title: "Why five reels is calmer than one",
    body: `
      <p>You just bet everything on a single sector. The expected return is identical to covering
      all five — but the <strong>swing</strong> is not, and there is a formula for exactly how much
      calmer the average of several independent bets is.</p>
      <p class="math">volatility of the average = volatility ÷ √n</p>
      <p>Two reels cuts the swing by 29%. Three by 42%. Five by 55%. That square root is the entire
      mathematical case for diversification, and it is free — <strong>you give up no expected
      return to get it</strong>. There is nothing else in finance that trades this well.</p>`,
  },
  correlation: {
    rung: 9,
    title: "Correlated — your diversification did not happen",
    body: `
      <p>Three or more of your covered reels landed on the <strong>same sector</strong>. You thought
      you held a basket. You actually held one bet three times, so the swing got amplified instead
      of smoothed.</p>
      <p>This is <strong>correlation</strong>, and it is why "I own twelve stocks" is not the same
      as being diversified. If all twelve are tech, you own one position wearing twelve name tags.
      In 2008 a great many people discovered that everything they held was really the same bet.</p>
      <p class="math">diversification needs independence, not just quantity</p>`,
  },
  feeDrag: {
    rung: 2,
    title: "Index Mode: two numbers changed",
    body: `
      <p>You have unlocked the same machine with two different numbers. The reels, the code and the
      randomness are all identical. Only the <strong>fee</strong> and the <strong>drift</strong>
      move:</p>
      <p class="math">Casino Floor : 4.50% fee, 0% drift → RTP 95.5%
Index Mode   : 0.03% fee, +7% drift → RTP 107%</p>
      <p>That is the whole difference between a slot machine and the stock market. One is a
      negative-expectation game with a big fee. The other is a <strong>positive-expectation</strong>
      game with a tiny one. Go flip the switch and watch the same machine stop taking your money.</p>
      <p>And note what the fee panel has been telling you the entire time — the boring low-fee line
      is not winning because it is lucky. It is winning because it is <strong>cheap</strong>.</p>`,
  },
  dispositionEffect: {
    rung: 8,
    title: "The disposition effect",
    body: `
      <p>Watch your own pattern in the ledger. Most players cash out fast when the number is
      climbing nicely, and hold on far too long when they are behind and trying to get back to even.</p>
      <p>That is the <strong>disposition effect</strong>: selling winners too early and riding
      losers too long. It is one of the most robust findings in behavioural finance, and it shows
      up in real brokerage data across every market that has ever been studied.</p>
      <p>Getting back to even is not a strategy. The chips do not know what you paid for them.</p>`,
  },
  impliedProb: {
    rung: 1,
    title: "Every price is a probability in disguise",
    body: `
      <p>A price of <strong>&minus;140</strong> is not a number about money. It is a number about
      belief. Risk 140 to win 100 and you only break even if that side wins often enough to cover
      it &mdash; and there is one arithmetic that tells you how often.</p>
      <p class="math">negative odds: prob = odds &divide; (odds + 100)  &rarr;  140 &divide; 240 = 58.3%
positive odds: prob = 100 &divide; (odds + 100)  &rarr;  100 &divide; 260 = 38.5%</p>
      <p>That percentage is the <strong>break-even win rate</strong>. At &minus;110, the standard
      price on both sides of almost every market, it is <strong>52.38%</strong>. You must be right
      more than half the time simply to stand still.</p>
      <p>A stock price works the same way. It is the market's forecast written as a number, and the
      only reason to buy is that you think the forecast is wrong.</p>`,
  },
  theVig: {
    rung: 1,
    title: "Add up both sides. It is more than 100%.",
    body: `
      <p>Look at the overround strip on the board. The two sides of a market cannot both be
      favourites, so their probabilities must add to exactly 100% &mdash; and the posted prices
      always add to <em>more</em>.</p>
      <p class="math">-110 and -110  &rarr;  52.38% + 52.38% = 104.76%</p>
      <p>That extra 4.76% is the <strong>overround</strong>, and the slice of your money it removes
      is the <strong>hold</strong>, here 4.55%. It is the same object as the green zero on the
      roulette wheel and the expense ratio on a fund: a fee, taken off the top, whoever wins.</p>
      <p>It is also why a coin-flip bettor does not break even. They lose 4.55% of everything they
      put through, forever, and they never see a single rigged event.</p>`,
  },
  deVig: {
    rung: 8,
    title: "De-vig the line to find what the market believes",
    body: `
      <p>The posted price is not the market's real opinion &mdash; it is the opinion <em>plus the
      fee</em>. Strip the fee by dividing each side by the total, and what is left is the number
      the market actually holds.</p>
      <p class="math">52.4% &divide; 104.76% = 50.0%    (the true line is a coin flip)</p>
      <p>That de-vigged number is your opponent. Not the bookmaker &mdash; the <strong>consensus of
      everyone who has already bet</strong>, which is a very well-informed thing to argue with.</p>
      <p>The same move exists in investing. A share price already contains every forecast the
      market has. Buying it is a claim that your number is better than that consensus, and most of
      the time, for most people, it simply is not.</p>`,
  },
  gutRead: {
    rung: 6,
    title: "Your error bar is wider than your edge",
    body: `
      <p>You just bet a game you did not research. Look at the width of the band on that read: an
      unresearched estimate is off by about <strong>8.5 points</strong> either way. The market's is
      off by <strong>2.8</strong>.</p>
      <p class="math">your noise 8.5%   market noise 2.8%   the fee ~4.5%</p>
      <p>When your instrument is blunter than the thing you are measuring, the "edge" on screen is
      mostly your own measurement error wearing a costume. You will find 5% edges everywhere. They
      are not there, and you pay the vig on every one of them.</p>
      <p>Worse, the error is not even centred. Like everybody's, your untrained read
      <strong>leans toward the underdog</strong> &mdash; into a board that already charges extra for
      that exact side.</p>`,
  },
  circleOfCompetence: {
    rung: 6,
    title: "You get two. That is the whole game.",
    body: `
      <p>Five games, two research slots. That constraint is not a difficulty setting &mdash; it is
      the actual shape of the problem. Nobody knows more than the market about everything. Some
      people know more than the market about <strong>two things</strong>.</p>
      <p class="math">edge = what you know &minus; what is already in the price</p>
      <p>On a researched game your read is sharper than the book's and the edge is real. On the
      other three you are the tourist, and betting them hands back exactly what the two good bets
      earned you.</p>
      <p>Buffett calls this the <strong>circle of competence</strong>, and the point he keeps
      making is not how big yours is. It is knowing where the edge of it runs.</p>`,
  },
  clvChip: {
    rung: 8,
    title: "Closing line value: the score that is not the score",
    body: `
      <p>You took a price. Then the market moved, and closed somewhere else. If it closed
      <em>shorter</em> than the price you got, you bought something the rest of the market later
      agreed was worth more &mdash; and that is true whether or not the game went your way.</p>
      <p class="math">you took +130, it closed +110  &rarr;  you beat the close</p>
      <p>The closing line is the best public forecast that will ever exist for that event. Beating
      it consistently is the only known way to prove skill over a sample too short for profit to
      mean anything. Professionals track it above win rate, above profit.</p>
      <p>It is the honest answer to a question that haunts investing: <strong>was that a good
      decision, or just a good outcome?</strong></p>`,
  },
  outcomeBias: {
    rung: 8,
    title: "You were right and you still lost",
    body: `
      <p>A bet with a real 6% edge still loses about <strong>47 times in 100</strong>. You just met
      one of those. Nothing went wrong, and there is nothing to fix.</p>
      <p>The instinct now is to change something &mdash; the process, the stake, the read. That
      instinct is <strong>outcome bias</strong>: judging a decision by its result rather than by
      what was knowable when it was made. It is how good investors talk themselves out of good
      strategies during the losing stretch that every good strategy contains.</p>
      <p class="math">a 55% edge loses four in a row about 4% of the time</p>
      <p>Keep the ledger on process. The chips will catch up or they will not, but the process is
      the only part you control.</p>`,
  },
  favLongshot: {
    rung: 8,
    title: "The longshot is never worth it",
    body: `
      <p>You just took a long price. Check the last column of the arithmetic table: on this board
      the two sides of the same market <strong>do not cost the same</strong>. The favourite is
      priced near fair. The underdog carries most of the markup.</p>
      <p class="math">-160 costs you ~3.6%   its +135 partner costs ~5.4%</p>
      <p>That is not a quirk of this table. It is the <strong>favourite-longshot bias</strong>, and
      it turns up in every wagering market anyone has ever measured, because people reliably
      overpay for a small chance at a big payout. The book simply charges for what it knows you
      want.</p>
      <p>Lottery tickets, far out-of-the-money options and penny stocks are all priced by the same
      appetite. <strong>The story is priced. The probability is not.</strong></p>`,
  },
  bacNoDecisions: {
    rung: 1,
    title: "Nobody at this table decides anything",
    body: `
      <p>Look at what you are actually allowed to do here. You pick one of three bets, and then
      the cards come out under rules so rigid that the dealer is not permitted to think. Whether a
      third card is drawn is decided by a table printed on the felt.</p>
      <p>That is not a flaw in the game — it is why this table is in the building. Every other
      table asks how well you play. <strong>This one only asks which product you bought.</strong></p>
      <p class="math">no skill, no decisions, no recovery — only the choice you made up front</p>
      <p>Which is very close to the truth about most people's investing. You will not out-trade
      anybody. You will choose a fund, and then live inside its costs for thirty years.</p>`,
  },
  theCommission: {
    rung: 2,
    title: "The bet that charges a fee is the best bet here",
    body: `
      <p>Banker wins more often than Player — 45.86% against 44.62% — because the tableau lets the
      banker hand react to what the player hand drew. The house claws that advantage back with an
      itemised <strong>5% commission</strong> on winning Banker bets.</p>
      <p class="math">Banker  0.4586 × 0.95 − 0.4462 = −1.06%
Player  0.4462 − 0.4586      = −1.24%</p>
      <p>Even after the fee, Banker is the cheaper product. The fee is <em>visible</em>, which
      makes it feel expensive, while Player's disadvantage is buried in the drawing rules where
      nobody has to look at it.</p>
      <p>This is the exact mistake people make with funds: comparing expense ratios instead of
      comparing <strong>returns after every cost</strong>. A visible fee is not the same thing as
      a high cost, and a product with no stated fee is not free.</p>`,
  },
  tieTrap: {
    rung: 8,
    title: "8 to 1 on a one-in-ten shot",
    body: `
      <p>Tie pays <strong>8 to 1</strong> and lands about <strong>one coup in ten and a half</strong>.
      Put those two numbers next to each other and the bet falls apart.</p>
      <p class="math">0.0952 × 8 − 0.9048 = −14.36%</p>
      <p>That is fourteen times worse than the bet sitting next to it, and it is the worst number
      on any table in this building — worse than the slot machine, worse than a single number on
      the roulette wheel.</p>
      <p>It survives because 8:1 sounds like an opportunity and "one in ten and a half" never gets
      said out loud. Every get-rich-quick pitch you will ever hear has this structure:
      <strong>the payout is quoted, the probability is not.</strong></p>`,
  },
  beadPlate: {
    rung: 5,
    title: "The house gives you the scorecard for free",
    body: `
      <p>Real baccarat tables print a grid of past results and hand you a pencil. Players fill them
      in religiously, looking for the streak, the chop, the pattern that tells them what is next.</p>
      <p>Each coup is dealt from a shuffled shoe and is <strong>independent of every coup before
      it</strong>. The streaks on that board are genuinely there and they mean genuinely nothing —
      independent events produce runs, and runs look like signal to a pattern-matching animal.</p>
      <p class="math">P(banker next) = 45.86%, whatever the last ten were</p>
      <p>Ask why the casino supplies the paper. It is not a courtesy. A player hunting a pattern is
      a player still sitting down, and the edge collects on every hand they stay for.</p>`,
  },
  netOfFees: {
    rung: 2,
    title: "Net of costs is the only number",
    body: `
      <p>You have now paid real, itemised commission on this table. Whether the Banker line happens
      to be ahead right now is noise — but in <em>expectation</em> it is ahead, by roughly 0.18% of
      everything staked, permanently.</p>
      <p class="math">the question is never "what is the fee"
it is "what is left after every cost"</p>
      <p>Two funds, one charging 0.9% and one charging 0.1%, are not automatically ranked by that
      number. Trading costs, tax drag, cash held idle and tracking error all sit outside the
      headline fee, and any of them can be larger than it.</p>
      <p>The Sector Reels machine taught you that a fee compounds against you, which is true. This
      table is the other half of that sentence: <strong>a fee is one cost among several, and the
      cheapest-looking product is not always the cheapest one.</strong></p>`,
  },
  theLongRun: {
    rung: 9,
    title: "A real edge you will never see",
    body: `
      <p>Banker is the better product by <strong>0.18 percentage points</strong>. That is not a
      rounding error — it is the whole reason professionals prefer it. And you will never once
      observe it.</p>
      <p class="math">after     1,000 coups: Banker ahead ~50% of the time
after   200,000 coups: Banker ahead ~68% of the time
you need about a MILLION hands for it to be reliable</p>
      <p>Meanwhile Tie, at &minus;14.36%, is annihilated inside a few hundred. Large costs announce
      themselves. Small ones never do.</p>
      <p>That asymmetry is one of the most consequential facts in personal finance. The differences
      between funds, brokers and strategies that actually determine your outcome over thirty years
      are mostly <strong>too small to detect in your own results</strong> — which is precisely why
      people choose on stories, recent performance, and how the fee is worded.</p>
      <p><strong>You cannot pick by looking at returns. You have to pick by understanding the
      cost structure.</strong> That is the entire table.</p>`,
  },

  passIsACall: {
    rung: 7,
    title: "The pass line is a call option",
    body: `
      <p>Strip the felt off and look at the shape. You put money down, a number becomes your
      strike, and you win if that number arrives before the seven. Your loss is capped at what you
      staked. Your payoff only turns on above the strike.</p>
      <p class="math">long call: limited loss, asymmetric payoff, a strike, and an expiry</p>
      <p>That is an option, exactly. Don't pass is the same object pointed the other way — a
      <strong>put</strong>, which pays when the crash arrives first.</p>
      <p>Neither is exotic and neither needs a formula. An option is just a bet whose downside is
      capped and whose upside is not, and this table has been selling them for four hundred years.</p>`,
  },
  dontIsAPut: {
    rung: 7,
    title: "Somebody is always on the other side",
    body: `
      <p>Pass and don't pass are the two sides of the same event. When you buy one, someone is
      selling it — and at this table the house is happy to take either, because it charges both.</p>
      <p class="math">pass −1.41%   don't pass −1.36%   and one of them must win</p>
      <p>Two bets on opposite outcomes, both with negative expected value. That is not a paradox,
      it is what a <strong>spread</strong> is: the house is not betting against you, it is charging
      both sides for the privilege of having the position.</p>
      <p>Table eight is built entirely on this idea, and it is how every market maker in the world
      earns a living.</p>`,
  },
  freeOdds: {
    rung: 7,
    title: "The only fairly priced bet in the building",
    body: `
      <p>You just backed your line with <strong>free odds</strong>, and it is worth understanding
      how unusual that is. The point 6 repeats before a seven 45.45% of the time. The odds bet on
      it pays <strong>6 to 5</strong>. Work it out:</p>
      <p class="math">0.4545 × 1.2 − 0.5455 = 0.0000</p>
      <p>Zero. Not "low". Not "competitive". <strong>Exactly zero</strong>, at every point, to as
      many decimals as you care to compute. The house takes nothing.</p>
      <p>This is what a derivative priced at fair value looks like, and almost nothing you will
      ever be sold resembles it. It is also why casinos cap how much of it you may take — they
      cannot make money on it, they only allow it to sell you the marked-up bet in front of it.</p>`,
  },
  dilution: {
    rung: 7,
    title: "The expensive part got diluted, not cheaper",
    body: `
      <p>Look at what happened to the blended number as you took odds. The pass line alone costs
      <strong>1.41%</strong>. Backed with ten times odds it costs <strong>0.18%</strong> — eight
      times less.</p>
      <p class="math">1.414% ÷ (1 + 10 × 0.667) = 0.184%</p>
      <p>Nothing about the flat bet improved. It still carries the identical markup it always did.
      What changed is that most of your position is now the thing priced at fair value, so the fee
      is spread across a much larger holding.</p>
      <p>This is the single most useful idea at this table. The cost of a portfolio is not the cost
      of its most expensive piece — it is the <strong>weighted average</strong>. Which is why a
      small expensive holding beside a large cheap one is survivable, and why paying a wrapper fee
      on your entire net worth is not.</p>`,
  },
  freeIsNotCheap: {
    rung: 10,
    title: "Why the free bet is rationed",
    body: `
      <p>Ask the obvious question: if the odds bet is free, why can you only take three to five
      times your line? Why not a thousand?</p>
      <p>Because the house earns nothing on it. The free odds bet exists to make the
      <em>marked-up</em> bet in front of it attractive — it is a loss-leader, and the ratio is set
      precisely so the blended edge stays high enough to pay for the room.</p>
      <p class="math">you may buy the fair thing only in proportion to the unfair thing</p>
      <p>Financial products are bundled the same way. The cheap index tracker sits inside the
      platform that charges a percentage; the zero-commission trade is paid for by the spread you
      cannot see. <strong>When something is free, find what it is attached to.</strong></p>`,
  },

  chaseIntro: {
    rung: 1,
    title: "Eighty numbers, twenty drawn",
    body: `
      <p>Every prize on this board is real and every probability beside it is real. This table
      shows you both, which is the only thing separating it from the version sold in petrol
      stations.</p>
      <p class="math">house edge here: 24% to 28%
house edge at the blackjack table: 0.5%</p>
      <p>You are about to stake money at roughly <strong>fifty times</strong> the cost of the worst
      bet at any other table in this building. The game will feel more exciting than any of them.
      Notice that those two facts are related.</p>`,
  },
  quotedAndUnquoted: {
    rung: 8,
    title: "One number is quoted. The other never is.",
    body: `
      <p>Look at the headline panel. A ten-spot jackpot pays <strong>100,000 to 1</strong> and
      lands <strong>once in 8.9 million</strong> tickets. One a day is twenty-four thousand years.</p>
      <p class="math">100,000 × 0.000000112 = 0.0112 per chip</p>
      <p>The biggest number on the board contributes about <strong>one penny</strong> of the
      seventy-odd you get back. It is not the prize, it is the advertisement.</p>
      <p>Every lottery, every 0DTE call, every "this could 100x" pitch runs on the same omission:
      <strong>the payout is quoted and the probability is not.</strong> You now have a table that
      always prints both.</p>`,
  },
  lotteryBrain: {
    rung: 8,
    title: "Why this feels better than it is",
    body: `
      <p>You have lost repeatedly and it does not feel like losing, because a keno ticket pays out
      <em>something</em> often enough to keep the sensation of winning alive while the balance
      falls.</p>
      <p>That is deliberate design, and the industry name for it is a <strong>loss disguised as a
      win</strong> — a return of less than your stake, delivered with the full ceremony of a
      payout. A 3-for-1 on a ticket you bought for 4 is a loss with a fanfare.</p>
      <p class="math">frequent small "wins" + one enormous story = maximum time at the table</p>
      <p>Penny stocks and meme tickers work the same way. The small green days keep you in
      position for the one large red one, and the story about the 100x is doing all of the work.</p>`,
  },
  chaseVsBoring: {
    rung: 2,
    title: "The boring line is not slower. It is the only one going up.",
    body: `
      <p>Compare the two lines. One stakes the same money on a ticket every draw at a 26% edge;
      the other puts it in a broad, cheap basket with a small positive drift.</p>
      <p class="math">−26% per ticket   vs   +0.02% per day, compounding</p>
      <p>These are not two speeds of the same thing. They are opposite signs. One converges to
      zero with certainty and the other does not, and no run of luck changes which is which.</p>
      <p>The chase is not a faster route to the same place. <strong>It is a different
      destination.</strong></p>`,
  },

  youAreTheHouse: {
    rung: 10,
    title: "For once, you are the one quoting",
    body: `
      <p>At every other table you took a price somebody else set. Here you set it, and immediately
      the problem changes shape.</p>
      <p>Quote a wide market and you earn well on each trade, but hardly anyone deals with you.
      Quote a tight one and you trade constantly for almost nothing. Somewhere between those is a
      living, and finding it is the entire job.</p>
      <p class="math">earn = (half the spread) × (how many will deal at it)</p>
      <p>Nobody in this seat is betting on the dice. They are trying to be paid for standing
      between people who want to trade at different moments.</p>`,
  },
  theSpreadIsTheFee: {
    rung: 10,
    title: "The spread is the fee, and you have been paying it all along",
    body: `
      <p>When a customer lifts your offer, they pay above fair value. When one hits your bid, they
      sell below it. Either way they hand you <strong>half the spread</strong>, and they do it on
      the way in and again on the way out.</p>
      <p class="math">round trip cost = the full spread, every single time</p>
      <p>This never appears on a statement. It is not a commission, it is not a fee, it is not
      disclosed in a percentage — it is simply the difference between the two prices you were
      shown, and it is the largest cost most active traders pay.</p>
      <p>"Commission-free" trading did not remove it. It moved it somewhere you cannot see.</p>`,
  },
  adverseSelection: {
    rung: 10,
    title: "Adverse selection: why the spread cannot be small",
    body: `
      <p>About a fifth of the flow arriving at your book is <strong>informed</strong> — it only
      ever deals when it is right. You cannot tell which trades those are until after they settle.</p>
      <p class="math">earn half the spread from the crowd
give it all back to the ones who knew</p>
      <p>That is why the spread is not simply greed. It has to be wide enough that the uninformed
      flow pays for the informed flow, or the market maker stops quoting and goes home.</p>
      <p>It also explains the thing everybody notices and nobody explains: spreads widen violently
      around news. That is not opportunism. It is the moment when the share of counterparties who
      know more than you is at its highest.</p>`,
  },
  whoIsAcross: {
    rung: 10,
    title: "Who was on the other side of that?",
    body: `
      <p>You have just spent a session as the one quoting, which makes this question land
      differently than it would have an hour ago. Every fill you took at every other table in
      this building had somebody on the other side of it.</p>
      <p>Mostly they were rebalancing, or hedging, or needed the cash. Occasionally they knew
      something. You could not tell which, and neither can anyone else until it settles.</p>
      <p class="math">the spread is what it costs to stand between those two kinds of person</p>
      <p>That is the whole job you were doing, and it is why the number was never zero.
      <strong>Rung 10 is where this gets its proper name</strong> — adverse selection — and the
      reading behind it is the microstructure shelf in the Vault.</p>`,
  },

  timeInMarket: {
    rung: 2,
    title: "Ten spins, one decision",
    body: `
      <p>You just played ten rounds without being asked ten times. Notice what was removed: not
      the risk, not the fee, not a single outcome — only the <strong>opportunity to interfere</strong>.</p>
      <p class="math">same stake, same odds, same fee — nine fewer chances to flinch</p>
      <p>This is the mechanical version of the most reliable finding in retail investing. Measured
      across real brokerage accounts, the return investors actually earn trails the return of the
      funds they hold, and almost all of the gap is decisions made in between — selling the dip,
      chasing the run, going to cash and back.</p>
      <p>Time in the market beats timing the market not because timing is impossible, but because
      <strong>every decision is a chance to be wrong and you do not have to take it.</strong></p>`,
  },
};

/**
 * Which rung's check tests a given chip, and which chips a rung covers.
 *
 * Study cards, check questions and Vault entries were all already keyed by rung; the chips —
 * the only content the player meets while actually playing — were keyed only by table. That
 * gap is why nothing at a table could ever say "the hand you just played is what rung 3
 * checks". These two lookups close it.
 *
 * Rungs 3 and 4 are chart literacy and have no table of their own, so no chip maps to them.
 * That is a real hole in the curriculum rather than an accident of this mapping.
 */
export const rungOfChip = (key) => CHIPS[key]?.rung ?? null;

export const chipsForRung = (n) =>
  Object.entries(CHIPS).filter(([, c]) => c.rung === n).map(([k]) => k);

/** Every chip the player has met that belongs to a given rung. */
export const seenForRung = (n) => chipsForRung(n).filter(hasSeen);

const SEEN_KEY = "he_chips_seen";

function seen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); }
  catch { return []; }
}

function markSeen(key) {
  try {
    const s = seen();
    if (!s.includes(key)) { s.push(key); localStorage.setItem(SEEN_KEY, JSON.stringify(s)); }
  } catch { /* private browsing — the chip just shows again next time */ }
}

export function hasSeen(key) {
  return seen().includes(key);
}

let queue = [];
let showing = false;
let els = null;

function ui() {
  if (els) return els;
  els = {
    layer: document.getElementById("lesson-layer"),
    title: document.getElementById("lesson-title"),
    body: document.getElementById("lesson-body"),
    close: document.getElementById("lesson-close"),
  };
  if (!els.layer) return els;

  // Bound once, at load. Dismissal must never depend on a chip being mid-flight.
  els.close.addEventListener("click", dismiss);
  els.layer.addEventListener("click", (e) => { if (e.target === els.layer) dismiss(); });
  document.addEventListener("keydown", (e) => {
    if (!els.layer.hidden && (e.key === "Escape" || e.key === "Enter")) dismiss();
  });
  hide();
  return els;
}

function hide() {
  els.layer.hidden = true;
  els.layer.style.display = "none";   // belt and braces against a stylesheet regression
}

function dismiss() {
  if (!showing) { hide(); return; }
  showing = false;
  hide();
  drain();
}

/**
 * Re-open a chip the player has already met. teach() deliberately refuses to show a chip
 * twice, but the table strip shows a short beat and has to be able to expand it back into the
 * full card on demand — that is the whole staging idea: short in the flow, full on request.
 */
export function showChip(key) {
  if (!CHIPS[key]) return;
  queue.push(key);
  if (!showing) drain();
}

/** Show a chip once ever. Repeat calls are ignored. */
export function teach(key) {
  if (!CHIPS[key] || hasSeen(key)) return;
  markSeen(key);
  noteConcept(key);          // so the table can report it, not just the modal
  queue.push(key);
  if (!showing) drain();
}

function drain() {
  const e = ui();
  if (!e.layer) return;
  const key = queue.shift();
  if (!key) { showing = false; hide(); return; }

  showing = true;
  e.title.textContent = CHIPS[key].title;
  e.body.innerHTML = CHIPS[key].body;
  e.layer.hidden = false;
  e.layer.style.display = "grid";
  e.close.focus();
}

// Make sure the overlay is down before the player ever sees the page.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => ui());
} else {
  ui();
}
