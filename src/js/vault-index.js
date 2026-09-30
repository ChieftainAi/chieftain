// The Vault catalogue.
//
// THIS FILE CONTAINS NO SOURCE TEXT, AND THAT IS DELIBERATE.
//
// The Vault indexes ~86,600 words published by Wyandanch Library. That is someone else's
// original writing, and no licence is stated anywhere on the site or in the material -
// "open source finance education" is a tagline, not a grant - so the default is all rights
// reserved. Tier 2 is therefore a reading and reference layer with attribution and links back
// to the source, never text pasted into the product.
//
// So what ships is this: the catalogue, our own orientation for each piece, the section
// headings as a table of contents, and a deep link out. The scraped markdown is NOT in this
// repository - it is kept locally as research and gitignored, because bundling it in a public
// repo would be redistribution rather than reference.
//
// If the site owner ever grants written permission, shipping the full text becomes an option.
// Until then it does not. tools/ has no test for this any more because the material is simply
// absent; if you ever re-add it, restore the passage-sampling check first.

export const TRACKS = {
  fundamental:  { label: "The Fundamental Investor", blurb: "Businesses, their worth, and the gap between worth and price." },
  macro:        { label: "The Macro Thinker",        blurb: "Prices, rates, cycles and the machinery underneath a market." },
  practitioner: { label: "The Market Practitioner",  blurb: "People who did it with money at risk, and what it cost them to learn." },
  quantitative: { label: "The Quantitative Investor", blurb: "The formal apparatus: volatility, factors, microstructure, implementation." },
};

export const SOURCE = {
  name: "Wyandanch Library",
  home: "https://wyandanchlibrary.com/",
  note: "Every text in the Vault was written and published by Wyandanch Library. Chieftain indexes and links to it; it does not reproduce it.",
};

