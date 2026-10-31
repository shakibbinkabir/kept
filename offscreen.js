// offscreen.js
//
// The export engine. Runs inside an offscreen document so it can:
//   - fetch instagram.com's API with the user's session (host permission)
//   - fetch CDN media bytes cross-origin (host permission bypasses CORS)
//   - URL.createObjectURL the finished ZIP (unavailable in a service worker)
//
// It receives one job at a time from background.js, streams progress back, and
// hands the finished blob URL + filename to the service worker to download.

import { createZip } from "./src/zip.js";
import { planMedia, chatFolder, chatText, chatJson } from "./src/chatarchive.js";
import { chatPage, inboxPage } from "./src/chatpage.js";
import { pad, dateStr, sanitize, ident, fileBase } from "./src/names.js";
import { profilePage } from "./src/profilepage.js";
import {
  resolveUser,
  paginateFeed,
  paginateReels,
  extractMedia,
  shortcodeToMediaId,
  getMediaInfo,
  getReel,
  getHighlightsTray,
  getCollections,
  paginateSaved,
  setWaitReporter,
  idSources,
  IGError,
} from "./src/igapi.js";

const MEDIA_CONCURRENCY = 6;
const textEncoder = new TextEncoder();

let lastBlobUrl = null;
const chatParts = new Map(); // jobId -> chats received so far
const pickCache = new Map(); // "user:mode" -> Map(shortcode -> item), from the picker's listing
const listStops = new Set(); // listing jobs the picker asked to stop

/* ===== messaging ===== */

function send(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function progress(jobId, phase, done, total, message) {
  send({ type: "EXPORT_PROGRESS", jobId, phase, done, total, message });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target !== "offscreen") return;

  // The popup's collection list (your saved collections).
  if (msg.type === "GET_COLLECTIONS") {
    getCollections().then((collections) => sendResponse({ collections }), (err) => sendResponse({ error: err?.message || "Couldn't load your collections." }));
    return true;
  }

  if (msg.type === "RUN_EXPORT") {
    runExport(msg.job);
  } else if (msg.type === "RUN_CHAT_EXPORT") {
    runChatExport({ ...msg.job, chats: [msg.job.chat] });
  } else if (msg.type === "CHAT_PART") {
    // Several chats arrive one by one from bridge.js, then CHAT_PARTS_DONE.
    if (!chatParts.has(msg.jobId)) chatParts.set(msg.jobId, []);
    chatParts.get(msg.jobId).push(msg.chat);
    progress(msg.jobId, "chats", chatParts.get(msg.jobId).length, null, `${chatParts.get(msg.jobId).length} chats loaded`);
  } else if (msg.type === "CHAT_PARTS_DONE") {
    runChatExport({ jobId: msg.jobId, chats: chatParts.get(msg.jobId) || [], options: msg.options });
    chatParts.delete(msg.jobId);
  } else if (msg.type === "RUN_LIST") {
    runList(msg);
  } else if (msg.type === "RUN_LIST_STOP") {
    listStops.add(msg.jobId);
  } else if (msg.type === "RUN_CHECK") {
    runCheck(msg.jobId);
  } else if (msg.type === "REVOKE" && msg.url) {
    if (msg.url === lastBlobUrl) lastBlobUrl = null;
    URL.revokeObjectURL(msg.url);
  }
});

