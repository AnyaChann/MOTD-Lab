import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadApp, flatten } from "./helpers.mjs";

const app = loadApp();
const { api } = app;
after(() => app.close());
const out = (raw, target) => api.serializeForTarget(raw, api.parseUniversal(raw), target);

test("legacy input to every target", () => {
  const raw = "&a&lHello &bWorld";
  assert.equal(out(raw, "legacy"), "&a&lHello &bWorld");
  assert.equal(out(raw, "section"), "§a§lHello §bWorld");
  assert.equal(out(raw, "bukkit"), "&x&5&5&F&F&5&5&lHello &x&5&5&F&F&F&FWorld");
  assert.equal(out(raw, "mini"), "<#55FF55><b>Hello </b><#55FFFF>World");
  assert.equal(out(raw, "iridium"), "<SOLID:55FF55>&lHello <SOLID:55FFFF>World");
});

test("a hex colour keeps its spelling when the target matches the input", () => {
  assert.equal(out("&x&f&f&0&0&0&0Hex", "bukkit"), "&x&f&f&0&0&0&0Hex");
  assert.equal(out("&x&f&f&0&0&0&0Hex", "mini"), "<#FF0000>Hex");
  assert.equal(out("&x&f&f&0&0&0&0Hex", "iridium"), "<SOLID:FF0000>Hex");
  assert.equal(out("&x&f&f&0&0&0&0Hex", "section"), "§x§F§F§0§0§0§0Hex");
});

test("a gradient stays a gradient where the target has one, and expands per character where it does not", () => {
  const raw = "<gradient:#ff0000:#0000ff>abcd</gradient>";
  assert.equal(out(raw, "mini"), raw);
  assert.equal(out(raw, "iridium"), "<GRADIENT:FF0000>abcd</GRADIENT:0000FF>");
  assert.equal(out(raw, "bukkit"), "&x&F&F&0&0&0&0a&x&A&A&0&0&5&5b&x&5&5&0&0&A&Ac&x&0&0&0&0&F&Fd");
});

test("hex has no legacy spelling, so legacy output is the nearest legacy colour", () => {
  assert.equal(out("&x&f&f&0&0&0&0Hex", "legacy"), "&4Hex");
});

test("plain text is never given colour codes", () => {
  for (const target of ["legacy", "section", "bukkit", "mini", "iridium", "slp"]) assert.equal(out("Hello", target), "Hello", target);
});

test("converting between lossless targets keeps every character's colour and formatting", () => {
  const inputs = [
    "&a&lGreen &r&nunder &c&oitalic &kk &mstrike",
    "&x&f&f&0&0&0&0Hex &#00ff99mint",
    "<red>R</red><#00ff99><b><u>x</u></b> y",
    "<gradient:#ff0000:#0000ff>abcdef</gradient>",
    "<gradient:#ff0000:#0000ff><b>abcd</b></gradient>",
    "<rainbow>abcdef</rainbow>",
    "<SOLID:12ab34>S <GRADIENT:FF0000>grad</GRADIENT:0000FF>",
    "<SOLID:12ab34>&lS&n<SOLID:FF0000>T"
  ];
  for (const raw of inputs) {
    const expected = flatten(api, raw);
    for (const target of ["section", "bukkit", "mini", "iridium", "slp"]) {
      const converted = out(raw, target);
      assert.deepEqual(flatten(api, converted), expected, `${JSON.stringify(raw)} -> ${target}: ${JSON.stringify(converted)}`);
    }
  }
});

test("legacy-only input survives a trip through legacy output", () => {
  const raw = "&a&lGreen &r&nunder &c&oitalic";
  assert.deepEqual(flatten(api, out(raw, "legacy")), flatten(api, raw));
});

test("server.properties escapes § and non-ASCII as \\uXXXX, and doubles backslashes", () => {
  assert.equal(api.legacyToServerProperties(api.parseUniversal("&aHi\\n&7there")), "\\u00A7aHi\\n\\u00A77there");
  assert.equal(api.legacyToServerProperties(api.parseUniversal("&aé✓")), "\\u00A7a\\u00E9\\u2713");
  assert.match(api.legacyToServerProperties(api.parseUniversal('a"b\\c')), /a"b\\\\c$/);
});

test("ServerListPlus output is a YAML block with one line per MOTD line", () => {
  assert.equal(api.buildServerListPlusOutput("&aHi\\n&7there"), "--- !Status\nDefault:\n  Description:\n  - |-\n    &aHi\n    &7there");
});
