// Self-check for src/names.js: node test/names.test.mjs
import assert from "node:assert";
import { fileBase } from "../src/names.js";

const t = Math.floor(new Date(2026, 9, 31, 14, 5, 9).getTime() / 1000);
const post = { username: "some_user_", takenAt: t, code: "Cx1_y", index: 7 };

// Defaults: ZIP keeps the old names; folders drop the shifting index.
assert.equal(fileBase("", post), "007_2026-10-31_Cx1_y");
assert.equal(fileBase("", { ...post, folder: true }), "2026-10-31_Cx1_y");

// Tokens, including usernames kept verbatim.
assert.equal(fileBase("{username}_{date}_{time}_{code}", post), "some_user__2026-10-31_14-05-09_Cx1_y");

// A pattern without {code} or {index} still gives unique names.
assert.equal(fileBase("{username}", post), "some_user__Cx1_y");

// No path tricks: separators and reserved characters become "_", edge dots go.
assert.equal(fileBase("../{code}", post), "_Cx1_y");
assert.ok(!/[\\/:*?"<>|]/.test(fileBase('a/b\\c:*?"<>|{code}', post)));
assert.equal(fileBase("{code}. ", post), "Cx1_y");

// Unknown tokens are left as typed.
assert.equal(fileBase("{nope}_{code}", post), "{nope}_Cx1_y");

console.log("names ok");
