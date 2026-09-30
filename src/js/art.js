// Game tile artwork.
//
// Inline SVG rather than image files: it scales to any tile size, costs no network requests,
// carries no licence to track (house rule — never ship CC-BY-NC in a product being sold), and
// recolours from each table's accent so the floor reads as nine distinct places.
//
// Every scene is drawn on a 160x104 stage and is meant to be legible at thumbnail size, so the
// shapes are large and the palette is high-contrast. Nothing here depicts a real brand.

const defs = (id, a) => `
  <defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}" stop-opacity="0.10"/>
      <stop offset="55%" stop-color="#1d1d1d" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#141414"/>
    </linearGradient>
    <linearGradient id="gold${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b9a884"/><stop offset="55%" stop-color="#9a8a63"/>
      <stop offset="100%" stop-color="#7d7053"/>
    </linearGradient>
    <!-- Was a fixed violet, which meant nine tables all wore the same purple.
         Driving it from the table's own accent is both quieter and more useful:
         it is now the one place each scene says which table it belongs to. -->
    <linearGradient id="vio${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${a}" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="glow${id}" cx="50%" cy="46%" r="58%">
      <stop offset="0%" stop-color="${a}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${a}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft${id}" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>
  <rect width="160" height="104" fill="url(#bg${id})"/>
  <ellipse cx="80" cy="54" rx="58" ry="40" fill="url(#glow${id})" opacity="0.22"/>`;

const card = (x, y, rot, fill = "#e8e8e8") => `
  <g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-16" y="-23" width="32" height="46" rx="5" fill="${fill}" stroke="rgba(0,0,0,0.25)"/>
  </g>`;

