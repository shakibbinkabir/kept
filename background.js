// background.js — MV3 service worker (orchestrator)
//
// The popup is ephemeral and the real work lives in an offscreen document, so
// this worker is the stable hub: it spins up the offscreen document, forwards
// the export job, mirrors progress onto the toolbar badge, and performs every
// chrome.downloads.download (profile ZIPs and chat archives alike).
//
// Chat capture (bridge.js) talks straight to the popup; once a chat is
// captured, the popup sends it here to be archived (media + ZIP) offscreen.

const OFFSCREEN_URL = "offscreen.html";

let jobCounter = 0;
const pendingDownloads = new Map(); // downloadId -> { url, jobId }

/* ===== downloads ===== */

// Download managers (e.g. IDM) hook every download and can drop the filename
// we ask for, leaving a blob UUID. Re-assert our own names when Chrome asks.
const wantedNames = new Map(); // download url -> filename
const overwrite = new Set(); // folder-mode urls: a repeat export replaces the same file

function saveFile(url, filename, callback, saveAs = true) {
  wantedNames.set(url, filename);
  chrome.downloads.download({ url, filename, saveAs }, callback);
}

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const filename = wantedNames.get(item.url);
  if (!filename) return; // not ours — Chrome proceeds with its own choice
  wantedNames.delete(item.url);
  suggest({ filename, conflictAction: overwrite.delete(item.url) ? "overwrite" : "uniquify" });
});

/* ===== offscreen lifecycle ===== */

async function ensureOffscreen() {
  if (chrome.offscreen.hasDocument) {
    const exists = await chrome.offscreen.hasDocument();
    if (exists) return;
  }
  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["BLOBS"],
      justification: "Fetch and package Instagram media into a downloadable ZIP.",
    });
  } catch (err) {
    // Two near-simultaneous requests can race; a "single offscreen document"
    // error just means it already exists.
    if (!/single offscreen/i.test(err?.message || "")) throw err;
  }
}

/* ===== GraphQL relay ===== */

// Instagram's /api/graphql only answers requests from its own pages, so the
// offscreen engine's queries run in an instagram.com tab via src/bridge.js.
async function gqlInTab(msg) {
  const [tab] = await chrome.tabs.query({ url: "https://www.instagram.com/*", discarded: false });
  if (!tab) return { error: "Open instagram.com in a tab (logged in), then try again." };
  const ask = () => chrome.tabs.sendMessage(tab.id, { action: "IG_GQL", query: msg.query, variables: msg.variables });
  try {
    return await ask();
  } catch {
    // Tabs opened before the extension was (re)loaded don't have bridge.js yet.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/queryvars.js", "src/bridge.js"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/pageids.js"], world: "MAIN" });
    return ask();
  }
}

/* ===== "only new" ===== */

// What each account's exports already saved (post codes / story ids), per
// mode. Writes are chained so two batches can't overwrite each other.
let seenWrites = Promise.resolve();
function rememberSeen(key, ids) {
  if (!key || !ids?.length) return;
  seenWrites = seenWrites
    .then(async () => {
      const old = (await chrome.storage.local.get(key))[key] || [];
      await chrome.storage.local.set({ [key]: [...new Set([...old, ...ids])] });
    })
    .catch(() => {});
}

const MULTI = ["posts", "images", "reels", "stories", "highlights", "saved", "tagged", "archive"];

/* ===== finished jobs: their files, and the history ===== */

// jobId -> { show, open }: a download to reveal in its folder, and (for a chat
// saved as a folder) its index.html to open. Lost if the worker restarts.
const jobFiles = new Map();
function noteFile(jobId, downloadId, filename) {
  if (!jobId) return;
  const f = jobFiles.get(jobId) || {};
  if (f.show == null) f.show = downloadId;
  if (/(^|\/)index\.html$/.test(filename || "")) f.open = downloadId;
  jobFiles.set(jobId, f);
}

// The Export Center lists the last 200 exports.
function addHistory(msg) {
  const files = jobFiles.get(msg.jobId) || {};
  const entry = {
    jobId: msg.jobId,
    kind: String(msg.jobId || "").startsWith("chat_") ? "chat" : "profile",
    filename: msg.filename || "",
    summary: msg.summary || {},
    at: Date.now(),
    show: files.show ?? null,
    open: files.open ?? null,
  };
  chrome.storage.local
    .get("history")
    .then(({ history = [] }) => chrome.storage.local.set({ history: [entry, ...history].slice(0, 200) }))
    .catch(() => {});
}

