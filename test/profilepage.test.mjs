// Self-check for src/profilepage.js: node test/profilepage.test.mjs
import assert from "node:assert";
import { profilePage } from "../src/profilepage.js";

const items = [
  { files: ["2026-10-30_Cx1/01.webp", "2026-10-30_Cx1/02.mp4"], caption: "</script><img src=x onerror=alert(1)>", takenAt: 1761800000, kind: "carousel", url: "https://www.instagram.com/p/Cx1/" },
  { files: [], caption: "failed download", takenAt: 1761700000 },
];
const html = profilePage({ username: "some<user>", type: "posts", items });

const data = html.slice(html.indexOf('id="data">') + 10, html.indexOf("</script>", html.indexOf('id="data">')));
assert.ok(!data.includes("</script"), "data can't close its tag");
assert.equal(JSON.parse(data).items.length, 1, "items with no saved files are left out");
assert.equal(JSON.parse(data).items[0].caption, items[0].caption, "captions round-trip");
assert.ok(html.includes("@some&lt;user&gt; · posts"), "title escaped");
assert.ok(!/<(script|link)[^>]+(src|href)=/i.test(html), "nothing loaded from outside");
const js = html.slice(html.lastIndexOf("<script>"));
assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(js), "no HTML injection paths");
for (const id of ['id="viewer"', 'id="q"', 'id="prev"', 'id="next"']) assert.ok(html.includes(id), id);

console.log("profilepage ok");