/** Each scene is a function of its accent colour so nine tables read as nine places. */
const SCENES = {
  // Slots — three lit reel windows with symbols spinning behind glass.
  reels: (a) => `
    ${defs("re", a)}
    <g>
      ${[26, 62, 98].map((x, i) => `
        <rect x="${x}" y="24" width="34" height="56" rx="6" fill="#181818" stroke="${a}" stroke-opacity="0.5"/>
        <rect x="${x + 3}" y="27" width="28" height="50" rx="4" fill="#1d1d1d"/>
        ${i === 0 ? `<circle cx="${x + 17}" cy="52" r="11" fill="url(#goldre)"/>
                     <circle cx="${x + 17}" cy="52" r="5" fill="#141414" opacity="0.35"/>`
         : i === 1 ? `<path d="M${x + 17} 40 L${x + 28} 52 L${x + 17} 64 L${x + 6} 52 Z" fill="url(#viore)"/>`
         : `<rect x="${x + 8}" y="43" width="18" height="18" rx="3" fill="${a}"/>`}`).join("")}
      <rect x="20" y="49" width="120" height="6" rx="3" fill="url(#goldre)" opacity="0.35"/>
    </g>`,

  // Blackjack — a two-card hand, an ace over a face card.
  sizing: (a) => `
    ${defs("sz", a)}
    ${card(66, 56, -13)}
    ${card(92, 54, 9)}
    <text x="58" y="48" font-family="Georgia,serif" font-size="15" font-weight="700" fill="#212121" transform="rotate(-13 58 48)">A</text>
    <text x="58" y="66" font-size="14" fill="#181818" transform="rotate(-13 58 66)">♠</text>
    <text x="96" y="48" font-family="Georgia,serif" font-size="15" font-weight="700" fill="#b4525f" transform="rotate(9 96 48)">K</text>
    <text x="96" y="66" font-size="14" fill="#b4525f" transform="rotate(9 96 66)">♥</text>
    <circle cx="34" cy="70" r="13" fill="url(#viosz)" stroke="#fff" stroke-opacity="0.5" stroke-dasharray="3 3"/>
    <circle cx="34" cy="62" r="13" fill="${a}" stroke="#fff" stroke-opacity="0.55" stroke-dasharray="3 3"/>`,

  // Roulette — the wheel seen at an angle, alternating pockets and a single green zero.
  wheel: (a) => `
    ${defs("wh", a)}
    <ellipse cx="80" cy="60" rx="46" ry="30" fill="#181818" opacity="0.7" filter="url(#softwh)"/>
    <ellipse cx="80" cy="54" rx="46" ry="30" fill="#212121" stroke="url(#goldwh)" stroke-width="2.5"/>
    ${Array.from({ length: 18 }, (_, i) => {
      const t = (i / 18) * Math.PI * 2;
      const x1 = 80 + Math.cos(t) * 44, y1 = 54 + Math.sin(t) * 28;
      const x2 = 80 + Math.cos(t) * 22, y2 = 54 + Math.sin(t) * 14;
      const col = i === 0 ? "#5f7d68" : i % 2 ? "#8f5b63" : "#1d1d1d";
      return `<path d="M${x1} ${y1} L${x2} ${y2} L${80 + Math.cos(t + 0.35) * 22} ${54 + Math.sin(t + 0.35) * 14}
              L${80 + Math.cos(t + 0.35) * 44} ${54 + Math.sin(t + 0.35) * 28} Z" fill="${col}"/>`;
    }).join("")}
    <ellipse cx="80" cy="54" rx="22" ry="14" fill="url(#viowh)"/>
    <ellipse cx="80" cy="54" rx="8" ry="5" fill="url(#goldwh)"/>
    <circle cx="106" cy="44" r="4" fill="#fff"/>`,

  // Baccarat — two hands facing each other across the felt.
  twohands: (a) => `
    ${defs("th", a)}
    ${card(46, 54, -10)}${card(66, 52, 6)}
    ${card(96, 52, -6)}${card(116, 54, 10)}
    <text x="40" y="58" font-size="13" fill="#b4525f" transform="rotate(-10 40 58)">♦</text>
    <text x="62" y="58" font-size="13" fill="#181818" transform="rotate(6 62 58)">♣</text>
    <text x="92" y="58" font-size="13" fill="#181818" transform="rotate(-6 92 58)">♠</text>
    <text x="113" y="58" font-size="13" fill="#b4525f" transform="rotate(10 113 58)">♥</text>
    <rect x="70" y="18" width="20" height="14" rx="7" fill="url(#goldth)"/>
    <text x="80" y="29" font-size="9" font-weight="700" fill="#1d1d1d" text-anchor="middle">5%</text>`,

  // Craps — a pair of dice mid-roll.
  pit: (a) => `
    ${defs("pt", a)}
    <g transform="rotate(-14 56 58)">
      <rect x="34" y="36" width="44" height="44" rx="9" fill="#e8e8e8" stroke="rgba(0,0,0,0.2)"/>
      ${[[46, 48], [66, 48], [46, 68], [66, 68], [56, 58]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="4.2" fill="#b4525f"/>`).join("")}
    </g>
    <g transform="rotate(12 108 60)">
      <rect x="88" y="40" width="40" height="40" rx="8" fill="url(#viopt)" stroke="rgba(255,255,255,0.25)"/>
      ${[[99, 51], [117, 51], [99, 69], [117, 69]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="3.8" fill="#fff"/>`).join("")}
    </g>`,

  // Keno — numbered balls tumbling out of the draw.
  chase: (a) => `
    ${defs("ch", a)}
    ${[[44, 62, 17, "#d39a6a", "7"], [78, 48, 19, "url(#violch)", "23"], [112, 64, 16, a, "41"]]
      .map(([x, y, r, fill, n]) => `
        <circle cx="${x}" cy="${y}" r="${r}" fill="${fill === "url(#violch)" ? "url(#vioch)" : fill}"
                stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
        <ellipse cx="${x - r * 0.3}" cy="${y - r * 0.4}" rx="${r * 0.4}" ry="${r * 0.26}" fill="#fff" opacity="0.28"/>
        <text x="${x}" y="${+y + 5}" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`).join("")}`,

  // Crash — the curve climbing, and the point where it stops.
  climb: (a) => `
    ${defs("cl", a)}
    <path d="M18 88 C56 86 82 70 98 44 C106 31 112 22 118 16" fill="none"
          stroke="${a}" stroke-width="4" stroke-linecap="round"/>
    <path d="M18 88 C56 86 82 70 98 44 C106 31 112 22 118 16 L118 88 Z" fill="${a}" opacity="0.16"/>
    <circle cx="118" cy="16" r="7" fill="#fff"/>
    <circle cx="118" cy="16" r="13" fill="${a}" opacity="0.35" filter="url(#softcl)"/>
    <text x="30" y="34" font-size="15" font-weight="800" fill="url(#goldcl)">2.4×</text>`,

  // Live dealer — a stack of chips across the table from you.
  book: (a) => `
    ${defs("bk", a)}
    ${[76, 68, 60, 52].map((y, i) => `
      <ellipse cx="60" cy="${y}" rx="24" ry="8" fill="${i % 2 ? "#eb7485" : "#1d1d1d"}"
               stroke="rgba(255,255,255,0.32)" stroke-width="1.2"/>`).join("")}
    ${[72, 64].map((y, i) => `
      <ellipse cx="108" cy="${y}" rx="20" ry="7" fill="${i ? "url(#viobk)" : a}"
               stroke="rgba(255,255,255,0.3)" stroke-width="1.2"/>`).join("")}
    <path d="M22 30 H138" stroke="url(#goldbk)" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
    <circle cx="80" cy="22" r="5" fill="url(#goldbk)"/>`,

  // Sports — an odds board with the price ticking.
  line: (a) => `
    ${defs("ln", a)}
    <rect x="22" y="28" width="116" height="50" rx="8" fill="#181818" stroke="${a}" stroke-opacity="0.45"/>
    <rect x="30" y="36" width="44" height="14" rx="4" fill="${a}" opacity="0.30"/>
    <rect x="30" y="56" width="34" height="14" rx="4" fill="#ffffff" opacity="0.14"/>
    <text x="118" y="48" font-size="15" font-weight="800" fill="#80b28d" text-anchor="end">+140</text>
    <text x="118" y="68" font-size="15" font-weight="800" fill="#f0919e" text-anchor="end">−165</text>
    <circle cx="30" cy="22" r="3.5" fill="#d39a6a"/>
    <path d="M40 22 H132" stroke="#fff" stroke-opacity="0.12" stroke-width="2" stroke-linecap="round"/>`,
};

/** The SVG for one table, or a neutral plate for anything without a scene yet. */
export function tileArt(id, accent) {
  const scene = SCENES[id];
  const svg = scene
    ? scene(accent)
    : `${defs("df", accent)}<circle cx="80" cy="54" r="22" fill="url(#viodf)" opacity="0.7"/>`;
  return `<svg class="tile-art" viewBox="0 0 160 104" preserveAspectRatio="xMidYMid slice"
            aria-hidden="true" focusable="false">${svg}</svg>`;
}

/**
 * The hero scene: a wheel, a chip stack and a card, composed to sit on the right of the banner
 * the way the reference does. Drawn large because it is the one piece of art shown at size.
 */
export function heroArt() {
  return `
  <svg class="hero-art" viewBox="0 0 320 240" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hw" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#9a8fd4"/><stop offset="100%" stop-color="#6366f1"/>
      </linearGradient>
      <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d9c48d"/><stop offset="60%" stop-color="#c9a961"/>
        <stop offset="100%" stop-color="#7d7053"/>
      </linearGradient>
      <radialGradient id="hglow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#818cf8" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
      </radialGradient>
      <filter id="hblur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="12"/>
      </filter>
    </defs>

    <ellipse cx="170" cy="130" rx="120" ry="95" fill="url(#hglow)"/>

    <!-- the wheel, seen at an angle -->
    <ellipse cx="170" cy="150" rx="104" ry="62" fill="#141414" opacity="0.55" filter="url(#hblur)"/>
    <ellipse cx="170" cy="134" rx="104" ry="62" fill="#212121" stroke="url(#hg)" stroke-width="5"/>
    ${Array.from({ length: 22 }, (_, i) => {
      const t = (i / 22) * Math.PI * 2;
      const o = 0.2856;
      const x1 = 170 + Math.cos(t) * 99,  y1 = 134 + Math.sin(t) * 58;
      const x2 = 170 + Math.cos(t) * 52,  y2 = 134 + Math.sin(t) * 30;
      const x3 = 170 + Math.cos(t + o) * 52, y3 = 134 + Math.sin(t + o) * 30;
      const x4 = 170 + Math.cos(t + o) * 99, y4 = 134 + Math.sin(t + o) * 58;
      const col = i === 0 ? "#5f7d68" : i % 2 ? "#8f5b63" : "#1d1d1d";
      return `<path d="M${x1} ${y1} L${x2} ${y2} L${x3} ${y3} L${x4} ${y4} Z" fill="${col}"/>`;
    }).join("")}
    <ellipse cx="170" cy="134" rx="52" ry="30" fill="url(#hw)"/>
    <ellipse cx="170" cy="134" rx="20" ry="11" fill="url(#hg)"/>
    <circle cx="228" cy="110" r="8" fill="#fff"/>

    <!-- chips -->
    ${[186, 172, 158].map((y, i) => `
      <ellipse cx="60" cy="${y}" rx="34" ry="12" fill="${i === 1 ? "url(#hw)" : "#1d1d1d"}"
               stroke="rgba(255,255,255,0.35)" stroke-width="2"/>`).join("")}
    <ellipse cx="60" cy="146" rx="34" ry="12" fill="url(#hg)" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>

    <!-- a card, tilted, catching the light -->
    <g transform="rotate(16 268 78)">
      <rect x="244" y="40" width="50" height="72" rx="8" fill="#e8e8e8" stroke="rgba(0,0,0,0.25)"/>
      <text x="252" y="62" font-family="Georgia,serif" font-size="19" font-weight="700" fill="#212121">A</text>
      <text x="252" y="98" font-size="20" fill="#212121">♠</text>
    </g>
  </svg>`;
}

export const hasArt = (id) => Boolean(SCENES[id]);
