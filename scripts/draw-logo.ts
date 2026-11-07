// Draws the logo and the favicon, then writes src/components/Logo.astro and public/favicon.svg.
// Run `npm run draw:logo` after changing anything here, and look at both in a browser at real sizes.
//
// Six strands become three, following GO's formula. On the left, top to bottom: HP, Attack, Sp. Atk, Speed,
// Defense and Sp. Def. HP alone becomes Stamina, each pair merges, and Speed splits to boost Attack and Defense.
// SVG strokes can't change width, so every strand is a filled ribbon that widens as it moves right, and all
// three bands finish at the same thickness. Every strand reaches its band at the same point, and all of them are
// one colour.
//
// The drawing is square. The six strands are evenly spaced, and so are the three bands. Both columns share the
// same top and bottom edge, so HP runs into Stamina along one straight line, and Sp. Def into Defense along another.
import { writeFileSync } from "node:fs";

interface Layout {
  /** Width of each strand where it starts, on the left. */
  w0: number;
  /** Width of each finished band on the right. */
  W: number;
  /** The drawing's edges. Both columns of strands span top to bottom exactly. */
  top: number;
  bottom: number;
  /** Where the strands' round ends start, and where the bands' round ends finish. */
  xStart: number;
  xEnd: number;
  /** Where every strand reaches its band. */
  xMerge: number;
  /** Where Speed splits in two. */
  xSplit: number;
  /** How much of the Attack and Defense bands' width Speed supplies. */
  speedShare: number;
}

const HEADER: Layout = {
  w0: 3,
  W: 9,
  top: 2,
  bottom: 62,
  xStart: 2,
  xEnd: 62,
  xMerge: 42,
  xSplit: 10,
  speedShare: 2.4,
};

// Thicker strands, so they don't blur away at 16px.
const FAVICON: Layout = { ...HEADER, w0: 4.4, W: 11, speedShare: 3 };

/** Strand centres on the left and band centres on the right, evenly spaced between the drawing's edges. */
function centres({ w0, W, top, bottom }: Layout) {
  const step = (bottom - top - w0) / 5;
  const [hp, atk, spa, spe, def, spd] = [0, 1, 2, 3, 4, 5].map((i) => top + w0 / 2 + i * step) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const stamina = top + W / 2;
  const defense = bottom - W / 2;
  return {
    left: { hp, atk, spa, spe, def, spd },
    right: { stamina, attack: (stamina + defense) / 2, defense },
  };
}
const FAVICON_COLOURS = { from: "#7fb9b1", to: "#5fe0cf", background: "#10353a" };

const r = (n: number) => Math.round(n * 10) / 10;

interface Ribbon {
  x0: number;
  /** Top and bottom edges at x0. */
  a0: number;
  b0: number;
  x1: number;
  /** Top and bottom edges at x1. */
  a1: number;
  b1: number;
  roundLeft?: boolean;
}

/** A ribbon between two vertical spans, with flat tangents at both ends, so it has no kinks. */
function ribbon({ x0, a0, b0, x1, a1, b1, roundLeft = false }: Ribbon): string {
  const dx = (x1 - x0) / 2;
  const top = `C${r(x0 + dx)} ${r(a0)} ${r(x1 - dx)} ${r(a1)} ${r(x1)} ${r(a1)}`;
  const bottom = `C${r(x1 - dx)} ${r(b1)} ${r(x0 + dx)} ${r(b0)} ${r(x0)} ${r(b0)}`;
  const radius = r((b0 - a0) / 2);
  const close = roundLeft ? `A${radius} ${radius} 0 0 1 ${r(x0)} ${r(a0)}Z` : "Z";
  return `M${r(x0)} ${r(a0)}${top}L${r(x1)} ${r(b1)}${bottom}${close}`;
}

/** A finished band: square on the left where ribbons meet it, round on the right. */
function band(x0: number, x1: number, y: number, w: number): string {
  const h = w / 2;
  return `M${r(x0)} ${r(y - h)}H${r(x1 - h)}A${r(h)} ${r(h)} 0 0 1 ${r(x1 - h)} ${r(y + h)}H${r(x0)}Z`;
}

/**
 * Every strand as one path outline. Each piece is drawn clockwise, so where pieces overlap they stay filled, and the
 * small overlaps hide hairline seams.
 */
