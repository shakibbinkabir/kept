// Self-check for the back-off in src/igapi.js: node test/pacing.test.mjs
// Waits run instantly here; the reporter still sees the real 30/60/120 s.
import assert from "node:assert";

const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, _ms, ...args) => realSetTimeout(fn, 0, ...args);

const igapi = await import("../src/igapi.js");
const waits = [];
igapi.setWaitReporter((until) => waits.push(until ? Math.round((until - Date.now()) / 1000) : 0));

// Direct request: one 429, then the answer. Backs off 30 s once.
let calls = 0;
globalThis.fetch = async () =>
  ++calls === 1
    ? new Response("", { status: 429 })
    : new Response(JSON.stringify({ items: [{ id: "1" }] }), { status: 200 });
assert.equal((await igapi.getMediaInfo("1")).id, "1");
assert.deepEqual(waits, [30, 0]);

// GraphQL through the tab: two 429s, then data. Records which id answered.
waits.length = 0;
let sends = 0;
globalThis.chrome = {
  runtime: {
    sendMessage: async () =>
      ++sends < 3 ? { error: "rate limited", status: 429 } : { data: { highlights: { edges: [] } }, source: "page" },
  },
};
assert.deepEqual(await igapi.getHighlightsTray("1"), []);
assert.deepEqual(waits, [30, 0, 60, 0]);
assert.equal(igapi.idSources.PolarisProfileStoryHighlightsTrayContentQuery, "page");

// Still throttled after 30, 60 and 120 s: gives up with the 429 message.
waits.length = 0;
globalThis.chrome.runtime.sendMessage = async () => ({ error: "Instagram is rate-limiting requests (429).", status: 429 });
await assert.rejects(igapi.getHighlightsTray("1"), /429/);
assert.deepEqual(waits, [30, 0, 60, 0, 120, 0]);

console.log("pacing ok");
