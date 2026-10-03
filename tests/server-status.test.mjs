import { test, after } from "node:test";
import assert from "node:assert/strict";
import { loadApp, wait, jsonResponse } from "./helpers.mjs";

const app = loadApp();
const { api } = app;
after(() => app.close());

const abortError = () => Object.assign(new Error("aborted"), { name: "AbortError" });
const rejectsWith = (promise, kind) => assert.rejects(promise, (error) => error instanceof api.ServerStatusError && error.kind === kind);

test("a valid response is returned as received", async () => {
  const payload = { online: true, motd: { raw: "&aHi" }, players: { online: 1, max: 20 } };
  assert.deepEqual(await api.fetchServerStatus("play.example.com", { fetchImpl: async () => jsonResponse(payload) }), payload);
});

test("an offline server is still a valid answer", async () => {
  assert.deepEqual(await api.fetchServerStatus("x", { fetchImpl: async () => jsonResponse({ online: false }) }), { online: false });
});

test("the address is URL-encoded into a single path segment", async () => {
  let url;
  await api.fetchServerStatus("host:25565/../x", { fetchImpl: async (u) => { url = u; return jsonResponse({ online: false }); } });
  assert.equal(url, "https://api.mcstatus.io/v2/status/java/host%3A25565%2F..%2Fx");
});

test("HTTP errors", async () => {
  const promise = api.fetchServerStatus("x", { fetchImpl: async () => jsonResponse({}, { ok: false, status: 429 }) });
  await rejectsWith(promise, "http");
  await assert.rejects(promise, /429/);
});

test("network failure", () => rejectsWith(api.fetchServerStatus("x", { fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }), "network"));

test("a request that never answers times out and is aborted", async () => {
  let aborted = false;
  const hang = (_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => { aborted = true; reject(abortError()); }));
  await rejectsWith(api.fetchServerStatus("x", { timeoutMs: 20, fetchImpl: hang }), "timeout");
  assert.ok(aborted, "the request itself must be aborted, not just abandoned");
});

test("a body that never finishes arriving also counts as a timeout", async () => {
  const slowBody = (_url, { signal }) => Promise.resolve({
    ok: true, status: 200,
    json: () => new Promise((_, reject) => signal.addEventListener("abort", () => reject(abortError())))
  });
  await rejectsWith(api.fetchServerStatus("x", { timeoutMs: 20, fetchImpl: slowBody }), "timeout");
});

test("payloads the renderers cannot use are rejected", async () => {
  const bad = [null, [], "text", 42, {}, { online: "yes" }, { motd: { raw: "x" } }];
  for (const body of bad) await rejectsWith(api.fetchServerStatus("x", { fetchImpl: async () => jsonResponse(body) }), "shape");
  await rejectsWith(api.fetchServerStatus("x", { fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <"); } }) }), "shape");
});

// End to end through the real UI.
async function importFrom(fetch) {
  const ui = loadApp({ fetch });
  await wait(100);
  ui.document.getElementById("motdImportAddress").value = "play.example.com";
  ui.document.getElementById("motdImportBtn").click();
  await wait(150);
  const status = ui.document.getElementById("motdImportStatus").textContent;
  const motd = ui.document.getElementById("motdRaw").value;
  ui.close();
  return { status, motd };
}

test("importing a server fills the editor and reports players and version", async () => {
  const { status, motd } = await importFrom(async () => jsonResponse({
    online: true, motd: { raw: "&aHello\n&7World" }, players: { online: 3, max: 20 }, version: { name_clean: "1.21.1" }
  }));
  assert.match(motd, /^&aHello/);
  assert.match(status, /3\/20/);
  assert.match(status, /1\.21\.1/);
});

test("a timeout shows its own message, other failures show the generic one", async () => {
  const labels = api.I18N.vi.labels;
  assert.notEqual(labels.pingTimeout, labels.pingFailed);
  assert.match((await importFrom(async () => { throw abortError(); })).status, new RegExp(labels.pingTimeout.slice(0, 12)));
  assert.match((await importFrom(async () => jsonResponse({}, { ok: false, status: 500 }))).status, new RegExp(labels.pingFailed.slice(0, 12)));
});
