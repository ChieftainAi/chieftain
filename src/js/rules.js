// House Rules as its own page. These are the permanent commitments, so they get a
// route you can link someone to rather than a block buried at the bottom of the floor.
export function view() {
  return `
    <section class="hero hero--narrow">
      <p class="eyebrow">The commitments</p>
      <h1>House rules</h1>
      <p class="lede">These are permanent, and they are the reason this is a teaching tool and
      not a slot app. Every one of them costs us a retention trick a real casino would use.</p>
    </section>

    <div class="rules">
      <article class="rule">
        <span class="rule-n">01</span>
        <h2>Nothing is redeemable</h2>
        <p>No money in, no cash out, no trading chips, no transfers between players. Not now, and
        not as a feature request. Chips are a scorekeeping device and nothing else.</p>
      </article>
      <article class="rule">
        <span class="rule-n">02</span>
        <h2>No near-miss theatre</h2>
        <p>The single mechanic casinos lean on hardest — showing you the jackpot symbol landing
        just above the payline — is the one thing this game will never fake. When you lose, you
        lose plainly.</p>
      </article>
      <article class="rule">
        <span class="rule-n">03</span>
        <h2>The edge is always a real cost</h2>
        <p>A fee, a spread, inflation, tax, vig. Never a rigged random number. If the house takes
        2% here, it is taking it the same way a 2% expense ratio takes it from you in real life,
        and the number is printed where you can watch it happen.</p>
      </article>
      <article class="rule">
        <span class="rule-n">04</span>
        <h2>You always see the counterfactual</h2>
        <p>Beside every table is what the boring, diversified, low-fee choice would have returned
        over your exact same draws. Not a better set of draws — yours.</p>
      </article>
      <article class="rule">
        <span class="rule-n">05</span>
        <h2>Progress comes from understanding</h2>
        <p>Tables and concepts unlock when you have demonstrated you follow the maths, never
        because you have wagered enough volume to earn it.</p>
      </article>
    </div>`;
}

export function mount() {}
export function unmount() {}