/* ===== badge ===== */

function setBadge(text, color = "#0095f6") {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
}

function clearBadgeSoon(text, ms = 3500) {
  if (text) setBadge(text, text === "!" ? "#ff5470" : "#34d399");
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), ms);
}

/* ===== messaging ===== */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // From popup: kick off an export — a profile, or a captured chat to archive.
  if (msg?.type === "PROFILE_EXPORT" || msg?.type === "CHAT_EXPORT") {
    const chat = msg.type === "CHAT_EXPORT";
    const jobId = `${chat ? "chat" : "job"}_${Date.now()}_${++jobCounter}`;
    (async () => {
      try {
        await ensureOffscreen();
        const options = msg.options || {};
        const who = String(msg.mode === "saved" ? `you/${options.collection || "all"}` : msg.mode === "archive" ? "you" : msg.username || options.highlightId || "").toLowerCase();
        const seenKey = !chat && MULTI.includes(msg.mode) ? `seen:${who}:${msg.mode}` : null;
        const seen = seenKey && options.onlyNew ? (await chrome.storage.local.get(seenKey))[seenKey] || [] : null;
        chrome.runtime.sendMessage({
          target: "offscreen",
          type: chat ? "RUN_CHAT_EXPORT" : "RUN_EXPORT",
          job: chat
            ? { jobId, chat: msg.chat, options }
            : { jobId, mode: msg.mode, username: msg.username, options, seenKey, seen },
        });
        setBadge("…");
        sendResponse({ ok: true, jobId });
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || "Could not start export." });
      }
    })();
    return true; // async sendResponse
  }

  // From popup: several chats (ids, or every chat in some folders) into one
  // archive. bridge.js fetches each chat and hands it to the offscreen doc.
  if (msg?.type === "CHATS_EXPORT") {
    const jobId = `chat_${Date.now()}_${++jobCounter}`;
    (async () => {
      try {
        await ensureOffscreen();
        const [tab] = await chrome.tabs.query({ url: "https://www.instagram.com/*", discarded: false });
        if (!tab) throw new Error("Open instagram.com in a tab (logged in), then try again.");
        await chrome.tabs.sendMessage(tab.id, { action: "EXPORT_CHATS", jobId, ids: msg.ids, folders: msg.folders, from: msg.from, to: msg.to, options: msg.options || {} });
        setBadge("…");
        sendResponse({ ok: true, jobId });
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || "Could not start the export." });
      }
    })();
    return true; // async sendResponse
  }

  // From the popup: your saved collections, for its collection list.
  if (msg?.type === "LIST_COLLECTIONS") {
    ensureOffscreen()
      .then(() => chrome.runtime.sendMessage({ target: "offscreen", type: "GET_COLLECTIONS" }))
      .then(sendResponse, (err) => sendResponse({ error: err?.message || "Couldn't load your collections." }));
    return true; // async sendResponse
  }

  // From the picker page: list an account's posts (or highlights), or stop listing.
  if (msg?.type === "LIST_POSTS") {
    const jobId = `list_${Date.now()}`;
    ensureOffscreen()
      .then(() => {
        chrome.runtime.sendMessage({ target: "offscreen", type: "RUN_LIST", jobId, username: msg.username, mode: msg.mode });
        sendResponse({ ok: true, jobId });
      })
      .catch((err) => sendResponse({ ok: false, error: err?.message || "Could not start listing." }));
    return true; // async sendResponse
  }
  if (msg?.type === "LIST_STOP") {
    chrome.runtime.sendMessage({ target: "offscreen", type: "RUN_LIST_STOP", jobId: msg.jobId }).catch(() => {});
    return;
  }

  // From popup: "Check Instagram" runs one request per feature in the offscreen doc.
  if (msg?.type === "RUN_CHECK") {
    const jobId = `check_${Date.now()}`;
    ensureOffscreen()
      .then(() => {
        chrome.runtime.sendMessage({ target: "offscreen", type: "RUN_CHECK", jobId });
        sendResponse({ ok: true, jobId });
      })
      .catch((err) => sendResponse({ ok: false, error: err?.message || "Could not start the check." }));
    return true; // async sendResponse
  }

  // From offscreen: something only the instagram.com tab can do (your story archive's day list).
  if (msg?.type === "IG_TAB" && msg.action === "ARCHIVE_DAYS") {
    (async () => {
      const [tab] = await chrome.tabs.query({ url: "https://www.instagram.com/*", discarded: false });
      if (!tab) return { error: "Open instagram.com in a tab (logged in), then try again." };
      return chrome.tabs.sendMessage(tab.id, { action: "ARCHIVE_DAYS" });
    })().then(sendResponse, (err) => sendResponse({ error: err?.message || "Couldn't reach the instagram.com tab." }));
    return true; // async sendResponse
  }

  // From offscreen: run a GraphQL query in an instagram.com tab.
  if (msg?.type === "IG_GQL") {
    gqlInTab(msg).then(sendResponse, (err) => sendResponse({ error: err?.message || "Couldn't reach the instagram.com tab." }));
    return true; // async sendResponse
  }

  // From offscreen (folder mode): save one file straight into Downloads/Instagram/….
  if (msg?.type === "SAVE_TO_FOLDER") {
    overwrite.add(msg.url);
    saveFile(msg.url, msg.filename, (downloadId) => {
      if (chrome.runtime.lastError || downloadId == null) {
        overwrite.delete(msg.url);
        return sendResponse({ ok: false });
      }
      // Answer once the file is fully written, so a stopped export never
      // counts a half-saved file as done.
      noteFile(msg.jobId, downloadId, msg.filename);
      pendingDownloads.set(downloadId, { url: msg.url, done: sendResponse });
    }, false);
    return true; // async sendResponse
  }

  // From offscreen (folder mode): items saved so far, for "only new" / resume.
  if (msg?.type === "REMEMBER") {
    rememberSeen(msg.key, msg.ids);
    return;
  }

  // From offscreen (folder mode): every file handed to Chrome.
  if (msg?.type === "EXPORT_DONE") {
    clearBadgeSoon("✓");
    addHistory(msg);
    return; // popup renders it
  }

  // From the popup's done card: which download to show or open.
  if (msg?.type === "JOB_FILES") {
    sendResponse(jobFiles.get(msg.jobId) || null);
    return;
  }

  // From offscreen: progress tick → badge.
  if (msg?.type === "EXPORT_PROGRESS") {
    if (msg.phase === "downloading" && msg.total) {
      setBadge(`${Math.floor((msg.done / msg.total) * 100)}%`);
    } else if (msg.phase === "zipping" || msg.phase === "resolving") {
      setBadge("…");
    }
    return; // also delivered to the popup, which renders the detail
  }

  // From offscreen: a finished artifact (a blob URL the offscreen doc owns).
  if (msg?.type === "EXPORT_DOWNLOAD_URL") {
    setBadge("…");
    saveFile(msg.url, msg.filename, (downloadId) => {
      if (chrome.runtime.lastError || downloadId == null) {
        const reason = chrome.runtime.lastError?.message || "Download failed.";
        chrome.runtime.sendMessage({ target: "offscreen", type: "REVOKE", url: msg.url }).catch(() => {});
        clearBadgeSoon("!");
        chrome.runtime.sendMessage({ type: "EXPORT_ERROR", jobId: msg.jobId, error: /canceled/i.test(reason) ? "Download canceled." : reason }).catch(() => {});
        return;
      }
      pendingDownloads.set(downloadId, { url: msg.url, jobId: msg.jobId });
      if (msg.remember) rememberSeen(msg.remember.key, msg.remember.ids);
      noteFile(msg.jobId, downloadId, msg.filename);
      clearBadgeSoon("✓");
      const done = { type: "EXPORT_DONE", jobId: msg.jobId, filename: msg.filename, summary: msg.summary || {} };
      addHistory(done);
      chrome.runtime.sendMessage(done).catch(() => {});
    });
    return;
  }

  // From offscreen: a failure.
  if (msg?.type === "EXPORT_ERROR") {
    clearBadgeSoon("!");
    return; // popup renders the message
  }
});

// Revoke the blob URL once Chrome has finished reading it.
chrome.downloads.onChanged.addListener((delta) => {
  if (!delta.state) return;
  const entry = pendingDownloads.get(delta.id);
  if (!entry) return;
  if (delta.state.current === "complete" || delta.state.current === "interrupted") {
    chrome.runtime.sendMessage({ target: "offscreen", type: "REVOKE", url: entry.url }).catch(() => {});
    entry.done?.({ ok: delta.state.current === "complete" });
    pendingDownloads.delete(delta.id);
  }
});