/* ===== small utilities ===== */

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function fetchBytes(url) {
  // credentials omitted: CDN media is public and sending IG cookies to the
  // CDN can trigger 403s. Host permission still lets us read the body.
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`media ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Instagram's CDN serves most images as WebP even where the API implies JPEG,
// so name image files by what the bytes actually are.
function imageExt(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "webp";
  return null;
}

function withRealExt(path, bytes) {
  const ext = /\.(jpg|png|webp)$/.test(path) && imageExt(bytes);
  return ext ? path.replace(/\.\w+$/, `.${ext}`) : path;
}

// Run `worker` over `items` with bounded concurrency, preserving index order.
async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        results[idx] = await worker(items[idx], idx);
      }
    }
  );
  await Promise.all(runners);
  return results;
}

// A story / highlight item is a single logical media; grab its primary file
// (the video or image) and ignore the video poster thumbnail.
function primaryMedia(ex) {
  return ex.media.find((m) => !m.isThumb) || null;
}

// Fetch a queue of { path, url | bytes, id?, time? } into the sink with
// file-level progress, fixing each q.path's extension to the real file type in
// place, so indexes built afterwards match what was saved. An item (q.id) is
// done once all of its files are saved. Returns { failed, total, saved }.
async function fetchQueue(job, queue, label, sink) {
  const total = queue.length;
  const left = new Map();
  const bad = new Set();
  const saved = new Set();
  for (const q of queue) if (q.id) left.set(q.id, (left.get(q.id) || 0) + 1);
  let done = 0;
  let failed = 0;
  progress(job.jobId, "downloading", 0, total, `Downloading ${total} ${label}…`);
  await mapPool(queue, MEDIA_CONCURRENCY, async (q) => {
    try {
      const bytes = q.bytes || (await fetchBytes(q.url));
      if (q.url) q.path = withRealExt(q.path, bytes);
      if (!(await sink.add(q.path, bytes, q.time))) throw new Error("not saved");
      saved.add(q.path);
    } catch {
      failed++;
      bad.add(q.id);
    } finally {
      done++;
      progress(job.jobId, "downloading", done, total);
      if (q.id) {
        left.set(q.id, left.get(q.id) - 1);
        if (!left.get(q.id) && !bad.has(q.id)) sink.done(q.id);
      }
    }
  });
  return { failed, total, saved };
}

// "Only new": drop what an earlier export of this account already saved.
function skipSeen(job, items, idOf = (ex) => ex.shortcode) {
  const seen = new Set(job.seen || []);
  const fresh = items.filter((x) => !seen.has(idOf(x)));
  job.skipped = items.length - fresh.length;
  if (items.length && !fresh.length) throw new IGError("Nothing new since your last export.", 0);
  return fresh;
}

/* ===== saving: one ZIP, or files straight into a folder ===== */

// A ZIP is built in memory and capped at 4 GB. Folder mode hands each file to
// chrome.downloads as soon as it's fetched, into Downloads/Instagram/<root>/,
// so there's no size limit and a stopped export keeps what it saved.
function makeSink(job, root = "", username = "") {
  const folder = !!job.options?.folder;
  const entries = [];
  const ids = [];
  const stamp = nowStamp();
  const remember = (list) => job.seenKey && list.length && send({ type: "REMEMBER", key: job.seenKey, ids: list });
  return {
    folder,
    entries,
    name: (ex, index) => fileBase(job.options?.pattern, { folder, username: ex.owner || username, takenAt: ex.takenAt, code: ex.shortcode, index }),
    async add(path, bytes, time) {
      if (!folder) return entries.push({ path, bytes, date: time ? new Date(time * 1000) : undefined }) > 0;
      // Each run's index gets its own name, so repeat runs into one folder keep theirs.
      const perRun = path === "index.json" ? `index_${stamp}.json` : path === "index.html" && !root.startsWith("chats/") ? `gallery_${stamp}.html` : path;
      return saveToFolder(`Instagram/${root}/${perRun}`, bytes, job.jobId);
    },
    // In folder mode each finished item is remembered as it lands, so running
    // the export again with "only new" picks up where it stopped.
    done(id) {
      if (folder) remember([id]);
      else ids.push(id);
    },
    finish(zipName, summary) {
      summary = { ...summary, skipped: job.skipped || 0 };
      if (!folder) return finishBlob(job, createZip(entries), zipName, summary, job.seenKey ? { key: job.seenKey, ids } : null);
      send({ type: "EXPORT_DONE", jobId: job.jobId, filename: `Downloads/Instagram/${root}/`, summary });
    },
  };
}

// A voice note's waveform for the chat page: 48 peaks, 0 to 1.
async function waveform(bytes) {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const data = (await ctx.decodeAudioData(bytes.slice().buffer)).getChannelData(0);
  const n = 48, step = Math.max(1, Math.floor(data.length / n));
  const peaks = [];
  for (let i = 0; i < n; i++) {
    let max = 0;
    for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 8) max = Math.max(max, Math.abs(data[j]));
    peaks.push(max);
  }
  const top = Math.max(...peaks) || 1;
  return peaks.map((p) => Math.round((p / top) * 100) / 100);
}

async function saveToFolder(filename, bytes, jobId) {
  const type = MIME[filename.split(".").pop()] || "application/octet-stream";
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const resp = await chrome.runtime.sendMessage({ type: "SAVE_TO_FOLDER", url, filename, jobId }).catch(() => null);
  if (!resp?.ok) URL.revokeObjectURL(url);
  return !!resp?.ok;
}

/* ===== enumeration ===== */

// Collect normalized posts from a pager (the posts grid or the Reels tab),
// honoring the mode filter and the count/date filters. Returns newest-first.
async function collectItems(jobId, pager, modeFilter, filter) {
  const collected = [];
  const seen = new Set();
  const fromTs = filter?.fromDate ? Math.floor(Date.parse(filter.fromDate + "T00:00:00") / 1000) : null;
  const toTs = filter?.toDate ? Math.floor(Date.parse(filter.toDate + "T23:59:59") / 1000) : null;
  const n = Math.max(1, filter?.n | 0);
  let unpinned = 0;

  let stop = false;
  await pager((rawItems) => {
    for (const raw of rawItems) {
      const ex = extractMedia(raw);
      if (seen.has(ex.shortcode)) continue;
      seen.add(ex.shortcode);

      if (filter?.type === "range") {
        if (fromTs && ex.takenAt && ex.takenAt < fromTs) {
          // Past the pinned posts the grid is newest-first: once we drop below
          // "from", nothing older can qualify, so stop paging entirely.
          if (ex.pinned) continue;
          stop = true;
          break;
        }
        if (toTs && ex.takenAt && ex.takenAt > toTs) continue;
      }

      if (!modeFilter(ex)) continue;

      collected.push(ex);
      progress(jobId, "enumerating", collected.length, null, `Found ${collected.length} items…`);

      // Pinned posts can be arbitrarily old, so only chronological ones count
      // towards "most recent N"; the sort below puts pinned ones in place.
      if (filter?.type === "recent" && !ex.pinned && ++unpinned >= n) {
        stop = true;
        break;
      }
    }
    return stop;
  });

  collected.sort((a, b) => b.takenAt - a.takenAt);
  if (filter?.type === "recent") return collected.slice(0, n);
  if (filter?.type === "oldest") return collected.slice(-n);
  return collected;
}

/* ===== the offline gallery (index.html) ===== */

// One gallery entry: the files that saved, a cover, and the post's details.
function galleryItem(ex, paths, saved, url = "", group = "") {
  const ok = paths.filter((p) => saved.has(p));
  const files = ok.filter((p) => !/_thumb\.\w+$/.test(p));
  const cover = files.find((p) => !/\.mp4$/.test(p)) || ok.find((p) => /_thumb\./.test(p)) || files[0];
  return { files, cover, caption: ex.caption || "", takenAt: ex.takenAt, kind: ex.kind, url, group, author: ex.owner || "" };
}
const addGallery = (sink, username, type, items) => sink.add("index.html", textEncoder.encode(profilePage({ username, type, items })));

/* ===== picking before exporting ===== */

// The items ticked in the picker: from its listing when it's still in memory,
// otherwise by paging the account again and keeping just those codes.
async function pickedOr(job, user, collect) {
  const only = job.options.only;
  if (!only?.length) return collect();
  const cache = pickCache.get(`${user.username.toLowerCase()}:${job.mode}`);
  const hits = only.map((code) => cache?.get(code)).filter(Boolean);
  const items = hits.length === only.length ? hits : (await collect()).filter((ex) => only.includes(ex.shortcode));
  return items.sort((a, b) => b.takenAt - a.takenAt);
}

// Lists an account's posts, images or reels (or its highlights) for the
// picker page, a page at a time, until done or asked to stop.
async function runList({ jobId, username, mode }) {
  setWaitReporter((until) => send({ type: "PICK_WAIT", jobId, until }));
  try {
    const user = await resolveUser(username);
    if (!user.can_view) throw new IGError(`@${user.username} is private and you don't follow them.`, 403);
    if (mode === "highlights") {
      const tray = await getHighlightsTray(user.id);
      send({ type: "PICK_ITEMS", jobId, username: user.username, items: tray.map((h) => ({ id: h.id, title: h.title })) });
    } else {
      const cache = new Map();
      pickCache.set(`${user.username.toLowerCase()}:${mode}`, cache);
      const want = mode === "reels" ? (ex) => ex.kind === "reel" : mode === "images" ? (ex) => ex.media.some((m) => !m.isVideo && !m.isThumb) : () => true;
      const pager = mode === "reels" ? (cb) => paginateReels(user.id, cb) : (cb) => paginateFeed(user.username, cb);
      await pager((rawItems) => {
        const items = [];
        for (const raw of rawItems) {
          const ex = extractMedia(raw);
          if (!ex.shortcode || cache.has(ex.shortcode) || !want(ex)) continue;
          cache.set(ex.shortcode, ex);
          items.push({ code: ex.shortcode, takenAt: ex.takenAt, kind: ex.kind, thumb: ex.thumb, files: ex.media.filter((m) => !m.isThumb).length, caption: ex.caption.slice(0, 160), pinned: ex.pinned });
        }
        if (items.length) send({ type: "PICK_ITEMS", jobId, username: user.username, items });
        return listStops.has(jobId);
      });
    }
    send({ type: "PICK_DONE", jobId, stopped: listStops.has(jobId) });
  } catch (err) {
    send({ type: "PICK_ERROR", jobId, error: err?.message || "Couldn't list that account." });
  } finally {
    listStops.delete(jobId);
    setWaitReporter(null);
  }
}

