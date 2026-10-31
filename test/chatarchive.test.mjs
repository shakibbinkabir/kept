// Self-check for src/chatarchive.js: node test/chatarchive.test.mjs
import assert from "node:assert";
import { planMedia, chatFolder, chatText, chatJson } from "../src/chatarchive.js";

const chat = {
  participants: [{ name: "Ana" }, { name: "Bo" }],
  title: "Ana",
  thread_path: "inbox/ana_123",
  messages: [
    { sender_name: "Bo", timestamp_ms: Date.UTC(2026, 9, 31, 10, 2), audio_files: [{ uri: "https://cdn/x/voice.mp4" }] },
    { sender_name: "Ana", timestamp_ms: Date.UTC(2026, 9, 31, 10, 1), photos: [{ uri: "https://cdn/x/a.jpg" }, { uri: "https://cdn/x/a.jpg" }], content: "café ☕" },
    { sender_name: "Ana", timestamp_ms: Date.UTC(2026, 9, 30, 9, 30), share: { link: "https://www.instagram.com/reel/r/", share_text: "", original_content_owner: "nasa", preview: { uri: "https://cdn/x/reel.jpg" } } },
    { sender_name: "Bo", timestamp_ms: Date.UTC(2026, 9, 30, 9, 0), call_duration: 75, content: "Bo started an audio call", reactions: [{ reaction: "❤", actor: "Ana" }] },
  ],
};

// Media: one download per distinct URL, both references rewritten from it.
const plan = planMedia(chat);
assert.equal(plan.length, 3);
assert.match(plan[2].path, /^shares\/\d+_3\.jpg$/);
assert.match(plan[0].path, /^audio\/\d+_1\.mp4$/);
assert.equal(plan[1].refs.length, 2);
assert.equal(chatFolder(chat), "your_instagram_activity/messages/inbox/ana_123");

// Transcript: oldest first, a header per day, local paths once rewritten.
const folder = chatFolder(chat);
for (const item of plan) for (const ref of item.refs) ref.uri = `${folder}/${item.path}`;
const text = chatText(chat, { folder, exportedAt: new Date(0) });
const lines = text.trim().split("\n");
assert.match(lines[0], /^Ana$/);
assert.ok(text.indexOf("[call, 1 min 15 s]") < text.indexOf("café ☕"), "oldest message first");
assert.equal((text.match(/^— /gm) || []).length, 2, "one header per day");
assert.match(text, /\[photo: photos\/\d+_2\.jpg\]/);
assert.match(text, /\[voice message: audio\/\d+_1\.mp4\]/);
assert.match(text, /reactions: ❤ Ana/);

// Encoding: plain UTF-8 by default; Instagram's byte-per-character escapes on request.
assert.ok(chatJson(chat).includes("café ☕"));
const meta = chatJson(chat, { instagramEncoding: true });
assert.ok(meta.includes("caf\\u00c3\\u00a9 \\u00e2\\u0098\\u0095"), "é and ☕ as UTF-8 bytes");
assert.ok(!/[^\x00-\x7f]/.test(meta), "pure ASCII output, like Instagram's");
assert.equal(JSON.parse(meta).title, "Ana");

// Markdown: escaped text, a heading per day, media linked relative to the chat folder.
{
  const { chatMarkdown } = await import("../src/chatarchive.js");
  const md = chatMarkdown({ title: "T", participants: [{ name: "A" }], messages: [
    { sender_name: "A", timestamp_ms: 1700000100000, content: "# *x* [y](z)" },
    { sender_name: "A", timestamp_ms: 1700000000000, photos: [{ uri: "f/photos/a b.jpg" }] },
  ] }, { folder: "f" });
  assert.ok(md.includes(String.raw`\# \*x\* \[y\](z)`), "message text can't become Markdown");
  assert.ok(md.includes("![Photo](photos/a%20b.jpg)"), "photos link to their files");
  assert.ok(/^## /m.test(md) && md.startsWith("# T"), "headings");
}

console.log("chatarchive ok");
