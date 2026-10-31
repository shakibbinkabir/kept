// src/queryvars.js
//
// Loaded as a content script before bridge.js (they share one scope) and by
// test/queryvars.test.mjs.
//
// Instagram's persisted queries take "provided variables": feature flags the
// web client fills in, whose set changes when Instagram updates a query. When
// we know the set the page currently declares, send exactly that set: keys we
// already pass keep our value, keys Instagram added get the page's value, and
// flag keys the page no longer declares are dropped.
// `var` and a function declaration (not const) so injecting this script again
// into a tab that already has it can't throw "already declared".
var IGX_FLAG_PREFIX = "__relay_internal__pv__";

function igxMergeVariables(variables, provided) {
  if (!provided) return variables;
  const out = {};
  for (const [key, value] of Object.entries(variables)) {
    if (!key.startsWith(IGX_FLAG_PREFIX) || key in provided) out[key] = value;
  }
  for (const [key, value] of Object.entries(provided)) {
    if (!(key in out)) out[key] = value;
  }
  return out;
}