/* ===== packaging ===== */

// Build the per-post file list (names + urls) from a normalized item.
// `imagesOnly` drops videos and their poster thumbnails.
function planPostFiles(post, { imagesOnly = false } = {}) {
  const files = [];
  let slot = 0;
  for (const m of post.media) {
    if (m.isThumb) {
      if (imagesOnly) continue;
      files.push({ name: `${pad(slot)}_thumb.jpg`, url: m.url });
      continue;
    }
    if (imagesOnly && m.isVideo) continue;
    slot++;
    files.push({ name: `${pad(slot)}.${m.type}`, url: m.url });
  }
  return files;
}

// Shared pipeline for the foldered ZIP modes (posts / images).
async function exportFolderedZip(job, user, { imagesOnly }) {
  const { jobId } = job;
  // Images-only counts posts that have an image, so "most recent 5" means five
  // posts with images, not the five newest posts minus the reels among them.
  const hasImage = (ex) => ex.media.some((m) => !m.isVideo && !m.isThumb);
  const grid = (onItems) => paginateFeed(user.username, onItems);
  const items = skipSeen(job, await pickedOr(job, user, () => collectItems(jobId, grid, imagesOnly ? hasImage : () => true, job.options.filter)));

  // Attach a planned file list to each post; drop posts that contribute nothing.
  const posts = [];
  for (const post of items) {
    const files = planPostFiles(post, { imagesOnly });
    if (files.length === 0) continue;
    posts.push({ post, files });
  }

  if (posts.length === 0) {
    throw new IGError(
      imagesOnly ? "No images found for this selection." : "No posts found for this selection.",
      0
    );
  }

  // Flatten to a download queue (captions too) for real file-level progress.
  const suffix = imagesOnly ? "images" : "posts";
  const sink = makeSink(job, `${ident(user.username)}/${suffix}`, user.username);
  const queue = [];
  posts.forEach((p, i) => {
    const folder = sink.name(p.post, i + 1);
    const item = { id: p.post.shortcode, time: p.post.takenAt };
    p.folder = folder;
    for (const f of p.files) queue.push({ path: `${folder}/${f.name}`, url: f.url, file: f, ...item });
    if (p.post.caption) queue.push({ path: `${folder}/caption.txt`, bytes: textEncoder.encode(p.post.caption), ...item });
  });

  const { failed, total, saved } = await fetchQueue(job, queue, "files", sink);
  for (const q of queue) if (q.file) q.file.name = q.path.slice(q.path.indexOf("/") + 1);
  await addGallery(sink, user.username, suffix, posts.map((p) => galleryItem(p.post, p.files.map((f) => `${p.folder}/${f.name}`), saved, `https://www.instagram.com/p/${p.post.shortcode}/`)));

  // A top-level index.json.
  const index = [];
  posts.forEach((p, i) => {
    index.push({
      index: i + 1,
      folder: p.folder,
      shortcode: p.post.shortcode,
      taken_at: p.post.takenAt,
      date: dateStr(p.post.takenAt),
      kind: p.post.kind,
      url: `https://www.instagram.com/p/${p.post.shortcode}/`,
      caption: p.post.caption,
      files: p.files.map((f) => f.name),
    });
  });
  await sink.add("index.json", textEncoder.encode(JSON.stringify({ username: user.username, exported_at: nowStamp(), count: posts.length, posts: index }, null, 2)));

  progress(jobId, "zipping", null, null, sink.folder ? "Finishing…" : "Packaging ZIP…");
  sink.finish(`${ident(user.username)}_${suffix}_${nowStamp()}.zip`, { posts: posts.length, files: total, failed });
}

