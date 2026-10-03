// Loads the built index.html in jsdom. The app lives in one IIFE, so internals are reached through the
// opt-in window.__MOTD_LAB_TEST__ hook, which only exists when a harness creates it before load.
import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
export const ROOT = new URL("../", import.meta.url);

export function loadApp({ storage = {}, fetch, hook = true } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "https://motd-lab.test/",
    virtualConsole,
    beforeParse(window) {
      if (hook) window.__MOTD_LAB_TEST__ = {};
      for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
      window.fetch = fetch ?? (() => Promise.reject(new Error("network disabled in tests")));
      window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    }
  });
  const { window } = dom;
  return {
    window,
    document: window.document,
    api: window.__MOTD_LAB_TEST__,
    errors,
    storage: window.localStorage,
    close: () => window.close()
  };
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One entry per visible character, with the colour a viewer would actually see (gradients resolved).
export function flatten(api, raw) {
  return api.parseUniversal(raw).filter((t) => !t.linebreak).flatMap((t) =>
    [...t.text].map((ch, i) => ({
      ch,
      color: api.gradientColorAt(t, i),
      bold: !!t.bold, italic: !!t.italic, underline: !!t.underline, strikethrough: !!t.strikethrough, obfuscated: !!t.obfuscated
    })));
}

export const jsonResponse = (body, { ok = true, status = 200 } = {}) => ({ ok, status, json: async () => body });
