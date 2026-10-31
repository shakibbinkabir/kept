// src/names.js
//
// File and folder names for exports. Pure functions; test/names.test.mjs checks them.

export const pad = (n, width = 2) => String(n).padStart(width, "0");

export function dateStr(takenAt) {
  if (!takenAt) return "0000-00-00";
  const d = new Date(takenAt * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Keep letters/marks/digits from any script (Bengali, Arabic, CJK, …) so names
// stay readable; replace everything else, including path separators. Emoji
// selectors/joiners go first so a dropped emoji doesn't leave one behind.
export function sanitize(name) {
  return String(name)
    .replace(/[︀-️‍]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}_\-.]+/gu, "_")
    .replace(/^[_.]+|_+$/g, "") || "untitled";
}

// Usernames and post codes are already file-safe ([A-Za-z0-9._-]); keep them
// verbatim. sanitize() would trim a leading or trailing underscore off them,
// naming @some_user_'s files after @some_user.
export function ident(id) {
  return String(id).replace(/[^\w.\-]+/g, "_") || "untitled";
}

/**
 * A file's base name from the user's pattern: {username} {date} {time} {code} {index}.
 * Every name keeps {code} or {index}, so two posts never share one. In folder
 * mode the default drops {index}, which shifts as new posts arrive.
 */
export function fileBase(pattern, { folder = false, username = "", takenAt = 0, code = "", index = 1 } = {}) {
  let p = String(pattern || "").replace(/[\\/:*?"<>|\x00-\x1f]+/g, "_").trim();
  if (!p) p = folder ? "{date}_{code}" : "{index}_{date}_{code}";
  if (!/\{(code|index)\}/.test(p)) p += "_{code}";
  const d = new Date(takenAt * 1000);
  const time = takenAt ? `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}` : "00-00-00";
  const vals = { username: ident(username), date: dateStr(takenAt), time, code: ident(code), index: pad(index, 3) };
  return p.replace(/\{(\w+)\}/g, (m, k) => vals[k] ?? m).replace(/^[.\s]+|[.\s]+$/g, "") || ident(code);
}
