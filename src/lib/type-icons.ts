// The 18 type icons shown beside each form's types: a coloured disc with a simple glyph. They're original drawings,
// not the games' icons. Pure, so the page builds its sprite from here and the tests can check every icon.

/**
 * Each glyph sits in a 16×16 box on a disc of radius 8. `fill` paths use the even-odd rule, so inner shapes cut holes.
 * `stroke` lines are drawn in the glyph's colour, and `cut` lines in the disc's, to carve detail into a filled shape.
 */
export interface TypeIcon {
  colour: string;
  fill?: string;
  stroke?: string;
  cut?: string;
}

const r = (n: number) => Math.round(n * 100) / 100;

function polygon(points: [number, number][]): string {
  return `M${points.map(([x, y]) => `${r(x)} ${r(y)}`).join("L")}Z`;
}

/** Points evenly around a centre, alternating between two radii when `inner` is given. */
function ring(count: number, outer: number, inner: number | null, turn = 0): [number, number][] {
  const points: [number, number][] = [];
  const steps = inner === null ? count : count * 2;
  for (let i = 0; i < steps; i++) {
    const radius = inner !== null && i % 2 === 1 ? inner : outer;
    const angle = ((turn + (i * 360) / steps - 90) * Math.PI) / 180;
    points.push([8 + radius * Math.cos(angle), 8 + radius * Math.sin(angle)]);
  }
  return points;
}

