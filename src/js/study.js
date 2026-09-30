// Tier reading — the curriculum behind the prestige ladder.
//
// These are distinct from the chips in lessons.js. A chip fires at the table, at the moment a
// hand makes it obvious. These are studied deliberately, in order, and each tier ends in a
// check. Tiers 1-2 are basic economics, 3-5 are chart literacy, 6-10 are the advanced material.
//
// The advanced tiers cover the same ground as the Vault reading — Graham,
// Damodaran, Soros, Marks, Taleb, GARCH, factor models, microstructure. The concepts and the
// structure are theirs and are credited; every sentence here is written for this game. The
// scraped prose stays a reading layer with attribution, never product copy.
//
// A card may carry a `chart` spec, rendered by chart.js. Those are the chart-reading tiers,
// where a paragraph about a candle is worth much less than a candle.

export const STUDY = {
  1: [
    {
      id: "t1money",
      title: "Money is a claim on somebody else's work",
      body: `
        <p>A coin is not wealth. It is a <strong>claim on future goods and labour</strong> that
        other people have agreed to honour. Nothing about the metal or the paper or the number in
        an app carries value; the agreement does.</p>
        <p>Which means money has exactly two jobs: it moves value across <em>space</em>, so you can
        sell here and buy there, and across <em>time</em>, so you can work now and eat later. Every
        idea in this curriculum is about the second job, because that is the one that is hard.</p>
        <p class="math">money = a portable, storable claim on things you have not bought yet</p>
        <p>And the moment you notice that a claim can be honoured well or badly, you have found
        the reason the rest of finance exists.</p>`,
    },
    {
      id: "t1prices",
      title: "A price is a compressed argument",
      body: `
        <p>A price looks like a fact. It is actually the <strong>summary of a disagreement</strong>
        — the single number at which the most optimistic remaining buyer and the most pessimistic
        remaining seller are willing to trade.</p>
        <p>That is why prices carry information that no individual in the market possesses. Nobody
        at the counter knows how many tonnes of copper were mined this quarter, but the copper
        price knows, because everyone who does know has already traded on it.</p>
        <p class="math">price = what the marginal buyer and marginal seller agree on, and nothing more</p>
        <p>Hayek's point, and it is the deepest idea in economics: a price is a <strong>signal that
        travels</strong>. Suppress it and you have not made anything cheaper, you have only
        destroyed the message.</p>`,
    },
    {
      id: "t1scarcity",
      title: "Every choice is priced in the thing you did not choose",
      body: `
        <p>Scarcity is not poverty. It is the plain fact that there is less of everything than
        there are uses for it — including time, which is the one nobody can manufacture.</p>
        <p>So the real cost of anything is never the sticker. It is the <strong>next best thing you
        gave up</strong> to have it. An hour spent here is an hour not spent elsewhere; a chip
        staked on one table is a chip not staked on another.</p>
        <p class="math">opportunity cost = the value of the best option you turned down</p>
        <p>This is why "it made money" is not the same as "it was a good decision". The comparison
        that matters is against the alternative you had, which is the reason every table in this
        game shows you a counterfactual beside your own bank.</p>`,
    },
  ],

  2: [
    {
      id: "t2interest",
      title: "Interest is the price of time",
      body: `
        <p>Ask why a lender charges anything at all and the answer is not greed, it is that
        <strong>a pound now and a pound in a year are different goods</strong>. Having it now means
        you can use it, and giving that up has a price like anything else scarce.</p>
        <p>An interest rate is that price. It bundles three separate things, and it is worth being
        able to name them apart:</p>
        <p class="math">rate ≈ pure time preference + expected inflation + risk of not being repaid</p>
        <p>When a rate moves, at least one of those three moved. Most arguments about monetary
        policy are really arguments about which.</p>`,
    },
    {
      id: "t2compound",
      title: "Compounding, and the only mental shortcut worth memorising",
      body: `
        <p>Growth that feeds on its own output does not add, it <strong>multiplies</strong>. That is
        obvious as a sentence and almost impossible to feel as a quantity, which is why it deserves
        a card of its own.</p>
        <p>The shortcut: divide 72 by the annual percentage and you get the years to double. It is
        accurate enough to do in your head and it turns an abstraction into a number you can
        actually argue with.</p>
        <p class="math">rule of 72:  72 ÷ 7% ≈ 10 years to double
                       10% for 30 years = 17×, not 4×</p>
        <p>Run it the other way and it is just as sharp. A 2% fee does not cost you 2%. Over thirty
        years it quietly takes about <strong>45% of the final pot</strong>, which is the argument
        the Sector Reels machine has been making at you the whole time.</p>`,
    },
    {
      id: "t2real",
      title: "Nominal and real: the number that is lying",
      body: `
        <p>If your money grows 5% and prices rise 3%, you did not get 5% richer. You got about 2%
        richer. The 5% is the <strong>nominal</strong> return, the 2% is the <strong>real</strong>
        one, and only the second buys anything.</p>
        <p class="math">real ≈ nominal − inflation</p>
        <p>Inflation is not a price rise, it is a fall in what a claim is worth — a slow transfer
        away from anyone holding cash or fixed payments, toward anyone holding debt or assets. It
        is legislated by nobody and paid by everybody.</p>
        <p>Which is exactly why the green zero on the roulette wheel is labelled inflation in this
        game. One pocket in thirty-seven, never stopping, invisible unless somebody prints it on
        the felt for you.</p>`,
    },
  ],

  3: [
    {
      id: "t3ohlc",
      title: "Four numbers per bar",
      body: `
        <p>A candle is not a drawing, it is <strong>four numbers</strong> about one slice of time:
        where trading opened, the highest it reached, the lowest it reached, and where it closed.
        Open, high, low, close. OHLC.</p>
        <p>The thick part — the <em>body</em> — spans open to close. The thin lines — the
        <em>wicks</em> — reach out to the high and the low. Convention here and nearly everywhere:
        a close above the open is drawn light, a close below is drawn dark.</p>
        <p class="math">body = open → close       wicks = how far it got and came back</p>
        <p>That is the entire vocabulary. Everything anybody has ever claimed to read in a chart is
        assembled out of those four numbers and nothing else.</p>`,
      chart: { kind: "candle", o: 100, h: 112, l: 96, c: 108, label: "one bar, annotated" },
    },
    {
      id: "t3body",
      title: "A long wick is a rejected price",
      body: `
        <p>The body tells you where the fight <em>settled</em>. The wicks tell you where it
        <strong>went and failed to hold</strong>, which is often the more useful half.</p>
        <p>A bar with a small body and a long upper wick means buyers pushed the price up and could
        not keep it there — the move was offered into and rejected. The same shape upside down is a
        low that got bought back. Neither is a prophecy. Both are a record of where supply and
        demand actually met, which is a real fact about a real level.</p>
        <p class="math">small body + long wick = a price that was tried and did not stick</p>
        <p>Read them as <strong>evidence about a level</strong>, never as a signal about tomorrow.
        That distinction is the whole difference between chart literacy and chart superstition.</p>`,
      chart: { kind: "shapes", label: "the four shapes worth recognising" },
    },
    {
      id: "t3timeframe",
      title: "The timeframe decides what you are allowed to see",
      body: `
        <p>Here is the thing nobody warns you about: <strong>the same data is a different chart at
        every timeframe</strong>, and the timeframe is a choice somebody made, not a property of
        the market.</p>
        <p>Aggregate to weekly bars and a two-day panic vanishes into a wick. Zoom to five minutes
        and a boring month becomes forty dramatic reversals. Neither view is false. Neither is
        complete.</p>
        <p class="math">the same year, drawn daily and drawn weekly, supports opposite stories</p>
        <p>So the honest first question about any chart you are shown is not "what is it doing" but
        <strong>"what timeframe is this, and who picked it"</strong>. A chart cropped to the right
        window can argue almost anything.</p>`,
      chart: { kind: "timeframe", seed: 31, label: "one series, three timeframes" },
    },
    {
      id: "t3summary",
      title: "A candle is a summary, and summaries delete things",
      body: `
        <p>Within a single bar, the order of events is <strong>gone</strong>. A candle that opened
        at 100, closed at 108 and touched 96 does not tell you whether it crashed first and
        recovered, or rallied, sold off and rallied again. Those are very different days. They draw
        the same candle.</p>
        <p>Nor does it tell you whether the close came on one enormous print or ten thousand small
        ones — that is what volume is for, which is the next tier.</p>
        <p class="math">four numbers kept, the entire sequence thrown away</p>
        <p>This is not a flaw to fix, it is what a summary <em>is</em>. But it does mean that the
        finer the pattern someone claims to read in a candle, the more likely they are reading
        something the candle does not contain.</p>`,
    },
  ],

  4: [
    {
      id: "t4volume",
      title: "Volume is how much agreement was behind the move",
      body: `
        <p>Price tells you where. Volume tells you <strong>how many</strong> — how much actually
        changed hands to get there. A 5% move on a tenth of normal volume and a 5% move on triple
        normal volume are not the same event, even though the candle is identical.</p>
        <p>The convention, and it is one of the oldest ideas in the field: volume should expand in
        the direction of the trend and dry up against it. A new high on falling volume means fewer
        and fewer participants are willing to pay up.</p>
        <p class="math">price = where it went    volume = how much of the market went with it</p>
        <p>Treat it as a <strong>confidence interval on the move</strong>, not as a signal. That
        framing survives contact with evidence; most of the rest does not.</p>`,
      chart: { kind: "candles", seed: 12, bars: 44, drift: 0.0035, vol: 0.016, volume: true,
               label: "the same highs, with and without participation" },
    },
    {
      id: "t4gap",
      title: "A gap is information arriving while the market was shut",
      body: `
        <p>Sometimes a bar opens nowhere near where the last one closed. That empty space is a
        <strong>gap</strong>, and it is not a glitch — it is what happens when news lands during
        hours when nobody could trade.</p>
        <p>The price did not travel through the gap. There is no volume in there, no trades, and so
        no level that anyone actually defended. That is precisely why gaps behave strangely: the
        usual evidence about who wants what at which price simply does not exist in that range.</p>
        <p class="math">a gap is a range where no trade ever happened</p>
        <p>It also breaks the most common assumption in risk management. A stop at a given level
        does not protect you if the market reopens underneath it, which it can and does.</p>`,
      chart: { kind: "candles", seed: 5, bars: 40, drift: -0.001, vol: 0.014, gapAt: 22, gapBy: -0.09,
               label: "a stop below the gap would not have helped" },
    },
    {
      id: "t4log",
      title: "Log scale is not a trick, it is the honest axis",
      body: `
        <p>On a normal axis, a move from 10 to 20 looks tiny and a move from 100 to 200 looks
        enormous. They are the same event: a double. A <strong>logarithmic</strong> axis spaces
        equal <em>percentage</em> moves equally, so a double is the same height wherever it starts.</p>
        <p>This matters more than it sounds. Almost every long-run chart you have ever seen
        described as a "hockey stick" or an "unprecedented parabola" is a linear-axis artefact of
        steady compound growth. Redraw it in logs and the drama frequently turns into a straight
        line.</p>
        <p class="math">linear axis: equal distance = equal dollars
log axis:    equal distance = equal percent</p>
        <p>Rule of thumb: for anything spanning more than a couple of doublings,
        <strong>linear is the misleading choice</strong>.</p>`,
      chart: { kind: "logdemo", seed: 9, label: "the same 30 years, both axes" },
    },
    {
      id: "t4thin",
      title: "In a thin market the chart is mostly decoration",
      body: `
        <p>Everything on the last three cards assumed a crowd. Take the crowd away and the chart
        stops describing the market, because a handful of trades can print any shape you like.</p>
        <p>In an illiquid name, a single order can move the last price several percent, the spread
        between bid and ask can be wider than the daily range, and the "close" may be one small
        trade from someone who needed out. The candle looks exactly as authoritative as a candle on
        the most liquid future in the world.</p>
        <p class="math">a price only means something if you could have traded size at it</p>
        <p>Which is the question to keep asking of any chart: <strong>could I actually have
        transacted there?</strong> The Book, at table eight, is the table about that.</p>`,
    },
  ],

  5: [
    {
      id: "t5trend",
      title: "Trend is a description of the past tense",
      body: `
        <p>A trend is real and it is measurable: higher highs and higher lows, or the reverse. There
        is nothing mystical in it. The trouble is entirely in the tense.</p>
        <p>"This is an uptrend" is a statement about what already happened. "This is an uptrend,
        therefore it will continue" is a forecast, and it is a much weaker claim than the confident
        way people say it. Trends do persist more often than a coin flip in many markets — the
        effect is real enough to have a name, momentum — but the edge is thin, it decays, and it
        goes through long stretches of being wrong.</p>
        <p class="math">"is trending" = measured    "will continue" = a bet</p>
        <p>Keep those two sentences apart and most chart-reading nonsense becomes visible on
        contact.</p>`,
      chart: { kind: "candles", seed: 77, bars: 60, drift: 0.004, vol: 0.018, ma: [20],
               label: "an uptrend, and the four pullbacks that ended one" },
    },
    {
      id: "t5drawdown",
      title: "Drawdown is the number that actually ends people",
      body: `
        <p>Average return is the number in the brochure. <strong>Drawdown</strong> — how far you
        fell from your own high-water mark, and for how long — is the number that decides whether
        you were still there at the end.</p>
        <p>The arithmetic is brutal and asymmetric. A 50% fall needs a 100% gain to get level. An
        80% fall needs 400%. And you must survive the entire wait, psychologically and
        financially, or the recovery happens to somebody else.</p>
        <p class="math">−50% needs +100%    −80% needs +400%</p>
        <p>So the honest way to read a chart is not "how much did this make". It is <strong>"could I
        have held this through its worst stretch"</strong> — and the chart, unusually, does tell you
        that, precisely and without spin.</p>
      `,
      chart: { kind: "drawdown", seed: 44, label: "the same return, two very different rides" },
    },
    {
      id: "t5patterns",
      title: "Most of the patterns are in you",
      body: `
        <p>Head and shoulders, double tops, flags, pennants, cup and handle. These are real
        vocabulary with a century of use behind them, and the careful practitioners are explicit
        that they are <strong>probabilistic, not deterministic</strong> — a pattern shifts the odds
        a little, when it works at all.</p>
        <p>The problem is that humans are extraordinary pattern-matchers and cannot switch it off.
        Show people pure random walks and they reliably find trends, support levels and textbook
        formations in them. Generate a thousand charts from a coin and the patterns are all there,
        every one of them meaningless by construction.</p>
        <p class="math">a pattern you can only see after the fact is not a pattern, it is a memory</p>
        <p>The test that cuts through it: <strong>could you have written the rule down in advance,
        and does it still work on data you have not seen?</strong> Almost nothing survives that.</p>`,
      chart: { kind: "randomwalk", seed: 101, label: "one of these is a coin. both are." },
    },
    {
      id: "t5whatFor",
      title: "So what is a chart actually for",
      body: `
        <p>Not direction. The honest use of price history is <strong>measurement</strong>: how much
        does this thing move, how correlated is it with what else you hold, how bad has its worst
        stretch been, how liquid is it.</p>
        <p>Those are the inputs position sizing genuinely requires. Kelly needs a variance. Risk
        limits need a drawdown history. Diversification needs correlations. Every one of those comes
        off a chart, and none of them is a prediction about tomorrow.</p>
        <p class="math">charts are for sizing the bet, not for picking the side</p>
        <p>This is what your next unlock does. It stops offering you a direction and starts
        reporting the volatility — the number that decides <em>how much</em>, which is the decision
        you actually control.</p>`,
    },
  ],

  6: [
    {
      id: "t6intrinsic",
      title: "Price is what you pay. Value is what you get.",
      body: `
        <p>Graham's whole contribution is the insistence that these are <strong>two different
        numbers</strong>. A security has a price, set by whoever traded last, and it has a value,
        set by what the underlying business will actually produce. They are related by nothing more
        reliable than eventual gravity.</p>
        <p>Intrinsic value is not a precise figure and Graham never pretended it was. It is a
        <em>range</em>, estimated from earnings, assets and prospects, and deliberately held loosely
        enough to be honest about how little anybody knows.</p>
        <p class="math">investing = buying a claim on output, at a price below what the output is worth</p>
        <p>Everything else in this tier follows from taking that sentence literally.</p>`,
    },
    {
      id: "t6margin",
      title: "Margin of safety",
      body: `
        <p>If your estimate of value is a range rather than a number, then buying at your estimate
        gives you no protection at all — half your errors put you underwater immediately.</p>
        <p>So you demand a discount. Buy at 60 what you believe is worth 100, and you can be
        substantially wrong and still do fine. The gap is not greed, it is
        <strong>engineering tolerance for your own fallibility</strong>.</p>
        <p class="math">margin of safety = (value − price) ÷ value, and it has to be large</p>
        <p>You met this already without the name on it. At The Line, the bets worth taking were the
        ones where your read and the board disagreed by a <em>wide</em> margin — because a small
        disagreement is indistinguishable from your own error. Same idea. Same reason.</p>`,
    },
    {
      id: "t6mrMarket",
      title: "Mr. Market is a business partner, not an oracle",
      body: `
        <p>Graham's device: imagine a partner who turns up every day and quotes you a price for your
        share of the business, sometimes sensible, sometimes euphoric, sometimes despairing. He is
        not obliged to be rational and you are not obliged to trade.</p>
        <p>The reframing is the whole point. A falling quote is not information that you were wrong;
        it is <strong>an offer</strong>, which you may accept, ignore, or take the other side of.
        The only thing that makes a quote authoritative is you deciding to treat it that way.</p>
        <p class="math">the market is there to serve you, not to instruct you</p>
        <p>Which is the exact opposite of how a price feels when it is moving against you, and why
        this card is easy to agree with and very hard to act on.</p>`,
    },
    {
      id: "t6quality",
      title: "Cheap and bad is not the same as cheap and good",
      body: `
        <p>The crude version of value investing buys whatever has the lowest ratio, and it walks
        straight into the <strong>value trap</strong>: businesses that are cheap because they are
        genuinely deteriorating, where the low price is not a mistake but a correct assessment.</p>
        <p>The refinement — Fisher's, Lynch's, and later Buffett's — is that durability of the
        earnings matters as much as the multiple on them. A mediocre business bought cheaply gives
        you one gain, once, if the discount closes. A good business bought fairly keeps compounding
        without you having to be right again.</p>
        <p class="math">a low multiple is a question, not an answer</p>
        <p>The question it asks is always the same: <strong>why is it cheap, and is that reason
        temporary?</strong></p>`,
    },
  ],

  7: [
    {
      id: "t7dcf",
      title: "A business is worth its future cash, brought back to today",
      body: `
        <p>Strip away every technique and valuation is one sentence: an asset is worth the cash it
        will hand you, adjusted for the fact that later cash is worth less than sooner cash.</p>
        <p>That adjustment is discounting, and it is just tier two's interest arithmetic run
        backwards. A pound arriving in ten years at an 8% discount rate is worth about 46p now.</p>
        <p class="math">value = Σ  cash flow in year t ÷ (1 + r)^t</p>
        <p>Everything difficult about valuation is hidden in three places inside that formula: the
        cash flows you forecast, the rate <em>r</em> you choose, and what you assume happens after
        your forecast runs out. The formula itself is trivial. The inputs are the argument.</p>`,
    },
    {
      id: "t7discount",
      title: "The discount rate is where the argument actually is",
      body: `
        <p>Two analysts with identical forecasts can produce valuations twice apart, purely from the
        rate. It is the most consequential number in the model and the least observable.</p>
        <p>Conceptually it is what you should demand for bearing this particular risk instead of
        holding something safe — a risk-free rate plus a premium. In practice the premium is
        estimated, contested, and moves with sentiment, which means
        <strong>your discount rate is partly a market opinion, not a physical constant</strong>.</p>
        <p class="math">r = risk-free rate + risk premium    (and the second term is an argument)</p>
        <p>Which has a useful corollary: when someone shows you a valuation, ask for the rate first.
        You will learn more from that single number than from the rest of the spreadsheet.</p>`,
    },
    {
      id: "t7terminal",
      title: "Most of the value is in the part you cannot forecast",
      body: `
        <p>Nobody can project a business for ever, so models forecast explicitly for five or ten
        years and then collapse everything after that into a single
        <strong>terminal value</strong>.</p>
        <p>Here is the uncomfortable arithmetic: in a typical growth-company model, that terminal
        lump is <em>most of the answer</em> — often 60 to 80% of it. The decade you carefully
        modelled is the minority of the valuation, and the majority rests on a perpetual growth
        assumption on one line.</p>
        <p class="math">a 0.5% change in terminal growth can move the valuation 20%</p>
        <p>This is not an argument against DCF. It is an argument for knowing where your answer
        came from, and for treating any valuation quoted to two decimal places as a
        <strong>confession rather than a result</strong>.</p>`,
    },
    {
      id: "t7story",
      title: "A valuation is a story with numbers attached",
      body: `
        <p>Damodaran's framing, and it is the most useful thing in this tier: a model without a
        narrative is a spreadsheet nobody can sanity-check, and a narrative without a model is a
        pitch. You need both, and they have to be <strong>consistent</strong>.</p>
        <p>If your story is "this becomes the dominant platform in its category", the numbers must
        show a share of a market large enough to contain that, with margins that survive the
        competition the story implies. Most bad valuations are not arithmetic errors. They are
        stories that the numbers quietly contradict.</p>
        <p class="math">is this story possible, plausible, and probable — and does the model say so too?</p>
        <p>The discipline is asking which parts of your story the numbers are load-bearing for, and
        then checking whether you actually believe those parts.</p>`,
    },
  ],

  8: [
    {
      id: "t8reflexivity",
      title: "The measurement changes the thing measured",
      body: `
        <p>In physics the thermometer does not warm the room. In markets it does. Soros's
        <strong>reflexivity</strong> is the observation that participants' beliefs alter the
        fundamentals they are beliefs about, which then alter the beliefs, without ever settling.</p>
        <p>A rising share price lets a company raise cheap capital, hire, and acquire — genuinely
        improving the fundamentals that justified the rise. The loop runs in reverse just as well: a
        falling price can raise a firm's funding costs until the weakness the market feared becomes
        real.</p>
        <p class="math">beliefs → prices → fundamentals → beliefs</p>
        <p>This is why "the market is wrong and will correct" can be false in a specific and
        infuriating way. Sometimes the market is <strong>wrong in a way that makes itself
        right</strong>.</p>`,
    },
    {
      id: "t8cycles",
      title: "You cannot know the future. You can know where you are.",
      body: `
        <p>Marks separates two questions people constantly merge. Forecasting — what happens next —
        is close to hopeless. Locating yourself in a cycle — are valuations stretched, is credit
        loose, is everyone relaxed — is <strong>feasible</strong>, from evidence available now.</p>
        <p>The second question does not tell you timing and never will. What it tells you is which
        way the odds are leaning, which is enough to change how much risk you are carrying.</p>
        <p class="math">"we cannot predict, but we can prepare"</p>
        <p>Read it as a sizing instruction, not a timing one. The same conclusion tier five reached
        from the chart side: the decision you control is <em>how much</em>, not <em>when</em>.</p>`,
    },
    {
      id: "t8taleb",
      title: "The turkey problem",
      body: `
        <p>A turkey is fed every day for a thousand days. Each day is additional evidence that
        humans are benevolent and that the feeding will continue. The confidence peaks, correctly by
        every statistical measure available to the turkey, on the afternoon before Thanksgiving.</p>
        <p>Taleb's point is not that surprises happen. It is that <strong>a track record of
        stability is itself weak evidence</strong> when the thing that could hurt you has not
        occurred within the sample. Absence of evidence is not evidence of absence.</p>
        <p class="math">a thousand quiet days say nothing about the thousand-and-first</p>
        <p>Which is the honest indictment of any risk model calibrated on a benign period — and
        very nearly all of them are, because benign periods are where most of the data lives.</p>`,
    },
    {
      id: "t8secondLevel",
      title: "Second-level thinking",
      body: `
        <p>First-level: "this is a good company, I will buy it." Second-level: "this is a good
        company, <strong>everyone already knows that, and the price reflects it</strong> — so where
        exactly is my return coming from?"</p>
        <p>You cannot earn an unusual return from a widely held view, because the widely held view
        is already the price. Returns come from being right about something the consensus has
        mispriced, which requires a view that is both different <em>and</em> correct. Different and
        wrong is expensive. Same and right pays the average.</p>
        <p class="math">edge = (your view ≠ consensus) AND (your view is right)</p>
        <p>You have been doing this since table nine. The de-vigged line <em>was</em> the consensus,
        and the only bets worth taking were the ones where you disagreed with it and had done the
        work to deserve the disagreement.</p>`,
    },
  ],

  9: [
    {
      id: "t9clustering",
      title: "Volatility arrives in clusters",
      body: `
        <p>Look at any long price series and one thing jumps out before any pattern does: quiet
        stretches sit next to violent stretches. Big moves are <strong>followed</strong> by big
        moves, in both directions, far more often than chance allows.</p>
        <p>Note carefully what is predictable here. Not the <em>sign</em> of tomorrow's move —
        that stays close to a coin flip. The <em>size</em> of it. Direction resists forecasting;
        magnitude does not.</p>
        <p class="math">returns ≈ unpredictable    |returns| ≈ quite predictable</p>
        <p>This single asymmetry is why professional risk management is possible at all while
        professional forecasting mostly is not, and it is the empirical fact the rest of this tier
        is built to model.</p>`,
      chart: { kind: "clustering", seed: 61, label: "calm and storm, in blocks" },
    },
    {
      id: "t9garch",
      title: "GARCH, in one idea",
      body: `
        <p>If volatility clusters, then today's volatility should be predictable from yesterday's.
        That is the whole thought. GARCH turns it into a formula with three ingredients: a long-run
        average level of volatility, yesterday's <em>forecast</em>, and yesterday's actual
        <em>surprise</em>.</p>
        <p class="math">tomorrow's variance = ω + α(yesterday's shock²) + β(yesterday's variance)</p>
        <p>The α term is how sharply volatility reacts to a shock; the β term is how long it stays
        elevated. In equity markets β is typically large — around 0.9 — which is the model's way of
        saying that <strong>calm and panic are both persistent</strong>.</p>
        <p>And because α + β is close to but below one, a shock decays back toward the long-run
        level rather than never, which is the formal statement of "this too shall pass".</p>`,
    },
    {
      id: "t9fatTails",
      title: "The normal distribution is lying to you",
      body: `
        <p>Nearly every model you will meet assumes returns are normally distributed, because normal
        distributions are mathematically convenient. Real returns are not, and the discrepancy is
        not a rounding error.</p>
        <p>Under a normal distribution, a five-standard-deviation daily move should appear roughly
        once every seven thousand years. Actual markets produce them <strong>several times a
        decade</strong>. The tails are fatter than the bell curve allows, and the shortfall is
        concentrated exactly where the losses that matter live.</p>
        <p class="math">normal: a 5σ day ≈ once per 7,000 years
reality: several per decade</p>
        <p>So when a risk system reports a one-in-a-thousand worst case, the honest translation is
        "one in a thousand <em>if the assumption holds</em>" — and the assumption is known to fail
        precisely on the days you are asking about.</p>`,
      chart: { kind: "tails", seed: 23, label: "the bell curve against what actually happened" },
    },
    {
      id: "t9volOfVol",
      title: "Volatility is not a number, it is a process",
      body: `
        <p>The last step: volatility does not merely change, it changes <em>randomly</em>. It has
        its own volatility. Stochastic volatility models give it its own equation, with a level it
        reverts to and a speed it reverts at.</p>
        <p>This is why options are genuinely hard. An option's value depends on volatility over its
        whole remaining life, so pricing one means forecasting not just where the asset goes but how
        agitated it will be on the way — and the market's answer to that is itself a traded,
        moving, opinionated price.</p>
        <p class="math">implied volatility = the market's forecast of the future ride, priced</p>
        <p>Which closes a loop back to tier one. Even volatility turns out to be
        <strong>a price, carrying information, set by disagreement</strong>.</p>`,
    },
  ],

  10: [
    {
      id: "t10factors",
      title: "Most of your return was not your idea",
      body: `
        <p>Decompose a portfolio's returns honestly and the great majority is explained by a handful
        of broad exposures: the market itself, plus tilts toward small companies, cheap companies,
        recent winners, profitable companies, low-volatility companies. These are
        <strong>factors</strong>.</p>
        <p>The uncomfortable implication is that a manager beating the index by owning small cheap
        stocks has not demonstrated skill. They have demonstrated <em>exposure</em>, which anybody
        can buy for a few basis points, and which comes with its own long droughts.</p>
        <p class="math">return = Σ (exposure to factor) × (factor return) + residual</p>
        <p>The right question stops being "did they beat the market" and becomes
        <strong>"what were they exposed to, and could I have bought that directly?"</strong></p>`,
    },
    {
      id: "t10alpha",
      title: "Alpha is the leftover, and it is mostly not there",
      body: `
        <p>Alpha is what the factor model cannot explain — the residual after every known exposure
        is accounted for. That definition is doing more work than it looks.</p>
        <p>It means alpha is <strong>defined relative to your model</strong>. Discover a new factor
        and yesterday's alpha becomes today's beta, retroactively; a great deal of celebrated
        historical outperformance has evaporated exactly that way. It also means alpha is a
        zero-sum game before costs and negative after them, since every trade has a counterparty.</p>
        <p class="math">alpha today = the part of your return the current model cannot yet name</p>
        <p>None of which says skill does not exist. It says skill is <em>scarce, shrinking, and
        very often mislabelled exposure</em> — and that the burden of proof sits with the person
        claiming it.</p>`,
    },
    {
      id: "t10spread",
      title: "Microstructure: the fee you never see on a statement",
      body: `
        <p>There is no single price. There is a <strong>bid</strong> that somebody will buy at and
        an <strong>ask</strong> that somebody will sell at, and the gap between them is a real cost
        you pay on the way in and again on the way out.</p>
        <p>Worse, size moves the price against you. Your order consumes the best quotes and reaches
        into worse ones — <em>slippage</em> — and the larger you are relative to the market, the
        more it costs. This is why a strategy can be profitable on paper and unprofitable in
        practice without anything about the idea being wrong.</p>
        <p class="math">true cost = commission + half the spread + slippage + market impact</p>
        <p>Table eight is built entirely on this, and so is every backtest that looked wonderful
        until somebody tried to trade it.</p>`,
    },
    {
      id: "t10adverse",
      title: "Why is this person trading with you?",
      body: `
        <p>The final question, and the one that ties the whole building together. Every fill you get
        has a human or a machine on the other side who wanted the opposite. Sometimes they are
        rebalancing, or hedging, or need cash. Sometimes they know something.</p>
        <p>That second case is <strong>adverse selection</strong>, and it is why market makers widen
        spreads around news: the flow that arrives when information is moving is disproportionately
        informed, and providing liquidity into it is a losing trade. Everyone else pays the wider
        spread to cover it.</p>
        <p class="math">if you are getting filled easily, ask what the other side knows</p>
        <p>Which is where all ten tiers land. A price is a claim, a signal, an argument, a forecast
        and a fee, and behind it is always a counterparty. <strong>The house edge was never the
        only thing taking a cut — it was just the honest one, because it was printed on the
        felt.</strong></p>`,
    },
  ],
};

/** Flat list of every concept id in tier order. */
export const ALL_CONCEPTS = Object.values(STUDY).flat().map((c) => c.id);

export const cardById = (id) =>
  Object.values(STUDY).flat().find((c) => c.id === id);
