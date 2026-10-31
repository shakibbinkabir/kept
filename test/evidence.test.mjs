// Self-check for src/evidence.js: node test/evidence.test.mjs
import assert from "node:assert";
import { createHash } from "node:crypto";
import { sha256, evidenceFiles } from "../src/evidence.js";

const enc = new TextEncoder();
assert.equal(await sha256(enc.encode("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 of abc");

const files = [
  { path: "b/2.jpg", size: 3, sha256: await sha256(enc.encode("two")) },
  { path: "a/1.txt", size: 3, sha256: await sha256(enc.encode("one")) },
];
const out = await evidenceFiles(files, { tool: "Kept", version: "4.8.0", mode: "chat", startedAt: 0, finishedAt: 1000, timezone: { name: "Asia/Dhaka", offset: "+06:00" } }, [{ at: 0, text: "started" }]);
const byName = Object.fromEntries(out.files.map((f) => [f.path, f.text]));
const list = byName["evidence/files.sha256"];
assert.equal(list.split("\n")[0].endsWith("  a/1.txt"), true, "sorted by path, sha256sum format");
assert.equal(out.fingerprint, createHash("sha256").update(list).digest("hex"), "the fingerprint is the SHA-256 of the list");
const record = JSON.parse(byName["evidence/export.json"]);
assert.equal(record.files, 2);
assert.equal(record.bytes, 6);
assert.equal(record.startedAt, "1970-01-01T00:00:00.000Z");
assert.ok(byName["evidence/README.txt"].includes(out.fingerprint));
assert.ok(byName["evidence/log.txt"].includes("started"));

console.log("evidence ok");
