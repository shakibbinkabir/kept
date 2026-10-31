// Self-check for src/chatpage.js: node test/chatpage.test.mjs
import assert from "node:assert";
import { chatPage, inboxPage } from "../src/chatpage.js";

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

// Pages in chats/ reach the media through a base path and link back.
const sub = chatPage(chat, { base: "../", back: "../index.html" });
assert.ok(sub.includes('data-base="../"') && sub.includes('href="../index.html"'));
assert.ok(/data-f="photo"/.test(sub) && sub.includes('id="gallery"'), "filters and gallery");

// The inbox page lists each chat, escaped, linking to its page.
const inbox = inboxPage([chat, { ...chat, title: "Bo" }]);
assert.ok(inbox.includes('href="chats/001.html"') && inbox.includes('href="chats/002.html"'));
assert.ok(inbox.includes("Ana &lt;b&gt;&amp;") && !inbox.includes("Ana <b>"));
assert.ok(!/<(script|link)[^>]+(src|href)=/i.test(inbox));

console.log("chatpage ok");