/** A full circle as two arcs, drawn clockwise. */
const circle = (cx: number, cy: number, radius: number) =>
  `M${r(cx - radius)} ${cy}a${radius} ${radius} 0 1 1 ${r(radius * 2)} 0a${radius} ${radius} 0 1 1 ${r(-radius * 2)} 0Z`;

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${r(cx - rx)} ${cy}a${rx} ${ry} 0 1 1 ${r(rx * 2)} 0a${rx} ${ry} 0 1 1 ${r(-rx * 2)} 0Z`;

/** A bar with round ends, as a stroke from one end to the other. */
function spoke(angle: number, length: number): string {
  const a = (angle * Math.PI) / 180;
  const dx = (Math.cos(a) * length) / 2;
  const dy = (Math.sin(a) * length) / 2;
  return `M${r(8 - dx)} ${r(8 - dy)}L${r(8 + dx)} ${r(8 + dy)}`;
}

export const TYPE_ICONS = {
  normal: { colour: "#8a8a6c", stroke: circle(8, 8, 3.3) },
  fire: {
    colour: "#d9541c",
    fill:
      "M8 2.9C8.7 4.7 11.8 6.1 11.8 9.4A3.8 3.8 0 0 1 4.2 9.4C4.2 7.8 5 6.7 5.9 6C5.9 7.3 6.4 8.1 7.1 8.5C6.9 6.6 7.2 4.5 8 2.9Z" +
      "M8 8.9C8.6 9.8 9.5 10.4 9.5 11.3A1.5 1.5 0 0 1 6.5 11.3C6.5 10.4 7.4 9.8 8 8.9Z",
  },
  water: { colour: "#3f6fd8", fill: "M8 3C9.3 5.2 11.4 7.3 11.4 9.6A3.4 3.4 0 0 1 4.6 9.6C4.6 7.3 6.7 5.2 8 3Z" },
  grass: {
    colour: "#3f8f2c",
    fill: "M4 12C3.8 7.4 6.6 4.1 12 4C11.9 9.4 8.6 12.2 4 12Z" + "M5.2 11.3L10.5 5.1L10.9 5.5L5.6 11.7Z",
  },
  electric: { colour: "#f2c623", fill: "M9.4 2.7L4.5 9.1H7.6L6.6 13.3L11.5 6.8H8.4Z" },
  ice: { colour: "#7fd3d3", stroke: [0, 60, 120].map((angle) => spoke(angle + 90, 9)).join("") },
  fighting: { colour: "#b3261e", fill: polygon(ring(8, 5, 2.6, 22.5)) },
  poison: { colour: "#8e3b97", fill: circle(6.2, 10, 2.6) + circle(10.5, 8, 1.9) + circle(7.3, 5, 1.3) },
  ground: {
    colour: "#b08a3a",
    fill:
      "M4 10.5H12A0.75 0.75 0 0 1 12 12H4A0.75 0.75 0 0 1 4 10.5Z" +
      "M5.2 7.8H10.8A0.75 0.75 0 0 1 10.8 9.3H5.2A0.75 0.75 0 0 1 5.2 7.8Z" +
      "M6.4 5.1H9.6A0.75 0.75 0 0 1 9.6 6.6H6.4A0.75 0.75 0 0 1 6.4 5.1Z",
  },
  flying: {
    colour: "#7b6fd0",
    fill:
      "M3.5 4.6C6.6 4.4 10.4 5.6 12.8 8.6C11.4 8.4 10.2 8.6 9.2 9C10.2 9.3 11 9.9 11.6 10.7C10.2 10.7 9 10.9 8 11.5" +
      "C8.6 11.9 9 12.3 9.3 12.9C6.3 12.9 3.5 10.2 3.5 4.6Z",
  },
  psychic: {
    colour: "#d9447a",
    stroke:
      "M8.4 8.1A0.8 0.8 0 0 0 7.6 7.3A1.6 1.6 0 0 0 6 8.9A2.4 2.4 0 0 0 8.4 11.3A3.2 3.2 0 0 0 11.6 8.1A4 4 0 0 0 7.6 4.1",
  },
  bug: {
    colour: "#7d8f17",
    fill: ellipse(8, 9.6, 3.3, 3.4) + ellipse(8, 5.5, 1.6, 1.1) + "M7.7 7H8.3V12.4H7.7Z",
    stroke: "M7.2 4.7C6.6 3.6 5.6 3.2 4.6 3.4M8.8 4.7C9.4 3.6 10.4 3.2 11.4 3.4",
  },
  rock: {
    colour: "#9a8436",
    fill: polygon([
      [5, 5.9],
      [8.6, 3.6],
      [12, 5.8],
      [12.5, 10.1],
      [9.4, 12.6],
      [4.6, 11.9],
      [3.5, 8.4],
    ]),
    cut: "M5 5.9L7.4 8.4L12 5.8M7.4 8.4L9.4 12.6",
  },
  ghost: {
    colour: "#62508e",
    fill:
      "M4.4 12.7V7.7A3.6 3.6 0 0 1 11.6 7.7V12.7L10.4 11.7L9.2 12.7L8 11.7L6.8 12.7L5.6 11.7Z" +
      ellipse(6.6, 7.7, 0.7, 0.95) +
      ellipse(9.4, 7.7, 0.7, 0.95),
  },
  dragon: {
    colour: "#5a3fd1",
    fill: "M3.2 8C5 5.2 11 5.2 12.8 8C11 10.8 5 10.8 3.2 8Z" + "M8 5.9C8.8 6.8 8.8 9.2 8 10.1C7.2 9.2 7.2 6.8 8 5.9Z",
  },
  dark: { colour: "#5e4a3e", fill: "M10.3 3.6A4.7 4.7 0 1 0 10.3 12.4A3.9 3.9 0 1 1 10.3 3.6Z" },
  steel: { colour: "#6d8a9e", fill: polygon(ring(6, 4.7, null, 30)) + circle(8, 8, 1.9) },
  fairy: {
    colour: "#d36f97",
    fill: "M8 3Q8.6 7.4 13 8Q8.6 8.6 8 13Q7.4 8.6 3 8Q7.4 7.4 8 3Z",
  },
} satisfies Record<string, TypeIcon>;

export type TypeName = keyof typeof TYPE_ICONS;

export function isTypeName(value: string): value is TypeName {
  return Object.hasOwn(TYPE_ICONS, value);
}

export const GLYPH_LIGHT = "#ffffff";
export const GLYPH_DARK = "#1a1e24";

function channel(hex: string, at: number): number {
  const c = parseInt(hex.slice(at, at + 2), 16) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG contrast ratio, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** White wherever it stands out from the disc by 3:1 (WCAG's bar for graphics), otherwise dark ink. */
export function glyphColour(disc: string): string {
  return contrast(disc, GLYPH_LIGHT) >= 3 ? GLYPH_LIGHT : GLYPH_DARK;
}

/** One `<symbol id="type-…">` per type, for a hidden sprite the list's rows point into with `<use>`. */
export function typeSymbols(): string {
  return Object.entries(TYPE_ICONS)
    .map(([name, icon]: [string, TypeIcon]) => {
      const glyph = glyphColour(icon.colour);
      const fill = icon.fill ? `<path d="${icon.fill}" fill="${glyph}" fill-rule="evenodd"/>` : "";
      const stroke = icon.stroke
        ? `<path d="${icon.stroke}" fill="none" stroke="${glyph}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
        : "";
      const cut = icon.cut
        ? `<path d="${icon.cut}" fill="none" stroke="${icon.colour}" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"/>`
        : "";
      return `<symbol id="type-${name}" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="${icon.colour}"/>${fill}${stroke}${cut}</symbol>`;
    })
    .join("");
}
