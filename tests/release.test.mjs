import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadApp, wait, jsonResponse, ROOT } from "./helpers.mjs";
import { build } from "../scripts/build.mjs";

const html = readFileSync(new URL("index.html", ROOT), "utf8");
const APP_VERSION = /const APP_VERSION = "([^"]+)"/.exec(html)[1];
const APP_RELEASE_DATE = /const APP_RELEASE_DATE = "([^"]+)"/.exec(html)[1];

const probe = loadApp();
after(() => probe.close());

test("index.html is exactly what src/ builds (run `npm run build`)", () => assert.equal(html, build()));

test("APP_VERSION is a v-prefixed semver and the date is ISO", () => {
  assert.match(APP_VERSION, /^v\d+\.\d+\.\d+$/);
  assert.match(APP_RELEASE_DATE, /^\d{4}-\d{2}-\d{2}$/);
});

test("CHANGELOG has an entry for APP_VERSION dated APP_RELEASE_DATE", () => {
  const changelog = readFileSync(new URL("CHANGELOG.md", ROOT), "utf8");
  assert.ok(changelog.includes(`## [${APP_VERSION.slice(1)}] - ${APP_RELEASE_DATE}`), "CHANGELOG heading must match APP_VERSION and APP_RELEASE_DATE");
});

test("the test hook does not exist unless a harness asks for it", () => {
  const plain = loadApp({ hook: false });
  assert.equal(plain.window.__MOTD_LAB_TEST__, undefined);
  plain.close();
});

test("version comparison", () => {
  const { compareVersions: cmp } = probe.api;
  assert.equal(cmp("v1.0.0", "v1.0.0"), 0);
  assert.equal(cmp("v1.0.0", "v1.0.1"), -1);
  assert.equal(cmp("v1.10.0", "v1.9.0"), 1, "numeric, not alphabetical");
  assert.equal(cmp("v1.0.0-rc.1", "v1.0.0"), -1, "a pre-release is older than its release");
  assert.equal(cmp("1.2.3", "v1.2.3"), 0, "the v prefix is optional");
  assert.equal(cmp("nightly", "v1.0.0"), null);
});

async function aboutAfter(fetch) {
  const app = loadApp({ fetch });
  await wait(100);
  app.document.querySelector('[data-view="aboutView"]').click();
  await wait(150);
  const result = {
    version: app.document.getElementById("aboutVersion").textContent,
    state: app.document.getElementById("aboutReleaseStatus").dataset.state,
    link: app.document.getElementById("aboutChangelog").href
  };
  app.close();
  return result;
}
const latest = (tag) => () => Promise.resolve(jsonResponse({ tag_name: tag, html_url: `https://github.com/AnyaChann/MOTD-Lab/releases/tag/${tag}` }));

test("About always shows this build's version, whatever GitHub says is latest", async () => {
  for (const fetch of [latest("v9.9.9"), latest("v0.0.1"), () => Promise.reject(new Error("offline"))]) {
    assert.equal((await aboutAfter(fetch)).version, APP_VERSION);
  }
});

test("About reports whether an update exists", async () => {
  assert.equal((await aboutAfter(latest(APP_VERSION))).state, "success");
  assert.equal((await aboutAfter(latest("v9.9.9"))).state, "error");
  assert.equal((await aboutAfter(() => Promise.reject(new Error("offline")))).state, "offline");
});

test("a release link that is not on the project's repo is never followed", async () => {
  const result = await aboutAfter(() => Promise.resolve(jsonResponse({ tag_name: "v9.9.9", html_url: "https://evil.example/x" })));
  assert.ok(result.link.startsWith("https://github.com/AnyaChann/MOTD-Lab/"), result.link);
});
