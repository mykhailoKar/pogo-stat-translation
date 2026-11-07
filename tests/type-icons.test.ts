// Every type the list shows needs an icon, and every icon's glyph must stand out from its disc.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GLYPH_DARK,
  GLYPH_LIGHT,
  TYPE_ICONS,
  contrast,
  glyphColour,
  isTypeName,
  typeSymbols,
  type TypeIcon,
} from "../src/lib/type-icons.ts";
import { loadDataset } from "../src/site/load-dataset.ts";

const icons: [string, TypeIcon][] = Object.entries(TYPE_ICONS);

describe("type icons", () => {
  it("covers every type in the dataset, and no others", () => {
    const types = new Set(loadDataset().pokemon.flatMap((p) => p.types));
    assert.deepEqual(
      [...types].filter((type) => !isTypeName(type)),
      [],
    );
    assert.deepEqual(
      Object.keys(TYPE_ICONS).filter((name) => !types.has(name)),
      [],
    );
    assert.equal(types.size, 18);
  });

  it("gives every glyph at least 3:1 against its disc", () => {
    for (const [name, icon] of icons) {
      const ratio = contrast(icon.colour, glyphColour(icon.colour));
      assert.ok(ratio >= 3, `${name}: ${ratio.toFixed(2)}`);
    }
  });

  it("draws something for every type", () => {
    for (const [name, icon] of icons) {
      assert.ok((icon.fill ?? "") + (icon.stroke ?? "") !== "", name);
      assert.match(icon.colour, /^#[0-9a-f]{6}$/, name);
    }
  });

  it("builds one symbol per type", () => {
    const symbols = typeSymbols();
    for (const name of Object.keys(TYPE_ICONS)) assert.ok(symbols.includes(`<symbol id="type-${name}"`), name);
    assert.equal(symbols.match(/<symbol /g)?.length, icons.length);
    assert.doesNotMatch(symbols, /NaN|undefined/);
  });
});

describe("contrast", () => {
  it("matches WCAG's figures", () => {
    assert.equal(Math.round(contrast("#000000", "#ffffff") * 100) / 100, 21);
    assert.equal(contrast("#777777", "#777777"), 1);
    // WCAG's own example: #767676 on white is the lightest grey that passes 4.5:1.
    assert.ok(contrast("#767676", "#ffffff") >= 4.5);
    assert.ok(contrast("#777777", "#ffffff") < 4.5);
  });

  it("picks white on dark discs and ink on light ones", () => {
    assert.equal(glyphColour("#3f6fd8"), GLYPH_LIGHT);
    assert.equal(glyphColour("#f2c623"), GLYPH_DARK);
  });
});
