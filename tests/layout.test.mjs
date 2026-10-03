import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers.mjs";

const app = loadApp();
const { api } = app;
after(() => app.close());
const width = (raw) => api.tokenPixelWidth(api.parseUniversal(raw));
const leadingSpaces = (s) => s.match(/^ */)[0].length;

test("glyph widths match Minecraft's default font (advance including the 1px gap)", () => {
  const expected = { i: 2, "!": 2, l: 3, I: 4, t: 4, " ": 4, f: 5, k: 5, A: 6, a: 6, "@": 7, "~": 7 };
  for (const [char, px] of Object.entries(expected)) assert.equal(api.charPixelWidth(char, false), px, JSON.stringify(char));
});

test("bold adds one pixel per glyph", () => {
  for (const char of ["i", "A", "@"]) assert.equal(api.charPixelWidth(char, true), api.charPixelWidth(char, false) + 1);
});

test("characters outside the font still get a positive width", () => {
  assert.ok(api.charPixelWidth("✓", false) > 0);
  assert.ok(api.charPixelWidth("あ", false) > 0);
});

test("line width counts glyphs, not colour codes", () => {
  assert.equal(width("Hello"), 24);
  assert.equal(width("&aHello"), 24);
  assert.equal(width("&lHello"), 29);
  assert.equal(width("<red>Hello</red>"), 24);
});

test("left alignment adds nothing; right and center pad with spaces measured in pixels", () => {
  assert.equal(api.alignLineString("&aHi", "left", 100), "&aHi");
  // "Hi" is 8px: (100-8)/4 = 23 spaces to push it flush right, half that (46px = 11.5 spaces) rounds to 12 for center.
  assert.equal(leadingSpaces(api.alignLineString("&aHi", "right", 100)), 23);
  assert.equal(leadingSpaces(api.alignLineString("&aHi", "center", 100)), 12);
});

test("padding never pushes the line past the width limit", () => {
  for (const max of [60, 100, 270]) {
    const padded = api.alignLineString("&aHi", "right", max);
    assert.ok(width(padded) <= max, `max ${max}`);
    assert.ok(width(padded) + 4 > max, `one more space would overflow ${max}`);
  }
});

test("a line already wider than the limit is returned untouched", () => {
  assert.equal(api.alignLineString("&aHello world this is long", "center", 20), "&aHello world this is long");
});
