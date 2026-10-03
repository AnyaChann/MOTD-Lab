import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { loadApp, ROOT } from "./helpers.mjs";

const app = loadApp();
const { api } = app;
after(() => app.close());

const flatten = (object, prefix = "") => Object.entries(object).flatMap(([key, value]) =>
  value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]);
const vi = new Map(flatten(api.I18N.vi));
const en = new Map(flatten(api.I18N.en));
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("Vietnamese and English define exactly the same keys", () => {
  assert.deepEqual([...vi.keys()].filter((k) => !en.has(k)), [], "keys missing in English");
  assert.deepEqual([...en.keys()].filter((k) => !vi.has(k)), [], "keys missing in Vietnamese");
});

test("no translation is empty or not a string", () => {
  for (const [lang, map] of [["vi", vi], ["en", en]]) {
    for (const [key, value] of map) assert.ok(typeof value === "string" && value.trim() !== "", `${lang}:${key}`);
  }
});

test("both languages use the same {placeholders}", () => {
  for (const [key, value] of vi) assert.equal(placeholders(en.get(key)), placeholders(value), key);
});

test("every t('...') key used in the sources exists in both languages", () => {
  const dir = new URL("src/js/", ROOT);
  const source = readdirSync(dir).map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
  const used = new Set([...source.matchAll(/\bt\(\s*["'`]([A-Za-z0-9_.]+)["'`]/g)].map((m) => m[1]));
  assert.ok(used.size > 50, "expected to find the t() calls");
  assert.deepEqual([...used].filter((k) => !vi.has(k)), [], "missing in Vietnamese");
  assert.deepEqual([...used].filter((k) => !en.has(k)), [], "missing in English");
});
