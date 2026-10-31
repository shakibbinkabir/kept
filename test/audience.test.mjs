// Self-check for src/audience.js: node test/audience.test.mjs
import assert from "node:assert";
import { usersCsv, snapshotOf, compare } from "../src/audience.js";

const csv = usersCsv([
  { pk: 1, username: "ana", full_name: 'Ana "A", B', is_private: true, is_verified: false },
  { pk: 2, username: "bo", full_name: "=HYPERLINK(\"x\")", is_private: false, is_verified: true },
]);
const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
assert.equal(lines[0], "username,full_name,user_id,private,verified,profile");
assert.equal(lines[1], 'ana,"Ana ""A"", B",1,yes,no,https://www.instagram.com/ana/', "quotes and commas are escaped");
assert.ok(lines[2].startsWith("bo,\"'=HYPERLINK"), "formulas can't run in a spreadsheet");

const a = { pk: 1, username: "a" }, b = { pk: 2, username: "b" }, c = { pk: 3, username: "c" }, d = { pk: 4, username: "d" };
const before = snapshotOf([a, b], [a, c], 1000);
const after = snapshotOf([a, d], [a, c]);
const diff = compare(before, after);
assert.deepEqual(diff.newFollowers.map((u) => u.username), ["d"]);
assert.deepEqual(diff.unfollowers.map((u) => u.username), ["b"]);
assert.deepEqual(diff.notFollowingBack.map((u) => u.username), ["c"]);
assert.equal(diff.since, 1000);
assert.deepEqual(compare(null, after).newFollowers, [], "no snapshot yet: nothing to compare");

console.log("audience ok");
