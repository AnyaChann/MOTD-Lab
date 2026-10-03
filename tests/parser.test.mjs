import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers.mjs";

const app = loadApp();
const { api } = app;
after(() => app.close());
const parse = (raw) => api.parseUniversal(raw);
const flags = (t) => ["bold", "italic", "underline", "strikethrough", "obfuscated"].filter((k) => t[k]);

test("the app boots without script errors", () => assert.deepEqual(app.errors, []));

test("legacy colour codes, & and §", () => {
  for (const [code, hex] of [["0", "#000000"], ["4", "#AA0000"], ["6", "#FFAA00"], ["a", "#55FF55"], ["c", "#FF5555"], ["f", "#FFFFFF"]]) {
    assert.equal(parse(`&${code}x`)[0].color, hex, `&${code}`);
    assert.equal(parse(`§${code}x`)[0].color, hex, `§${code}`);
  }
});

test("format codes set exactly their own flag", () => {
  for (const [code, flag] of [["l", "bold"], ["o", "italic"], ["n", "underline"], ["m", "strikethrough"], ["k", "obfuscated"]]) {
    assert.deepEqual(flags(parse(`&${code}x`)[0]), [flag], `&${code}`);
  }
});

test("a colour code clears earlier formatting (Minecraft behaviour)", () => {
  const [a, b] = parse("&a&lA&bB");
  assert.deepEqual(flags(a), ["bold"]);
  assert.deepEqual(flags(b), []);
  assert.equal(b.color, "#55FFFF");
});

test("&r resets colour and formatting", () => {
  const [a, b] = parse("&a&lA&rB");
  assert.equal(a.color, "#55FF55");
  assert.equal(b.color, "#FFFFFF");
  assert.deepEqual(flags(b), []);
});

test("formatting accumulates until a colour or reset", () => {
  assert.deepEqual(flags(parse("&l&oX")[0]), ["bold", "italic"]);
});

test("hex colour in every supported spelling", () => {
  assert.equal(parse("&x&f&f&0&0&0&0Hex")[0].color, "#FF0000");
  assert.equal(parse("§x§f§f§0§0§0§0Hex")[0].color, "#FF0000");
  assert.equal(parse("&#00ff99x")[0].color, "#00FF99");
  assert.equal(parse("<#00ff99>x")[0].color, "#00FF99");
  assert.equal(parse("<SOLID:12ab34>x")[0].color, "#12AB34");
  assert.equal(parse("#{12ab34}x")[0].color, "#12AB34");
});

test("MiniMessage named colours and decorations", () => {
  assert.equal(parse("<red>x</red>")[0].color, "#FF5555");
  assert.deepEqual(flags(parse("<b><u>x</u></b>")[0]), ["bold", "underline"]);
});

test("MiniMessage colour tags keep decorations, unlike § codes", () => {
  const [a, b] = parse("<b>A<#00ff99>B");
  assert.ok(a.bold && b.bold);
});

test("Iridium colour tags clear formatting, as the § codes they compile to do", () => {
  for (const raw of ["&lA<SOLID:00ff99>B", "&lA<GRADIENT:FF0000>B</GRADIENT:0000FF>", "&lA<RAINBOW1>B</RAINBOW>"]) {
    const [a, b] = parse(raw);
    assert.deepEqual(flags(a), ["bold"], raw);
    assert.deepEqual(flags(b), [], raw);
  }
});

test("formatting inside an Iridium gradient applies to the gradient", () => {
  assert.deepEqual(flags(parse("<GRADIENT:FF0000>&lBC</GRADIENT:0000FF>")[0]), ["bold"]);
});

test("two-stop gradient interpolates linearly, per character", () => {
  const [token] = parse("<gradient:#ff0000:#0000ff>abcd</gradient>");
  assert.equal(token.text, "abcd");
  assert.deepEqual([0, 1, 2, 3].map((i) => api.gradientColorAt(token, i)), ["#FF0000", "#AA0055", "#5500AA", "#0000FF"]);
});

test("rainbow gives every character its own valid colour", () => {
  const [token] = parse("<rainbow>abc</rainbow>");
  const colours = [0, 1, 2].map((i) => api.gradientColorAt(token, i));
  assert.equal(new Set(colours).size, 3);
  for (const c of colours) assert.match(c, /^#[0-9A-F]{6}$/);
});

test("literal \\n becomes a line break between two lines of text", () => {
  const tokens = parse("line1\\nline2");
  assert.deepEqual([...tokens].map((t) => t.linebreak ? "\n" : t.text), ["line1", "\n", "line2"]);
});

test("unknown codes and stray ampersands stay as text", () => {
  assert.equal(parse("a&zb &")[0].text, "a&zb &");
});

test("codes with nothing after them produce no tokens", () => {
  assert.equal(parse("&r&a").length, 0);
  assert.equal(parse("").length, 0);
});

test("token source ranges exclude the codes and point back into the input", () => {
  const raw = "&aGreen &lbold";
  for (const t of parse(raw)) assert.equal(raw.slice(t.sourceStart, t.sourceEnd), t.text);
});

test("syntax detection", () => {
  const cases = {
    "plain text": "plain", "&aHi": "legacy", "§aHi": "section", "&x&f&f&0&0&0&0Hi": "bukkit",
    "&#00ff99Hi": "hash", "<#00ff99>Hi": "mini", "<gradient:#ff0000:#0000ff>Hi</gradient>": "mini",
    "<SOLID:12ab34>Hi": "iridium", "<GRADIENT:FF0000>Hi</GRADIENT:0000FF>": "iridium"
  };
  for (const [raw, expected] of Object.entries(cases)) assert.equal(api.detectSourceSyntax(raw), expected, raw);
});

test("visible character count ignores codes and tags", () => {
  assert.equal(api.countVisibleText("&a&lHi&r there"), 8);
  assert.equal(api.countVisibleText("<red>ab</red>"), 2);
});

test("hex helpers", () => {
  assert.equal(api.cleanHex("#abc"), "#FFFFFF");
  assert.equal(api.cleanHex("12ab34"), "#12AB34");
  assert.equal(api.cleanHex("zz"), "#FFFFFF");
  assert.equal(api.nearestLegacy("#FF0000"), "&4");
  assert.equal(api.nearestLegacy("#00AA00"), "&2");
});