function shapes(p: Layout): string {
  const { w0, W, xStart, xEnd, xMerge, xSplit, speedShare } = p;
  const { left, right } = centres(p);
  const half = w0 / 2;
  // The round ends' centres, so the drawing starts at xStart.
  const x0 = xStart + half;
  const span = (y: number) => ({ a0: y - half, b0: y + half });
  const pairShare = W - speedShare;
  const parts: string[] = [];

  // HP: alone, widening into the top band.
  parts.push(
    ribbon({ x0, ...span(left.hp), x1: xMerge, a1: right.stamina - W / 2, b1: right.stamina + W / 2, roundLeft: true }),
  );

  // Attack: Atk and SpA fill the upper part of the band, leaving its lower edge for Speed.
  const aTop = right.attack - W / 2;
  const aMid = aTop + pairShare / 2;
  const aLow = aTop + pairShare;
  parts.push(ribbon({ x0, ...span(left.atk), x1: xMerge, a1: aTop, b1: aMid + 0.4, roundLeft: true }));
  parts.push(ribbon({ x0, ...span(left.spa), x1: xMerge, a1: aMid - 0.4, b1: aLow, roundLeft: true }));

  // Defense: Def and SpD fill the lower part of the band, leaving its upper edge for Speed.
  const dBottom = right.defense + W / 2;
  const dMid = dBottom - pairShare / 2;
  const dHigh = dBottom - pairShare;
  parts.push(ribbon({ x0, ...span(left.def), x1: xMerge, a1: dHigh, b1: dMid + 0.4, roundLeft: true }));
  parts.push(ribbon({ x0, ...span(left.spd), x1: xMerge, a1: dMid - 0.4, b1: dBottom, roundLeft: true }));

  // Speed: one strand that splits in two and fills the inner edge of both bands.
  const s = left.spe;
  parts.push(
    `M${r(x0)} ${r(s - half)}H${r(xSplit)}V${r(s + half)}H${r(x0)}A${r(half)} ${r(half)} 0 0 1 ${r(x0)} ${r(s - half)}Z`,
  );
  parts.push(
    ribbon({ x0: xSplit - 0.5, a0: s - half, b0: s + 0.3, x1: xMerge + 0.5, a1: aLow - 0.4, b1: right.attack + W / 2 }),
  );
  parts.push(
    ribbon({
      x0: xSplit - 0.5,
      a0: s - 0.3,
      b0: s + half,
      x1: xMerge + 0.5,
      a1: right.defense - W / 2,
      b1: dHigh + 0.4,
    }),
  );

  // The three bands, all starting where the strands reach them.
  for (const y of [right.stamina, right.attack, right.defense]) parts.push(band(xMerge - 0.5, xEnd, y, W));
  return parts.join("");
}

// The header logo takes its colours from CSS variables in src/site/global.css, so it follows light and dark mode.
const header = shapes(HEADER);
const logo = `---
// Generated by scripts/draw-logo.ts. Edit that script and run \`npm run draw:logo\`; don't edit this file.
// Six strands become three, following GO's formula. Top to bottom on the left they're HP, Attack, Sp. Atk, Speed,
// Defense and Sp. Def. HP alone becomes Stamina, each pair merges, and Speed splits to boost GO Attack and GO Defense.
// Every strand reaches its band at the same point. Both columns share one top and one bottom edge, and the drawing
// is square.
---

<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="logo-strand" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="0">
      <stop offset="0" stop-color="var(--logo-from)"></stop>
      <stop offset="0.75" stop-color="var(--logo-to)"></stop>
    </linearGradient>
  </defs>
  <path fill="url(#logo-strand)" d="${header}"></path>
</svg>
`;

// The favicon can't read the page's CSS, so its colours are fixed. The 64×64 drawing is scaled to 80% and centred.
const icon = shapes(FAVICON);
const c = FAVICON_COLOURS;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="m" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="0"><stop offset="0" stop-color="${c.from}"/><stop offset=".75" stop-color="${c.to}"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="${c.background}"/><g transform="translate(6.4 6.4) scale(.8)"><path fill="url(#m)" d="${icon}"/></g></svg>
`;

const root = new URL("../", import.meta.url);
writeFileSync(new URL("src/components/Logo.astro", root), logo);
writeFileSync(new URL("public/favicon.svg", root), favicon);
console.log("wrote src/components/Logo.astro and public/favicon.svg");