async function exportReels(job, user) {
  const { jobId } = job;
  // The Reels tab, not the grid: reels can be hidden from the posts grid.
  const tab = (onItems) => paginateReels(user.id, onItems);
  const reels = skipSeen(job, await pickedOr(job, user, () => collectItems(jobId, tab, (ex) => ex.kind === "reel", job.options.filter)));
  if (reels.length === 0) throw new IGError("No reels found for this selection.", 0);

  const sink = makeSink(job, `${ident(user.username)}/reels`, user.username);
  const queue = [];
  reels.forEach((r, i) => {
    const video = r.media.find((m) => m.isVideo);
    if (!video) return;
    queue.push({ path: `${sink.name(r, i + 1)}.mp4`, url: video.url, post: r, id: r.shortcode, time: r.takenAt });
  });

  const { failed, total, saved } = await fetchQueue(job, queue, "reels", sink);
  await addGallery(sink, user.username, "reels", queue.map((q) => galleryItem(q.post, [q.path], saved, `https://www.instagram.com/reel/${q.post.shortcode}/`)));
  await sink.add("index.json", textEncoder.encode(JSON.stringify({
      username: user.username,
      exported_at: nowStamp(),
      count: queue.length,
      reels: queue.map((q, i) => ({
        index: i + 1,
        file: q.path,
        shortcode: q.post.shortcode,
        taken_at: q.post.takenAt,
        date: dateStr(q.post.takenAt),
        url: `https://www.instagram.com/reel/${q.post.shortcode}/`,
        caption: q.post.caption,
      })),
  }, null, 2)));

  progress(jobId, "zipping", null, null, sink.folder ? "Finishing…" : "Packaging ZIP…");
  sink.finish(`${ident(user.username)}_reels_${nowStamp()}.zip`, { reels: total, failed });
}

