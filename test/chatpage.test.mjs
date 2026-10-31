// Self-check for src/chatpage.js: node test/chatpage.test.mjs
import assert from "node:assert";
import { chatPage } from "../src/chatpage.js";

const chat = {
  participants: [{ name: "Ana" }, { name: "Me" }],
  title: "Ana <b>&",
  thread_path: "inbox/ana_1",
  messages: [
    { sender_name: "Me", timestamp_ms: 1700000100000, content: "</script><script>alert(1)</script>" },
    { sender_name: "Ana", timestamp_ms: 1700000000000, photos: [{ uri: "your_instagram_activity/messages/inbox/ana_1/photos/1_1.jpg" }] },
  ],
};
const html = chatPage(chat);

// The embedded data can't close its <script> tag, and the title is escaped.
const data = html.slice(html.indexOf('id="data">') + 10, html.indexOf("</script>", html.indexOf('id="data">')));
assert.equal(JSON.parse(data).messages[0].content, chat.messages[0].content, "data round-trips");
assert.ok(!data.includes("</script"), "no closing tag inside the data");
assert.ok(html.includes("<h1>Ana &lt;b&gt;&amp;</h1>"));

// Fully offline: no external scripts, styles or fonts.
assert.ok(!/<(script|link)[^>]+(src|href)=/i.test(html), "nothing loaded from outside");
assert.ok(!/@import|url\(http/i.test(html));

// Message text is written with textContent only.
const js = html.slice(html.lastIndexOf("<script>"));
assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(js), "no HTML injection paths");
for (const id of ['id="q"', 'id="jump"', 'id="next"', 'id="prev"']) assert.ok(html.includes(id));

console.log("chatpage ok");
