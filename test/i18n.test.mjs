// Self-check for the translations: node test/i18n.test.mjs
// Every key the pages use exists in every language, with valid placeholders.
import assert from "node:assert";
import fs from "node:fs";

const langs = fs.readdirSync("_locales");
const messages = Object.fromEntries(langs.map((l) => [l, JSON.parse(fs.readFileSync(`_locales/${l}/messages.json`, "utf8"))]));
const english = Object.keys(messages.en);

const used = new Set(["extName", "extDescription"]);
for (const f of ["popup.html", "center.html", "pick.html", "popup.js", "center.js", "pick.js"]) {
  for (const m of fs.readFileSync(f, "utf8").matchAll(/data-i18n(?:-\w+)?="(\w+)"|\btr?\("(\w+)"/g)) used.add(m[1] || m[2]);
}
for (const key of used) assert.ok(messages.en[key], `en is missing ${key}`);

for (const l of langs) {
  assert.deepEqual(Object.keys(messages[l]).sort(), [...english].sort(), `${l} has different keys from en`);
  for (const [key, { message, placeholders }] of Object.entries(messages[l])) {
    assert.ok(message.trim(), `${l}.${key} is empty`);
    assert.ok(!/\$\d/.test(message), `${l}.${key} uses $1 directly; use a named placeholder`);
    for (const [, name] of message.matchAll(/\$(\w+)\$/g)) assert.ok(placeholders?.[name.toLowerCase()], `${l}.${key} has no placeholder ${name}`);
  }
  // The Web Store's limits.
  assert.ok(messages[l].extName.message.length <= 75, `${l} name too long`);
  assert.ok(messages[l].extDescription.message.length <= 132, `${l} description too long`);
}
console.log(`i18n: ${used.size} keys used, ${english.length} in each of ${langs.length} languages`);