async function exportStories(job, user) {
  const { jobId } = job;
  progress(jobId, "enumerating", 0, null, "Loading stories…");
  const { items: rawItems } = await getReel(user.id);

  const sink = makeSink(job, `${ident(user.username)}/stories`, user.username);
  const queue = [];
  skipSeen(job, rawItems.map(extractMedia)).forEach((ex, i) => {
    const m = primaryMedia(ex);
    if (!m) return;
    queue.push({ path: `${sink.name(ex, i + 1)}.${m.type}`, url: m.url, ex, id: ex.shortcode, time: ex.takenAt });
  });

  if (queue.length === 0) {
    throw new IGError(`@${user.username} has no active stories right now.`, 0);
  }
  progress(jobId, "enumerating", queue.length, null, `Found ${queue.length} stories…`);

  const { failed, total, saved } = await fetchQueue(job, queue, "stories", sink);
  await addGallery(sink, user.username, "stories", queue.map((q) => galleryItem(q.ex, [q.path], saved)));
  await sink.add("index.json", textEncoder.encode(JSON.stringify({
      username: user.username,
      exported_at: nowStamp(),
      type: "stories",
      count: queue.length,
      items: queue.map((q, i) => ({
        index: i + 1,
        file: q.path,
        taken_at: q.ex.takenAt,
        date: dateStr(q.ex.takenAt),
        kind: q.ex.kind,
      })),
  }, null, 2)));

  progress(jobId, "zipping", null, null, sink.folder ? "Finishing…" : "Packaging ZIP…");
  sink.finish(`${ident(user.username)}_stories_${nowStamp()}.zip`, { stories: total, failed });
}

// `user` is null when exporting just the highlight open in the tab — the
// highlight itself says who owns it, so no username is needed.
async function exportHighlights(job, user) {
  const { jobId } = job;
  progress(jobId, "enumerating", 0, null, "Loading highlights…");
  const wantId = job.options.highlightId
    ? String(job.options.highlightId).replace(/^highlight:/, "")
    : null;
  let selected = wantId ? [{ id: wantId, title: "" }] : await getHighlightsTray(user.id);
  if (!wantId && job.options.highlightIds?.length) selected = selected.filter((h) => job.options.highlightIds.includes(h.id));
  if (selected.length === 0) throw new IGError(`@${user.username} has no highlights.`, 0);

  let owner = user?.username || "";
  let found = [];
  for (let hi = 0; hi < selected.length; hi++) {
    const h = selected[hi];
    const reel = await getReel(`highlight:${h.id}`);
    const title = h.title || reel.title || "Highlight";
    owner = owner || reel.owner;
    for (const raw of reel.items) {
      const ex = extractMedia(raw);
      const m = primaryMedia(ex);
      if (m) found.push({ ex, m, title, hi });
    }
    progress(jobId, "enumerating", found.length, null, `Scanned ${hi + 1}/${selected.length} highlights…`);
  }
  found = skipSeen(job, found, (f) => f.ex.shortcode);
  if (found.length === 0) throw new IGError("No downloadable media found in those highlights.", 0);

  // One folder per highlight. Folder mode names it by title alone, since
  // the tray order (and so the number) changes as highlights are added.
  const sink = makeSink(job, `${ident(owner || "instagram")}/highlights`, owner);
  const perFolder = {};
  const queue = found.map((f) => {
    const folder = sink.folder ? sanitize(f.title) : `${pad(f.hi + 1, 2)}_${sanitize(f.title)}`;
    perFolder[folder] = (perFolder[folder] || 0) + 1;
    return { path: `${folder}/${sink.name(f.ex, perFolder[folder])}.${f.m.type}`, url: f.m.url, ex: f.ex, title: f.title, id: f.ex.shortcode, time: f.ex.takenAt };
  });

  const { failed, total, saved } = await fetchQueue(job, queue, "items", sink);
  await addGallery(sink, owner, "highlights", queue.map((q) => galleryItem(q.ex, [q.path], saved, "", q.title)));
  await sink.add("index.json", textEncoder.encode(JSON.stringify({
      username: owner,
      exported_at: nowStamp(),
      type: "highlights",
      highlights: selected.length,
      count: queue.length,
      items: queue.map((q, i) => ({
        index: i + 1,
        file: q.path,
        highlight: q.title,
        taken_at: q.ex.takenAt,
        date: dateStr(q.ex.takenAt),
        kind: q.ex.kind,
      })),
  }, null, 2)));

  progress(jobId, "zipping", null, null, sink.folder ? "Finishing…" : "Packaging ZIP…");
  sink.finish(`${ident(owner || "instagram")}_highlights_${nowStamp()}.zip`, { highlights: selected.length, files: total, failed });
}

