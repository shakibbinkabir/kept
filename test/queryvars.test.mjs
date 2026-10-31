// Self-check for src/queryvars.js: node test/queryvars.test.mjs
import assert from "node:assert";
import fs from "node:fs";
import vm from "node:vm";

const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL("../src/queryvars.js", import.meta.url), "utf8"), ctx);
const merge = ctx.igxMergeVariables;
const F = "__relay_internal__pv__";

// Nothing read from the page: variables go out unchanged.
assert.deepEqual(merge({ id: "1", [F + "Old"]: true }, null), { id: "1", [F + "Old"]: true });

// Read from the page: our values win for shared keys, new keys come from the
// page, flags the page no longer declares are dropped, plain arguments stay.
assert.deepEqual(
  merge(
    { id: "1", first: 20, [F + "Kept"]: false, [F + "Gone"]: true },
    { first: 7, [F + "Kept"]: true, [F + "New"]: 3 }
  ),
  { id: "1", first: 20, [F + "Kept"]: false, [F + "New"]: 3 }
);

console.log("queryvars ok");