export const SHELF = [
  {
    "slug": "hayek-prices-and-production",
    "title": "Prices and Production",
    "src": "https://wyandanchlibrary.com/read/hayek-prices-and-production",
    "words": 2068,
    "sections": [
      "Overview",
      "The Natural Rate vs. the Money Rate of Interest",
      "The Hayekian Triangle: The Structure of Production",
      "Credit Expansion and Malinvestment",
      "The Knowledge Problem: Prices as Information",
      "Spontaneous Order"
    ],
    "track": "macro",
    "rung": 1,
    "note": "The deep version of rung one's claim that a price is a signal that travels. Hayek on prices as the mechanism that coordinates knowledge no single mind possesses.",
    "stub": false
  },
  {
    "slug": "menger-principles-of-economics",
    "title": "Principles of Economics",
    "src": "https://wyandanchlibrary.com/read/menger-principles-of-economics",
    "words": 1736,
    "sections": [
      "Overview",
      "Subjective Value vs. the Labor Theory of Value",
      "Marginal Utility: How Individuals Make Choices",
      "Goods of Higher and Lower Order: The Theory of Imputation",
      "The Origin of Money",
      "Why This Matters"
    ],
    "track": "macro",
    "rung": 1,
    "note": "Where rung one's account of value comes from. Menger's argument that value is not a property of a thing but a relationship between a person and a thing is the foundation everything else stands on.",
    "stub": false
  },
  {
    "slug": "stigler-theory-of-price",
    "title": "The Theory of Price",
    "src": "https://wyandanchlibrary.com/read/stigler-theory-of-price",
    "words": 1927,
    "sections": [
      "Overview",
      "Price Theory: The Core of Economics",
      "Supply, Demand, and Market Equilibrium",
      "Elasticity: Measuring Responsiveness",
      "The Theory of Costs",
      "Market Structure: Competition and Monopoly"
    ],
    "track": "macro",
    "rung": 1,
    "note": "The textbook treatment of supply, demand and the margin, for when the intuition from rung one needs the formal apparatus underneath it.",
    "stub": false
  },
  {
    "slug": "fixed-income-fundamentals",
    "title": "Fixed Income Fundamentals",
    "src": "https://wyandanchlibrary.com/read/fixed-income-fundamentals",
    "words": 3070,
    "sections": [
      "Overview",
      "Bond Pricing from First Principles",
      "Yield Measures",
      "The Yield Curve",
      "Duration: Measuring Interest Rate Sensitivity",
      "Convexity: Beyond the Linear Approximation"
    ],
    "track": "macro",
    "rung": 2,
    "note": "Duration, convexity and the yield curve. Rung two explains why time has a price; this explains how that price is actually traded.",
    "stub": false
  },
  {
    "slug": "keynes-general-theory",
    "title": "The General Theory of Employment, Interest, and Money",
    "src": "https://wyandanchlibrary.com/read/keynes-general-theory",
    "words": 1925,
    "sections": [
      "Overview",
      "The Rejection of Say's Law",
      "The Consumption Function and the Multiplier",
      "Liquidity Preference Theory",
      "Marginal Efficiency of Capital and Animal Spirits",
      "The Beauty Contest and Market Behavior"
    ],
    "track": "macro",
    "rung": 2,
    "note": "Interest, liquidity preference and animal spirits — the other half of rung two's account of what a rate is and why it moves.",
    "stub": false
  },
  {
    "slug": "livermore-reminiscences",
    "title": "Reminiscences of a Stock Operator",
    "src": "https://wyandanchlibrary.com/read/livermore-reminiscences",
    "words": 2492,
    "sections": [
      "Overview",
      "The Bucket Shops: Where a Speculator Is Born",
      "The Art of Tape Reading",
      "\"It Was Never My Thinking That Made the Big Money\"",
      "Speculation vs. Gambling",
      "The Danger of Tips"
    ],
    "track": "practitioner",
    "rung": 5,
    "note": "A century old and still the best account of what it feels like to be wrong with money on the line. Read it for the psychology, not the method.",
    "stub": false
  },
  {
    "slug": "technical-analysis",
    "title": "Technical Analysis: Price Action, Patterns & Indicators",
    "src": "https://wyandanchlibrary.com/read/technical-analysis",
    "words": 4792,
    "sections": [
      "Overview",
      "Dow Theory: The Foundation",
      "Chart Patterns: Edwards and Magee",
      "Japanese Candlesticks",
      "Moving Averages",
      "Momentum Oscillators"
    ],
    "track": "practitioner",
    "rung": 5,
    "note": "The full source behind rungs three to five. Notably honest about its own limits: patterns are described as probabilistic rather than predictive, which is the distinction rung five is built on.",
    "stub": false
  },
  {
    "slug": "buffett-shareholder-letters",
    "title": "Berkshire Hathaway Shareholder Letters",
    "src": "https://wyandanchlibrary.com/read/buffett-shareholder-letters",
    "words": 2215,
    "sections": [
      "Overview",
      "Circle of Competence",
      "Margin of Safety",
      "Owner Earnings",
      "Economic Moats",
      "Mr. Market"
    ],
    "track": "fundamental",
    "rung": 6,
    "note": "Graham's framework after fifty years of contact with reality: moats, owner earnings, and the shift from buying cheap assets to buying durable businesses.",
    "stub": false
  },
  {
    "slug": "fisher-common-stocks",
    "title": "Common Stocks and Uncommon Profits",
    "src": "https://wyandanchlibrary.com/read/fisher-common-stocks",
    "words": 2375,
    "sections": [
      "Overview",
      "The Scuttlebutt Method",
      "Fisher's Fifteen Points",
      "When to Sell: Fisher's Three Reasons",
      "The Role of R&D Spending",
      "Growth Investing vs. Value Investing: A False Dichotomy"
    ],
    "track": "fundamental",
    "rung": 6,
    "note": "The counterweight to buying on a low multiple. Fisher's scuttlebutt method argues that the durability of the earnings matters as much as the price you paid for them.",
    "stub": false
  },
  {
    "slug": "growth-investing-principles",
    "title": "Growth Investing: Principles & Frameworks",
    "src": "https://wyandanchlibrary.com/read/growth-investing-principles",
    "words": 10,
    "sections": [],
    "track": "fundamental",
    "rung": 6,
    "note": "Listed for completeness — this page did not scrape and holds only a title. Read it at the source.",
    "stub": true
  },
  {
    "slug": "lynch-one-up-on-wall-street",
    "title": "One Up on Wall Street",
    "src": "https://wyandanchlibrary.com/read/lynch-one-up-on-wall-street",
    "words": 3357,
    "sections": [
      "Overview",
      "The Amateur Advantage: Invest in What You Know",
      "The Six Stock Categories",
      "Tenbaggers: The Art of Finding 10x Stocks",
      "GARP: Growth at a Reasonable Price",
      "The Two-Minute Drill"
    ],
    "track": "fundamental",
    "rung": 6,
    "note": "Lynch on categorising a business before valuing it, and on the limits of the famous advice to buy what you know — which is usually quoted without the part about doing the work afterwards.",
    "stub": false
  },
  {
    "slug": "graham-value-investing",
    "title": "Security Analysis & The Intelligent Investor",
    "src": "https://wyandanchlibrary.com/read/graham-value-investing",
    "words": 2643,
    "sections": [
      "Overview",
      "Investment vs. Speculation",
      "Margin of Safety",
      "Intrinsic Value: Three Approaches",
      "Mr. Market",
      "The Defensive vs. Enterprising Investor"
    ],
    "track": "fundamental",
    "rung": 6,
    "note": "The origin of everything rung six teaches. Investment versus speculation, intrinsic value as a range rather than a number, Mr. Market as a servant, and the margin of safety as tolerance for your own error.",
    "stub": false
  },
  {
    "slug": "derivative-portfolio-management",
    "title": "Derivative Portfolio Management",
    "src": "https://wyandanchlibrary.com/read/derivative-portfolio-management",
    "words": 2106,
    "sections": [
      "Overview",
      "Option Payoff Structures",
      "The Complete Greeks at Portfolio Level",
      "Portfolio P&L: The Taylor Series Framework",
      "VaR vs. CVaR",
      "Position Structures"
    ],
    "track": "quantitative",
    "rung": 7,
    "note": "The Options Pit at full scale. Greeks, hedging and what it takes to hold a book of options rather than a single position.",
    "stub": false
  },
  {
    "slug": "damodaran-little-book-valuation",
    "title": "The Little Book of Valuation",
    "src": "https://wyandanchlibrary.com/read/damodaran-little-book-valuation",
    "words": 2470,
    "sections": [
      "Overview",
      "Intrinsic Valuation: The DCF Framework",
      "Relative Valuation: Pricing by Comparison",
      "The Lifecycle of a Company: Matching Method to Stage",
      "Narrative and Numbers: The Story Behind the Spreadsheet",
      "Common Valuation Mistakes"
    ],
    "track": "fundamental",
    "rung": 7,
    "note": "The working mechanics behind rung seven: discounted cash flow, where the discount rate comes from, and why the terminal value quietly carries most of the answer.",
    "stub": false
  },
  {
    "slug": "business-history-of-finance",
    "title": "A Business History of Finance",
    "src": "https://wyandanchlibrary.com/read/business-history-of-finance",
    "words": 2024,
    "sections": [
      "Overview",
      "From Barter to Banking: The Ancient Foundations",
      "The Corporate Revolution",
      "The Great Divergence: Law, Property Rights, and Financial Development",
      "Corporate Governance Models Around the World",
      "Four Waves of Financial Innovation"
    ],
    "track": "macro",
    "rung": 8,
    "note": "How the institutions got their present shape. Useful precisely because every mechanism in this building looks inevitable until you see what it replaced.",
    "stub": false
  },
  {
    "slug": "behavioral-finance",
    "title": "Behavioral Finance: Kahneman, Tversky & Beyond",
    "src": "https://wyandanchlibrary.com/read/behavioral-finance",
    "words": 2070,
    "sections": [
      "Overview",
      "Prospect Theory: The Foundation",
      "System 1 and System 2: Two Modes of Thinking",
      "Anchoring: The Tyranny of the First Number",
      "Overconfidence: The Most Dangerous Bias",
      "The Disposition Effect: Selling Winners, Holding Losers"
    ],
    "track": "practitioner",
    "rung": 8,
    "note": "Kahneman and Tversky and what followed. Loss aversion, the disposition effect and overconfidence are the mechanisms behind half the chips in this game.",
    "stub": false
  },
  {
    "slug": "druckenmiller-principles",
    "title": "Druckenmiller: Principles from Practice",
    "src": "https://wyandanchlibrary.com/read/druckenmiller-principles",
    "words": 2007,
    "sections": [
      "Overview",
      "Concentration Over Diversification",
      "Liquidity Drives Everything",
      "The Fat Pitch",
      "Soros and Risk Management",
      "Top-Down Macro Framework"
    ],
    "track": "practitioner",
    "rung": 8,
    "note": "Concentration and position sizing from someone who did both aggressively. A useful argument with rung two's case for diversification rather than a confirmation of it.",
    "stub": false
  },
  {
    "slug": "engines-that-move-markets",
    "title": "Engines That Move Markets",
    "src": "https://wyandanchlibrary.com/read/engines-that-move-markets",
    "words": 3041,
    "sections": [
      "Overview",
      "The Core Thesis: Technology Revolutions Follow Predictable Patterns",
      "Railroads: The Original Technology Boom",
      "Radio and the 1920s: RCA as the NVDA of Its Day",
      "Automobiles: Hundreds of Manufacturers to the Big Three",
      "Electronics and Semiconductors: The Transistor Revolution"
    ],
    "track": "macro",
    "rung": 8,
    "note": "The plumbing: who actually moves size, through what channels, and why flows explain more short-run price action than fundamentals do.",
    "stub": false
  },
  {
    "slug": "taleb-incerto",
    "title": "Incerto: Fooled by Randomness, Black Swan, Antifragile",
    "src": "https://wyandanchlibrary.com/read/taleb-incerto",
    "words": 2269,
    "sections": [
      "Overview",
      "Fooled by Randomness: Luck, Skill, and Survivorship Bias",
      "The Black Swan: Rarity, Impact, and the Limits of Prediction",
      "Fat Tails and the Failure of Standard Risk Models",
      "The Turkey Problem",
      "Antifragile: Beyond Robustness"
    ],
    "track": "practitioner",
    "rung": 8,
    "note": "The turkey, the black swan, and the general problem of inferring safety from a quiet sample. Pairs directly with rung nine on why the bell curve understates the days that matter.",
    "stub": false
  },
  {
    "slug": "schwager-market-wizards",
    "title": "Market Wizards",
    "src": "https://wyandanchlibrary.com/read/schwager-market-wizards",
    "words": 3111,
    "sections": [
      "Overview",
      "The Common Thread: What Separates Wizards from Everyone Else",
      "Risk Management as the Non-Negotiable",
      "The Macro Traders",
      "The Trend Followers",
      "The Fundamental Traders"
    ],
    "track": "practitioner",
    "rung": 8,
    "note": "Interviews across wildly different strategies. The interesting finding is what the successful ones share, which is risk discipline rather than any view of the market.",
    "stub": false
  },
  {
    "slug": "marks-oaktree-memos",
    "title": "Oaktree Capital Memos",
    "src": "https://wyandanchlibrary.com/read/marks-oaktree-memos",
    "words": 2333,
    "sections": [
      "Overview",
      "Second-Level Thinking",
      "Risk is Not Volatility",
      "Market Cycles: The Pendulum",
      "Contrarian Investing",
      "Luck vs. Skill"
    ],
    "track": "practitioner",
    "rung": 8,
    "note": "Where rung eight's separation of forecasting from cycle-reading comes from, along with second-level thinking and 'we cannot predict, but we can prepare'.",
    "stub": false
  },
  {
    "slug": "tudor-jones-principles",
    "title": "Paul Tudor Jones: The Art of Macro Trading",
    "src": "https://wyandanchlibrary.com/read/tudor-jones-principles",
    "words": 4005,
    "sections": [
      "Overview",
      "The 1987 Crash Trade",
      "Defense First: \"Play Great Defense\"",
      "The 200-Day Moving Average",
      "\"Losers Average Losers\"",
      "Asymmetric Risk/Reward: The 5:1 Framework"
    ],
    "track": "practitioner",
    "rung": 8,
    "note": "Macro trading as defence first. His stated rule — that the most important thing is playing great defence, not offence — is rung five's drawdown lesson in a practitioner's words.",
    "stub": false
  },
  {
    "slug": "soros-reflexivity",
    "title": "The Alchemy of Finance & Reflexivity",
    "src": "https://wyandanchlibrary.com/read/soros-reflexivity",
    "words": 3072,
    "sections": [
      "Overview",
      "The Two Functions: Cognitive and Manipulative",
      "Why Equilibrium Theory Is Wrong",
      "The Boom-Bust Model",
      "Fallibility and the Human Uncertainty Principle",
      "The Real-Time Experiment"
    ],
    "track": "practitioner",
    "rung": 8,
    "note": "The primary source for rung eight. Beliefs alter fundamentals which alter beliefs, and markets can therefore be wrong in a way that makes themselves right.",
    "stub": false
  },
  {
    "slug": "econometrics-and-fx",
    "title": "Econometrics & FX",
    "src": "https://wyandanchlibrary.com/read/econometrics-and-fx",
    "words": 1807,
    "sections": [
      "Overview",
      "Time Series Fundamentals",
      "Regression in Finance",
      "FX Market Dynamics: Interest Rate Parity",
      "Macro Frameworks Quantified",
      "Regime Detection"
    ],
    "track": "macro",
    "rung": 9,
    "note": "Applied time-series work on the largest market in the world, and a good stress test of rung nine's claim that magnitude is forecastable and direction is not.",
    "stub": false
  },
  {
    "slug": "garch-101",
    "title": "GARCH 101",
    "src": "https://wyandanchlibrary.com/read/garch-101",
    "words": 2050,
    "sections": [
      "Overview",
      "Why Constant Volatility Is Wrong",
      "The ARCH Model",
      "GARCH(1,1): The Workhorse",
      "Estimation: Maximum Likelihood",
      "Asymmetric Extensions: The Leverage Effect"
    ],
    "track": "quantitative",
    "rung": 9,
    "note": "The formal version of rung nine. Volatility clusters, so today's variance is forecastable from yesterday's shock and yesterday's forecast.",
    "stub": false
  },
  {
    "slug": "quant-foundations",
    "title": "Quantitative Foundations",
    "src": "https://wyandanchlibrary.com/read/quant-foundations",
    "words": 1918,
    "sections": [
      "Overview",
      "Probability Distributions: The Shape of Returns",
      "Bayesian Inference for Finance",
      "The Kelly Criterion: Optimal Bet Sizing",
      "Linear Algebra for Portfolios",
      "Stochastic Processes: Modeling Price Dynamics"
    ],
    "track": "quantitative",
    "rung": 9,
    "note": "The probability and linear algebra the later pieces assume. Start here if the factor-model material reads as notation rather than argument.",
    "stub": false
  },
  {
    "slug": "stochastic-volatility-models",
    "title": "Stochastic Volatility Models",
    "src": "https://wyandanchlibrary.com/read/stochastic-volatility-models",
    "words": 1870,
    "sections": [
      "Overview",
      "Why Black-Scholes Fails",
      "The Heston Model",
      "The SABR Model",
      "Calibration Challenges",
      "Local Vol vs. Stochastic Vol"
    ],
    "track": "quantitative",
    "rung": 9,
    "note": "The step beyond GARCH: volatility gets its own equation, its own mean reversion and its own volatility — which is why options are genuinely hard to price.",
    "stub": false
  },
  {
    "slug": "differential-machine-learning",
    "title": "Differential Machine Learning",
    "src": "https://wyandanchlibrary.com/read/differential-machine-learning",
    "words": 1828,
    "sections": [
      "Overview",
      "The Pricing Problem: Why Monte Carlo Is Not Enough",
      "Automatic Differentiation",
      "The Key Insight: Training on Prices AND Greeks",
      "Architecture and Training",
      "The Speedup: 1000x Over Monte Carlo"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "Modern pricing and risk with machine learning, for after the classical material is comfortable. The most advanced thing in the collection.",
    "stub": false
  },
  {
    "slug": "theory-to-application",
    "title": "From Theory to Application",
    "src": "https://wyandanchlibrary.com/read/theory-to-application",
    "words": 1821,
    "sections": [
      "Overview",
      "Single-Asset Behavior: Mean Reversion vs. Trend Following",
      "Jump Diffusion Models",
      "Autoregressive Models and Model Selection",
      "Stationarity Testing",
      "Pairs Trading and Cointegration"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "The bridge piece: where clean theory meets costs, constraints and data that does not behave.",
    "stub": false
  },
  {
    "slug": "gappy-lecture-1-alpha-research",
    "title": "Gappy Lecture 1: Alpha Research",
    "src": "https://wyandanchlibrary.com/read/gappy-lecture-1-alpha-research",
    "words": 1980,
    "sections": [
      "Overview",
      "What Alpha Actually Is",
      "The Information Coefficient",
      "The Fundamental Law of Active Management",
      "Signal Construction",
      "Signal Testing and Multiple Testing Correction"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "How a systematic shop actually looks for a signal, and the discipline that stops the search from manufacturing one.",
    "stub": false
  },
  {
    "slug": "gappy-lecture-2-factor-models",
    "title": "Gappy Lecture 2: Factor Models",
    "src": "https://wyandanchlibrary.com/read/gappy-lecture-2-factor-models",
    "words": 1920,
    "sections": [
      "Overview",
      "Single-Factor CAPM",
      "Fama-French 3-Factor Model",
      "Carhart 4-Factor Model",
      "Fama-French 5-Factor Model",
      "Factor Construction Mechanics"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "The machinery behind rung ten: decomposing a return into exposures, and what is genuinely left over afterwards.",
    "stub": false
  },
  {
    "slug": "gappy-lecture-3-factor-evaluation",
    "title": "Gappy Lecture 3: Factor Evaluation",
    "src": "https://wyandanchlibrary.com/read/gappy-lecture-3-factor-evaluation",
    "words": 2271,
    "sections": [
      "Overview",
      "Statistical Significance: The t > 3 Rule",
      "Economic Rationale: Risk-Based vs. Behavioral Explanations",
      "Out-of-Sample Testing",
      "Robustness Checks",
      "Factor Crowding"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "How to tell a real factor from an artefact of the backtest. The most directly useful piece in the whole collection for anyone tempted by a strategy that worked on history.",
    "stub": false
  },
  {
    "slug": "market-microstructure-trading",
    "title": "Market Microstructure & Trading",
    "src": "https://wyandanchlibrary.com/read/market-microstructure-trading",
    "words": 1808,
    "sections": [
      "Overview",
      "Order Book Mechanics",
      "Depth Imbalance Signals",
      "Order Flow Metrics",
      "Microprice",
      "Fat-Tailed Risk Management"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "The source for table eight and rung ten. Order books, adverse selection and the real cost of crossing a spread at size.",
    "stub": false
  },
  {
    "slug": "model-implementation",
    "title": "Model Implementation",
    "src": "https://wyandanchlibrary.com/read/model-implementation",
    "words": 1764,
    "sections": [
      "Overview",
      "The Black-Scholes Derivation: From GBM to Closed Form",
      "The Complete Greeks Taxonomy",
      "The Business Economics of Options",
      "Physical Power Markets",
      "Credit Markets: CDS, Interest Rate Swaps, and Swaptions"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "The distance between a model that works in a notebook and one that survives production. Mostly about the failures nobody publishes.",
    "stub": false
  },
  {
    "slug": "physical-financial-commodities",
    "title": "Physical & Financial Commodities",
    "src": "https://wyandanchlibrary.com/read/physical-financial-commodities",
    "words": 1795,
    "sections": [
      "Overview",
      "Physical Commodity Markets",
      "Term Structure: Contango, Backwardation, and Convenience Yield",
      "Basis Trading",
      "Commodity Derivatives and Structured Products",
      "Commodity Curve Bootstrapping and the Nelson-Siegel Model"
    ],
    "track": "macro",
    "rung": 10,
    "note": "Where a financial contract meets a physical barrel. Storage, carry and delivery are the clearest available illustration of why a price is not one number.",
    "stub": false
  },
  {
    "slug": "portfolio-construction",
    "title": "Portfolio Construction",
    "src": "https://wyandanchlibrary.com/read/portfolio-construction",
    "words": 2266,
    "sections": [
      "Overview",
      "Markowitz Mean-Variance Optimization",
      "The Covariance Matrix Problem",
      "The Black-Litterman Model",
      "Risk Parity",
      "The Kelly Criterion at Portfolio Level"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "Turning a set of views into a set of weights — covariance, constraints and why the optimiser's answer is usually too confident to trade.",
    "stub": false
  },
  {
    "slug": "quasi-random-number-generation",
    "title": "Quasi-Random Number Generation",
    "src": "https://wyandanchlibrary.com/read/quasi-random-number-generation",
    "words": 2506,
    "sections": [
      "Overview",
      "Monte Carlo in Finance",
      "The Problem with Pseudo-Random Numbers",
      "Low-Discrepancy Sequences",
      "Halton Sequences",
      "Sobol Sequences"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "Low-discrepancy sequences and why they beat pseudo-random draws in high-dimensional Monte Carlo. Narrow, and genuinely useful if you ever simulate anything.",
    "stub": false
  },
  {
    "slug": "systematic-indices",
    "title": "Systematic Indices",
    "src": "https://wyandanchlibrary.com/read/systematic-indices",
    "words": 1838,
    "sections": [
      "Overview",
      "Factor Definitions: Value, Momentum, and Quality",
      "The Black-Litterman Model",
      "Ledoit-Wolf Shrinkage",
      "Risk Parity",
      "Transaction Cost Analysis: Almgren-Chriss Optimal Execution"
    ],
    "track": "quantitative",
    "rung": 10,
    "note": "How an index is actually constructed, and why 'passive' is a rules-based active decision that somebody made on your behalf.",
    "stub": false
  }
];

export const byTrack = (t) => SHELF.filter((e) => e.track === t);
export const totalWords = SHELF.reduce((a, e) => a + e.words, 0);
/** A rough minutes-to-read at a steady 220 words a minute. */
export const readingTime = (w) => Math.max(1, Math.round(w / 220));