// Your saved posts: everything ("all"), one collection (its id), or every
// collection you made ("every"), each in its own folder. Every post keeps its
// author, link, date and caption; the gallery groups them by collection.
async function exportSaved(job) {
  const { jobId } = job;
  const which = job.options.collection || "all";
  progress(jobId, "resolving", null, null, "Loading your collections…");
  let targets = [{ id: "all", name: "All saved posts" }];
  if (which !== "all") {
    const cols = await getCollections();
    targets = which === "every" ? cols.filter((c) => !c.auto) : cols.filter((c) => c.id === which);
    if (!targets.length) throw new IGError(which === "every" ? "You have no collections yet." : "That collection wasn't found.", 0);
  }
  const several = targets.length > 1;
  const label = several ? "collections" : sanitize(targets[0].name);
  const sink = makeSink(job, `saved/${label}`);
  const groups = [];
  let skipped = 0;
  for (const col of targets) {
    progress(jobId, "enumerating", 0, null, `Loading ${col.name}…`);
    const found = await collectItems(jobId, (onItems) => paginateSaved(col.id, onItems), () => true, job.options.filter);
    let items;
    try {
      items = skipSeen(job, found);
    } catch {
      items = []; // all of this collection was saved before
      job.skipped = found.length;
    }
    skipped += job.skipped || 0;
    groups.push({ col, items });
  }
  job.skipped = skipped;
  if (!groups.some((g) => g.items.length)) {
    throw new IGError(skipped ? "Nothing new since your last export." : "No saved posts found for this selection.", 0);
  }

  const queue = [];
  const posts = [];
  for (const { col, items } of groups) {
    items.forEach((ex, i) => {
      const files = planPostFiles(ex);
      if (!files.length) return;
      const folder = `${several ? sanitize(col.name) + "/" : ""}${sink.name(ex, i + 1)}`;
      const item = { id: ex.shortcode, time: ex.takenAt };
      for (const f of files) queue.push({ path: `${folder}/${f.name}`, url: f.url, file: f, ...item });
      if (ex.caption) queue.push({ path: `${folder}/caption.txt`, bytes: textEncoder.encode(ex.caption), ...item });
      posts.push({ ex, files, folder, collection: col.name });
    });
  }
  const { failed, total, saved } = await fetchQueue(job, queue, "files", sink);
  for (const q of queue) if (q.file) q.file.name = q.path.slice(q.path.lastIndexOf("/") + 1);

  const url = (ex) => `https://www.instagram.com/p/${ex.shortcode}/`;
  await addGallery(sink, "you", several ? "saved collections" : `saved · ${targets[0].name}`, posts.map((p) =>
    galleryItem(p.ex, p.files.map((f) => `${p.folder}/${f.name}`), saved, url(p.ex), several ? p.collection : "")));
  await sink.add("index.json", textEncoder.encode(JSON.stringify({
    type: "saved",
    exported_at: nowStamp(),
    collections: targets.map((c) => c.name),
    count: posts.length,
    posts: posts.map((p) => ({
      folder: p.folder,
      collection: p.collection,
      author: p.ex.owner,
      shortcode: p.ex.shortcode,
      url: url(p.ex),
      taken_at: p.ex.takenAt,
      date: dateStr(p.ex.takenAt),
      kind: p.ex.kind,
      caption: p.ex.caption,
      files: p.files.map((f) => f.name),
    })),
  }, null, 2)));

  progress(jobId, "zipping", null, null, sink.folder ? "Finishing…" : "Packaging ZIP…");
  sink.finish(`instagram_saved_${label}_${nowStamp()}.zip`, { posts: posts.length, files: total, failed });
}

async function exportProfilePic(job, user) {
  if (!user.profile_pic_url_hd) throw new IGError("No profile picture available.", 0);
  const bytes = await fetchBytes(user.profile_pic_url_hd);
  finishBlob(job, bytes, withRealExt(`${ident(user.username)}_profile.jpg`, bytes), { profilePic: 1 });
}

