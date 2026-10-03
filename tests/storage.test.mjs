import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./helpers.mjs";

const KEY = "2c2t_schemaVersion";
function boot(storage) {
  const app = loadApp({ storage });
  const read = (key) => app.storage.getItem(key);
  return { app, read };
}

test("a first run stamps the current schema version", () => {
  const { app, read } = boot({});
  assert.equal(read(KEY), String(app.api.STORAGE_SCHEMA_VERSION));
  app.close();
});

test("data from before versioning is migrated: legacy centre flag becomes motdAlignment", () => {
  const { app, read } = boot({ "2c2t_motdCenter": "true", "2c2t_lastSaved": "1" });
  assert.equal(read("2c2t_motdAlignment"), "center");
  assert.equal(read("2c2t_motdCenter"), null);
  assert.equal(read(KEY), "1");
  app.close();
});

test("an explicit motdAlignment wins over the legacy flag", () => {
  const { app, read } = boot({ "2c2t_motdCenter": "true", "2c2t_motdAlignment": "right", "2c2t_lastSaved": "1" });
  assert.equal(read("2c2t_motdAlignment"), "right");
  app.close();
});

test("customHex is carried over to customColor when only the old key exists", () => {
  const { app, read } = boot({ "2c2t_customHex": "#123456", "2c2t_lastSaved": "1" });
  assert.equal(read("2c2t_customColor"), "#123456");
  app.close();
});

test("saved text survives migration untouched", () => {
  const { app, read } = boot({ "2c2t_motdRaw": "&aHello", "2c2t_textRaw": "&bText", "2c2t_lastSaved": "1" });
  assert.equal(read("2c2t_motdRaw"), "&aHello");
  assert.equal(read("2c2t_textRaw"), "&bText");
  assert.equal(app.document.getElementById("motdRaw").value, "&aHello");
  app.close();
});

test("data written by a newer build is left exactly as it was", () => {
  const { app, read } = boot({ [KEY]: "99", "2c2t_motdCenter": "true", "2c2t_lastSaved": "1" });
  assert.equal(read(KEY), "99");
  assert.equal(read("2c2t_motdCenter"), "true");
  assert.equal(read("2c2t_motdAlignment"), null);
  app.close();
});

test("a corrupt version is treated as unversioned and repaired", () => {
  const { app, read } = boot({ [KEY]: "not-a-number", "2c2t_motdCenter": "true" });
  assert.equal(read(KEY), "1");
  assert.equal(read("2c2t_motdAlignment"), "center");
  app.close();
});

test("migrating twice changes nothing", () => {
  const { app, read } = boot({ "2c2t_motdCenter": "true", "2c2t_lastSaved": "1" });
  const snapshot = JSON.stringify({ ...app.storage });
  app.api.migrateStorage();
  assert.equal(JSON.stringify({ ...app.storage }), snapshot);
  assert.equal(read(KEY), "1");
  app.close();
});
