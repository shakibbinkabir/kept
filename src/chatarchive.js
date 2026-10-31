// src/chatarchive.js
//
// Turns a normalized chat (the DYI-shaped object from normalizer.js) into the
// pieces of a chat archive: which media files to download and where they go,
// a readable plain-text transcript, and optionally JSON in Instagram's own
// (mojibake) text encoding. Pure functions; offscreen.js does the downloading
// and zipping, test/chatarchive.test.mjs checks them.

const KINDS = [
  ["photos", "photos", "jpg"],
  ["videos", "videos", "mp4"],
  ["audio_files", "audio", "mp4"], // voice notes: audio-only MP4, as in Instagram's export
];

/**
 * One download per distinct media URL. Each item's `refs` are the media
 * objects whose `uri` should become the local path once it's downloaded.
 * @returns {{url: string, path: string, time: number, refs: object[]}[]} paths relative to the chat folder; time in seconds
 */
export function planMedia(chat) {
  const byUrl = new Map();
  let n = 0;
  for (const msg of chat.messages || []) {
    for (const [key, dir, ext] of KINDS) {
      for (const media of msg[key] || []) {
        if (!/^https?:/.test(media.uri || "")) continue;
        let item = byUrl.get(media.uri);
        if (!item) {
          item = { url: media.uri, path: `${dir}/${msg.timestamp_ms}_${++n}.${ext}`, time: Math.floor(msg.timestamp_ms / 1000), refs: [] };
          byUrl.set(media.uri, item);
        }
        item.refs.push(media);
      }
    }
  }
  return [...byUrl.values()];
}

/** Folder for this chat inside the archive, mirroring Instagram's data download. */
export function chatFolder(chat) {
  const path = String(chat.thread_path || "inbox/thread").replace(/[^\w\-./]+/g, "_");
  return `your_instagram_activity/messages/${path}`;
}

function duration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} min ${s} s` : `${s} s`;
}

/**
 * The chat as Markdown: a heading per day, the sender in bold, photos inline
 * and videos and voice notes as links to their files. Message text is
 * escaped so it can't turn into Markdown formatting by accident.
 */
export function chatMarkdown(chat, { folder = "", exportedAt = new Date() } = {}) {
  const local = (uri) => (folder && uri.startsWith(folder + "/") ? encodeURI(uri.slice(folder.length + 1)) : /^https?:/.test(uri) ? uri : null);
  const esc = (s) => String(s).replace(/([\\`*_[\]<>#|~])/g, "\\$1");
  const messages = [...(chat.messages || [])].reverse();
  const names = (chat.participants || []).map((p) => p.name).join(", ");
  const out = [`# ${esc(chat.title || "Instagram chat")}`, "", `${esc(names)} · ${messages.length} messages · exported with Kept on ${exportedAt.toLocaleDateString("en-GB")}`];
  let day = "";
  for (const m of messages) {
    const at = new Date(m.timestamp_ms);
    const thisDay = at.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (thisDay !== day) {
      out.push("", `## ${thisDay}`, "");
      day = thisDay;
    }
    const parts = [];
    if (m.call_duration != null) parts.push(m.call_duration ? `*Call, ${duration(m.call_duration)}*` : "*Missed call*");
    if (m.content) parts.push(esc(m.content).replace(/\n/g, "  \n"));
    for (const p of m.photos || []) parts.push(local(p.uri) ? `![Photo](${local(p.uri)})` : "*Photo*");
    for (const v of m.videos || []) parts.push(local(v.uri) ? `[Video](${local(v.uri)})` : "*Video*");
    for (const a of m.audio_files || []) parts.push(local(a.uri) ? `[Voice note](${local(a.uri)})` : "*Voice note*");
    if (m.share) parts.push(m.share.link ? `[${esc(m.share.share_text || "Shared post")}](${m.share.link})` : `*${esc(m.share.share_text || "Shared post")}*`);
    const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    out.push(`**${esc(m.sender_name)}** · ${time}  `, parts.join(" ") || "*(no content)*", "");
    if (m.reactions?.length) out.splice(out.length - 1, 0, `> ${m.reactions.map((r) => `${r.reaction} ${esc(r.actor)}`).join(", ")}`);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

/** Readable transcript, oldest message first, in the computer's local time. */
export function chatText(chat, { folder = "", exportedAt = new Date() } = {}) {
  const local = (uri) => (folder && uri.startsWith(folder + "/") ? uri.slice(folder.length + 1) : null);
  const messages = [...(chat.messages || [])].reverse();
  const names = (chat.participants || []).map((p) => p.name).join(", ");
  const out = [
    chat.title || "Instagram chat",
    `Exported with Kept on ${exportedAt.toLocaleString("en-GB")} · ${messages.length} messages · ${names}`,
    "",
  ];
  let day = "";
  for (const m of messages) {
    const at = new Date(m.timestamp_ms);
    const thisDay = at.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (thisDay !== day) {
      if (day) out.push("");
      out.push(`— ${thisDay} —`);
      day = thisDay;
    }
    const parts = [];
    if (m.call_duration != null) parts.push(m.call_duration ? `[call, ${duration(m.call_duration)}]` : "[missed call]");
    if (m.content) parts.push(m.content);
    for (const [key, label] of [["photos", "photo"], ["videos", "video"], ["audio_files", "voice message"]]) {
      for (const media of m[key] || []) parts.push(`[${label}${local(media.uri) ? `: ${local(media.uri)}` : ""}]`);
    }
    if (m.share) parts.push(`[shared${m.share.link ? `: ${m.share.link}` : ""}]${m.share.share_text ? ` ${m.share.share_text}` : ""}`);
    const time = at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const text = parts.join(" ").replace(/\n/g, "\n        ");
    out.push(`[${time}] ${m.sender_name}: ${text}`);
    if (m.reactions?.length) out.push(`        reactions: ${m.reactions.map((r) => `${r.reaction} ${r.actor}`).join(", ")}`);
  }
  return out.join("\n") + "\n";
}

// Instagram's data download writes every string as its UTF-8 bytes, each
// byte stored as one \u00XX character (so "é" becomes "Ã©").
function asInstagramBytes(text) {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
}

function mapStrings(value, fn) {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]));
  }
  return value;
}

/** JSON for the archive; `instagramEncoding` reproduces the export's mojibake byte for byte. */
export function chatJson(chat, { instagramEncoding = false } = {}) {
  if (!instagramEncoding) return JSON.stringify(chat, null, 2);
  return JSON.stringify(mapStrings(chat, asInstagramBytes), null, 2).replace(
    /[\u007f-ÿ]/g,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")
  );
}