async function exportSinglePost(job) {
  const { jobId } = job;
  const code = job.options.shortcode;
  if (!code) throw new IGError("No post selected.", 0);

  progress(jobId, "enumerating", 1, 1, "Loading post…");
  const raw = await getMediaInfo(shortcodeToMediaId(code));
  const post = extractMedia(raw);
  const files = planPostFiles(post);
  if (files.length === 0) throw new IGError("That post has no downloadable media.", 0);

  const base = `${ident(raw.user?.username || job.username || post.shortcode)}_${ident(post.shortcode || code)}`;
  const sink = makeSink({ ...job, options: {} }); // one file or a small ZIP, never a folder
  const queue = files.map((f) => ({ path: f.name, url: f.url, time: post.takenAt }));
  const { failed, total } = await fetchQueue(job, queue, "files", sink);
  const { entries } = sink;
  if (entries.length === 0) throw new IGError("Couldn't download that post's media.", 0);

  // A lone media file with no caption is saved as-is rather than zipped.
  if (queue.length === 1 && !post.caption) {
    finishBlob(job, entries[0].bytes, `${base}.${entries[0].path.split(".").pop()}`, { files: 1 });
    return;
  }

  if (post.caption) await sink.add("caption.txt", textEncoder.encode(post.caption), post.takenAt);
  progress(jobId, "zipping", null, null, "Packaging ZIP…");
  sink.finish(`${base}.zip`, { files: total, failed });
}

/* ===== finalize ===== */

// Without a type Chrome sniffs the blob and may swap the extension (.zip → .txt).
const MIME = {
  zip: "application/zip", jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4",
  json: "application/json", txt: "text/plain", html: "text/html",
};

// `remember` ({ key, ids }) is stored once the download is accepted, for "only new".
function finishBlob(job, bytes, filename, summary, remember = null) {
  if (lastBlobUrl) {
    URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = null;
  }
  const type = MIME[filename.split(".").pop()] || "application/octet-stream";
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  lastBlobUrl = url;
  send({ type: "EXPORT_DOWNLOAD_URL", jobId: job.jobId, url, filename, summary, remember });
}

/* ===== dispatch ===== */

async function runExport(job) {
  const { jobId, mode, username } = job;
  // When Instagram says "slow down", the popup shows a countdown.
  setWaitReporter((until) => send({ type: "EXPORT_PROGRESS", jobId, phase: "waiting", until }));
  try {
    // A single post, or the one highlight open in the tab, carries its own
    // owner — no profile lookup needed.
    if (mode === "post") {
      await exportSinglePost(job);
      return;
    }
    if (mode === "highlights" && job.options.highlightId) {
      await exportHighlights(job, null);
      return;
    }
    if (mode === "saved") {
      await exportSaved(job);
      return;
    }

    progress(jobId, "resolving", null, null, `Resolving @${username}…`);
    const user = await resolveUser(username);

    if (mode === "profilePic") {
      await exportProfilePic(job, user);
      return;
    }

    // Everything else needs access to the user's content.
    if (!user.can_view) {
      throw new IGError(`@${user.username} is private and you don't follow them.`, 403);
    }

    if (mode === "posts") {
      await exportFolderedZip(job, user, { imagesOnly: false });
    } else if (mode === "images") {
      await exportFolderedZip(job, user, { imagesOnly: true });
    } else if (mode === "reels") {
      await exportReels(job, user);
    } else if (mode === "stories") {
      await exportStories(job, user);
    } else if (mode === "highlights") {
      await exportHighlights(job, user);
    } else {
      throw new IGError(`Unknown export mode: ${mode}`, 0);
    }
  } catch (err) {
    send({
      type: "EXPORT_ERROR",
      jobId,
      error: err?.message || "Export failed.",
      status: err?.status ?? null,
    });
  } finally {
    setWaitReporter(null);
  }
}

/* ===== chat archive ===== */

