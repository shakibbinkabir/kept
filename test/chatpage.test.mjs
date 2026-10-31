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
new Function(js.slice(8, js.lastIndexOf("</script>"))); // the page's script must parse
for (const id of ['id="q"', 'id="jump"', 'id="next"', 'id="prev"']) assert.ok(html.includes(id));

// Pages in chats/ reach the media through a base path and link back.
const sub = chatPage(chat, { base: "../", back: "../index.html" });
assert.ok(sub.includes('data-base="../"') && sub.includes('href="../index.html"'));
assert.ok(/data-f="photo"/.test(sub) && sub.includes('id="gallery"'), "filters and gallery");

// 4.1: full-screen viewer, print/PDF book layout, voice-note waveforms.
for (const id of ['id="viewer"', 'id="vPrev"', 'id="vNext"', 'id="print"', 'class="cover"']) assert.ok(html.includes(id), id);
assert.ok(/@media print\{/.test(html) && html.includes("break-inside:avoid"), "print layout");
const voiced = {
  ...chat,
  messages: [{ sender_name: "Ana", timestamp_ms: 1700000200000, audio_files: [{ uri: "audio/1.mp4" }] }, ...chat.messages],
};
const withWaves = chatPage(voiced, { waves: { "audio/1.mp4": [0.2, 1], "audio/other.mp4": [1], "audio/</script>.mp4": [1] } });
const wavesJson = withWaves.slice(withWaves.indexOf('id="waves">') + 11, withWaves.indexOf("</script>", withWaves.indexOf('id="waves">')));
assert.deepEqual(JSON.parse(wavesJson), { "audio/1.mp4": [0.2, 1] }, "only this chat's waveforms are embedded");
assert.equal(JSON.parse(chatPage(chat).slice(chatPage(chat).indexOf('id="waves">') + 11).split("</script>")[0]).constructor, Object);

// The inbox page lists each chat, escaped, linking to its page.
const inbox = inboxPage([chat, { ...chat, title: "Bo" }]);
assert.ok(inbox.includes('href="chats/001.html"') && inbox.includes('href="chats/002.html"'));
assert.ok(inbox.includes("Ana &lt;b&gt;&amp;") && !inbox.includes("Ana <b>"));
assert.ok(!/<(script|link)[^>]+(src|href)=/i.test(inbox));

console.log("chatpage ok");