// Captured chats (already normalized by bridge.js) become one ZIP laid out
// like Instagram's own data download: per chat a message_1.json, a readable
// chat.txt and its photos, videos and voice notes, with the JSON pointing at
// the local copies. Media links expire, so they're fetched right away. One
// chat: index.html is its offline page. Several: index.html lists them and
// each gets a page in chats/.
async function runChatExport(job) {
  const { jobId, chats, options = {} } = job;
  try {
    const title = chats.length > 1 ? `${chats.length}_chats` : sanitize(chats[0].title || "");
    const name = `${title === "untitled" ? "thread" : title}_${nowStamp()}`;
    const sink = makeSink({ ...job, options }, `chats/${name}`);
    // Voice notes get a waveform for the page's player as they're saved.
    const waves = {};
    const add = sink.add;
    sink.add = async (path, bytes, time) => {
      if (/\/audio\/[^/]+$/.test(path)) waves[path] = await waveform(bytes).catch(() => null);
      return add(path, bytes, time);
    };
    const plan = [];
    for (const chat of chats) {
      const folder = chatFolder(chat);
      if (options.media !== false) {
        for (const item of planMedia(chat)) plan.push({ ...item, path: `${folder}/${item.path}` });
      }
    }
    let failed = 0;
    if (plan.length) {
      const got = await fetchQueue(job, plan, "photos, videos and voice notes", sink);
      failed = got.failed;
      // Failed downloads keep Instagram's (expiring) link.
      for (const item of plan) {
        if (got.saved.has(item.path)) for (const ref of item.refs) ref.uri = item.path;
      }
    }

    progress(jobId, "zipping", null, null, sink.folder ? "Finishing…" : "Packaging ZIP…");
    const pages = [];
    chats.forEach((chat, i) => {
      const folder = chatFolder(chat);
      pages.push(
        { path: `${folder}/message_1.json`, bytes: textEncoder.encode(chatJson(chat, { instagramEncoding: !!options.instagramEncoding })) },
        { path: `${folder}/chat.txt`, bytes: textEncoder.encode(chatText(chat, { folder })) }
      );
      if (chats.length > 1) pages.push({ path: `chats/${pad(i + 1, 3)}.html`, bytes: textEncoder.encode(chatPage(chat, { base: "../", back: "../index.html", waves })) });
    });
    // Open index.html to read offline; media loads from the folders beside it.
    pages.unshift({ path: "index.html", bytes: textEncoder.encode(chats.length > 1 ? inboxPage(chats) : chatPage(chats[0], { waves })) });
    for (const page of pages) await sink.add(page.path, page.bytes);

    const messages = chats.reduce((n, c) => n + c.messages.length, 0);
    sink.finish(`instagram_${name}.zip`, { chats: chats.length, messages, media: plan.length, failed });
  } catch (err) {
    send({ type: "EXPORT_ERROR", jobId, error: err?.message || "Couldn't build the chat export." });
  }
}

/* ===== "Check Instagram" ===== */

// One small request per feature against a public account that always has
// posts, reels and highlights, so a failure points at Instagram, not the
// account being exported.
const CANARY = "instagram";

async function runCheck(jobId) {
  const report = (key, label, state, detail) => send({ type: "CHECK_PROGRESS", jobId, key, label, state, detail });
  setWaitReporter((until) => send({ type: "CHECK_PROGRESS", jobId, waiting: until }));

  const ctx = {};
  const steps = [
    ["search", "Find accounts", async () => {
      ctx.user = await resolveUser(CANARY);
      return "account search and profile info work";
    }],
    ["posts", "Posts", async () => {
      let n = 0;
      await paginateFeed(CANARY, (items) => {
        n = items.length;
        ctx.pk = items.find((i) => i.pk)?.pk;
        return true;
      });
      if (!n) throw new IGError("Instagram returned no posts.", 0);
      return `${n} posts on the first page`;
    }],
    ["post", "Single posts", async () => {
      if (!ctx.pk) throw new IGError("Skipped: needs the posts check.", 0);
      await getMediaInfo(String(ctx.pk).split("_")[0]);
      return "post details load";
    }],
    ["reels", "Reels", async () => {
      let n = 0;
      await paginateReels(ctx.user.id, (items) => {
        n = items.length;
        return true;
      });
      if (!n) throw new IGError("Instagram returned no reels.", 0);
      return "reels tab and reel details load";
    }],
    ["stories", "Stories", async () => {
      const { items } = await getReel(ctx.user.id);
      return items.length ? `${items.length} active stories` : "works (no active stories right now)";
    }],
    ["highlights", "Highlights", async () => {
      const tray = await getHighlightsTray(ctx.user.id);
      if (!tray.length) throw new IGError("Instagram returned no highlights.", 0);
      const { items } = await getReel(`highlight:${tray[0].id}`);
      if (!items.length) throw new IGError("A highlight came back empty.", 0);
      return `${tray.length} highlights`;
    }],
  ];

  for (const [key, label, fn] of steps) {
    if (key !== "search" && !ctx.user) {
      report(key, label, "fail", "Skipped: needs account search");
      continue;
    }
    report(key, label, "running");
    try {
      report(key, label, "ok", await fn());
    } catch (err) {
      report(key, label, "fail", err?.message || String(err));
    }
  }
  setWaitReporter(null);
  send({ type: "CHECK_DONE", jobId, idSources: { ...idSources } });
}
