// src/bridge.js
//
// Content script on instagram.com. Drives the DM export UI (Start Capture /
// Auto-scroll / Export) by actively fetching the open thread through the same
// persisted GraphQL queries Instagram's own web client runs.
//
// Why active fetch instead of interception: Instagram loads DM history off the
// page's main thread, so a page-world window.fetch / XMLHttpRequest hook (the
// original approach in interceptor.js) never saw the responses — the popup
// counted zero forever. The direct_v2 REST endpoints this script used after
// that (/api/v1/direct_v2/inbox/ and threads/<id>/) are gone from the web:
// they answer 404 now.
//
// These queries are NOT public and Instagram rotates their ids every few
// weeks. src/pageids.js reads the current ids from the page itself, and the
// last ones seen are kept in extension storage; the ids below are only the
// fallback. The profile exporter (offscreen.js) runs its queries through this
// script too (see IG_GQL), because /api/graphql only answers instagram.com.
//
// The UI is unchanged: Start Capture loads the most recent page and lets the
// count grow as you scroll up (each scroll pulls the next older page); Auto-
// scroll keeps pulling older pages on its own until the thread runs out or you
// stop. Export packages whatever has been loaded — so you still control how
// much gets exported by how far you scroll.

(function () {
  const srcURL = chrome.runtime.getURL("src/");
  const APP_ID = "936619743392459"; // Instagram Web app id (see src/igapi.js)
  const PAGE = 20; // messages per fetch — the server caps a page at 20
  const DOC_THREAD = { name: "IGDInboxHeaderOffMsysQuery", id: "28914252884904227" }; // title + participants
  const DOC_MESSAGES = { name: "IGDMessageListOffMsysQuery", id: "28574971342201921" }; // paged history
  const PAGE_VAR = "__relay_internal__pv__IGDInitialMessagePageCountrelayprovider";

  // Export helpers load lazily on the first export so a slow/blocked module
  // import can never delay capture or status replies.
  let exportLib = null;
  async function getExportLib() {
    if (!exportLib) {
      const [{ normalize }, { validate }] = await Promise.all([
        import(srcURL + "normalizer.js"),
        import(srcURL + "schema.js"),
      ]);
      exportLib = { normalize, validate };
    }
    return exportLib;
  }

  /* ===== state ===== */
  const store = {
    urlId: null, // thread key from /direct/t/<id>/ — the queries take it as-is
    threadInfo: null, // { thread_id, thread_title, users, viewer_fbid }
    items: new Map(), // message_id -> raw SlideMessage node
    cursor: null, // pagination cursor for the next older page
    hasOlder: true, // is there more history to fetch?
    loadedFirst: false, // has the newest page been fetched yet?
  };

  let capturing = false;
  let fetching = false; // a page request is in flight

  const autoScroll = {
    active: false,
    timer: null,
    container: null,
    stallTicks: 0,
    lastCount: -1,
  };

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function getUrlId() {
    const m = window.location.pathname.match(/\/direct\/t\/([^\/]+)/);
    return m ? m[1] : null;
  }

  /* ===== GraphQL client ===== */
  // /api/graphql only answers with the session's fb_dtsg CSRF token, which
  // Instagram embeds in every page's HTML. Fetched once per page load.
  let dtsg = null;
  async function getDtsg() {
    if (dtsg) return dtsg;
    let html;
    try {
      const res = await fetch("/direct/inbox/", { credentials: "include", signal: AbortSignal.timeout(20000) });
      html = await res.text();
    } catch {
      throw new Error("Network request failed.");
    }
    dtsg = html.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/)?.[1] || null;
    asyncToken = html.match(/"async_get_token":"([^"]+)"/)?.[1] || null;
    // The viewer's messaging id doubles as the id of their mailbox (chat list).
    mailboxId = html.match(/"IG_USER_EIMU":"(\d+)"/)?.[1] || mailboxId;
    if (!dtsg) throw new Error("Not authorized — make sure you're logged in to Instagram in this browser.");
    return dtsg;
  }
  let mailboxId = null;
  let asyncToken = null; // the page's token for Instagram's GET endpoints

  // Your story archive: one entry per day, newest first ({ id: "archiveDay:…", timestamp, count }).
  async function archiveDays() {
    await getDtsg();
    if (!asyncToken) throw new Error("Couldn't read Instagram's page token. Refresh the instagram.com tab and try again.");
    const days = [];
    let maxId = "";
    for (;;) {
      await pace();
      const res = await fetch(`/api/v1/archive/reel/day_shells/?__a=1&fb_dtsg_ag=${encodeURIComponent(asyncToken)}${maxId ? `&max_id=${encodeURIComponent(maxId)}` : ""}`, {
        credentials: "include",
        headers: { "x-ig-app-id": APP_ID, "x-requested-with": "XMLHttpRequest" },
        signal: AbortSignal.timeout(20000),
      });
      if (res.status === 429) throw failure("Instagram is rate-limiting requests (429). Wait a few minutes and retry.", 429);
      let body;
      try {
        body = JSON.parse((await res.text()).replace(/^for \(;;\);/, ""));
      } catch {
        throw failure("Instagram returned a non-JSON response.", res.status);
      }
      if (!body.payload) throw failure(body.errorSummary || "Instagram didn't return your story archive.", res.status);
      for (const d of body.payload.items || []) days.push({ id: d.id, timestamp: d.timestamp, count: d.media_count });
      if (!body.payload.more_available || !body.payload.max_id) break;
      maxId = body.payload.max_id;
    }
    return days;
  }

  function failure(message, status = 0, tryOtherId = false) {
    return Object.assign(new Error(message), { status, tryOtherId });
  }

  /* ===== query ids ===== */
  // name -> { id, provided } as last read from the page by src/pageids.js.
  const pageIds = new Map();
  const wanted = new Set([DOC_THREAD.name, DOC_MESSAGES.name]); // names to ask the page for
  const asked = new Set(); // names already asked for since this page loaded
  const lastSource = new Map(); // name -> "page" | "built-in", for the popup's check
  let lastRefresh = 0;
  const idsLoaded = chrome.storage.local
    .get("queryIds")
    .then(({ queryIds }) => {
      for (const [name, v] of Object.entries(queryIds || {})) {
        pageIds.set(name, v);
        wanted.add(name);
      }
    })
    .catch(() => {});

  function askPage(names) {
    return new Promise((resolve) => {
      const nonce = Math.random().toString(36).slice(2);
      const done = (ids) => {
        window.removeEventListener("message", onReply);
        resolve(ids);
      };
      const onReply = (e) => {
        if (e.source === window && e.data?.igxIds === "ids" && e.data.nonce === nonce) done(e.data.ids || {});
      };
      window.addEventListener("message", onReply);
      window.postMessage({ igxIds: "ask", nonce, names }, "*");
      setTimeout(() => done({}), 500);
    });
  }

  // Read current ids from the page: at most once a minute, or right away the
  // first time a query name is used on this page.
  async function refreshIds(name) {
    await idsLoaded;
    const isNew = name && !asked.has(name);
    if (name) wanted.add(name);
    if (!isNew && Date.now() - lastRefresh < 60000) return;
    lastRefresh = Date.now();
    for (const n of wanted) asked.add(n);

    const found = await askPage([...wanted]);
    let changed = false;
    for (const [n, v] of Object.entries(found)) {
      if (!wanted.has(n) || !/^\d{6,25}$/.test(v?.id || "")) continue;
      const entry = { id: v.id, provided: v.provided || {} };
      if (JSON.stringify(pageIds.get(n)) === JSON.stringify(entry)) continue;
      pageIds.set(n, entry);
      changed = true;
    }
    if (changed) chrome.storage.local.set({ queryIds: Object.fromEntries(pageIds) }).catch(() => {});
  }
  setTimeout(() => refreshIds(), 3000);

  /* ===== pacing ===== */
  // Every Instagram request from this tab waits its turn, a little under a
  // second apart, so capture and export never hammer the API.
  // ponytail: one global pace per tab; per-endpoint budgets if Instagram ever needs them.
  const PACE_MS = 800;
  const WAITS_429 = [30, 60, 120]; // seconds to back off when Instagram says "slow down"
  let paceChain = Promise.resolve();
  let lastRequestAt = 0;
  function pace() {
    const turn = paceChain.then(async () => {
      const wait = lastRequestAt + PACE_MS + Math.random() * 400 - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
    });
    paceChain = turn.catch(() => {});
    return turn;
  }

  // Back off with a visible countdown in the popup.
  async function waitFor(seconds) {
    const until = Date.now() + seconds * 1000;
    chrome.runtime.sendMessage({ type: "IG_EXPORTER_WAIT", until }).catch(() => {});
    await sleep(seconds * 1000);
    chrome.runtime.sendMessage({ type: "IG_EXPORTER_WAIT", until: 0 }).catch(() => {});
  }

  /* ===== requests ===== */
  // One persisted query with a given id. 429s back off (when `waitOn429`) and
  // 5xx/network errors retry briefly; an expired token is refetched once.
  async function run(docId, variables, waitOn429) {
    let retries = 0;
    let throttled = 0;
    let freshToken = false;
    for (;;) {
      await pace();
      const body = new URLSearchParams({
        fb_dtsg: await getDtsg(),
        doc_id: docId,
        variables: JSON.stringify(variables),
      });
      let res;
      try {
        res = await fetch("/api/graphql", {
          method: "POST",
          credentials: "include",
          // A stalled request would otherwise hang capture forever.
          signal: AbortSignal.timeout(20000),
          headers: { "x-ig-app-id": APP_ID },
          body,
        });
      } catch {
        if (++retries > 3) throw failure("Network request failed.");
        await sleep(1000 * retries);
        continue;
      }
      if (res.status === 429) {
        if (!waitOn429 || throttled >= WAITS_429.length) {
          throw failure("Instagram is rate-limiting requests (429). Wait a few minutes and retry.", 429);
        }
        await waitFor(WAITS_429[throttled++]);
        continue;
      }
      if (res.status >= 500) {
        if (++retries > 3) throw failure(`Instagram server error (${res.status}).`, res.status);
        await sleep(2000 * retries);
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        throw failure("Not authorized — make sure you're logged in to Instagram in this browser.", res.status);
      }
      if (!res.ok) throw failure(`Unexpected response (${res.status}).`, res.status, true);
      let json;
      try {
        json = await res.json();
      } catch {
        // A rejected (expired) token gets the HTML app shell back: refetch it once.
        dtsg = null;
        if (!freshToken) {
          freshToken = true;
          continue;
        }
        throw failure("Instagram returned a non-JSON response.", 0, true);
      }
      if (!json.data) {
        throw failure(`Instagram GraphQL error: ${json.errors?.[0]?.message || "no data"}`, 0, true);
      }
      return json.data;
    }
  }

  // Run a query ({ name, id }) with the id the page currently uses, falling
  // back to the built-in id if Instagram rejects it.
  async function gql(query, variables, { waitOn429 = true } = {}) {
    await refreshIds(query.name);
    const page = pageIds.get(query.name);
    if (page && page.id !== query.id) {
      try {
        const data = await run(page.id, igxMergeVariables(variables, page.provided), waitOn429);
        lastSource.set(query.name, "page");
        return data;
      } catch (err) {
        if (!err.tryOtherId) throw err;
      }
    }
    // The page's provided variables belong to the page's id; only reuse them
    // when the built-in id is that same id.
    const same = page?.id === query.id;
    const data = await run(query.id, same ? igxMergeVariables(variables, page.provided) : variables, waitOn429);
    lastSource.set(query.name, same ? "page" : "built-in");
    return data;
  }

  // Approximate count of items that will survive normalization, so the popup's
  // live count tracks the export.
  // The oldest message captured so far (ms), for "back to <date>" in the popup.
  function oldestCaptured() {
    let oldest = Infinity;
    for (const node of store.items.values()) oldest = Math.min(oldest, Number(node.timestamp_ms) || Infinity);
    return oldest === Infinity ? null : oldest;
  }

  function exportableCount() {
    let n = 0;
    let afterEnd = false; // the previous (newer) call notice was an "ended"/"missed" one
    for (const node of store.items.values()) {
      const c = node.content || {};
      if (c.__typename === "SlideMessageAdminText") {
        // System rows are dropped, except call notices. The normalizer folds a
        // call's two notices into one message: the store runs newest first, so
        // a "started" notice right after an "ended"/"missed" one is that fold.
        if (!/CALL/.test(node.content_type || "")) continue;
        const text = (c.text_fragments || []).map((f) => f.plaintext || "").join("");
        const start = /started/i.test(text);
        if (!(start && afterEnd)) n++;
        afterEnd = !start && /ended|missed/i.test(text);
        continue;
      }
      // Placeholders for shares that are no longer available are dropped too,
      // unless they carry text or reactions, which the normalizer keeps.
      const hasText = node.text_body || c.text_body || c.xma_text_body;
      if (/Placeholder/.test(c.xma?.__typename || "") && !hasText && !node.reactions?.length) continue;
      n++;
    }
    return n;
  }

  function titleForPopup() {
    const info = store.threadInfo;
    if (!info) return null;
    if (info.thread_title) return info.thread_title;
    const first = (info.users || [])[0];
    return first ? first.full_name || first.username : null;
  }

  /* ===== fetching ===== */
  // Fetch one page of history into the store: the newest page while there's no
  // cursor yet, the next older one after that.
  async function fetchPage() {
    const urlId = store.urlId;
    const data = await gql(DOC_MESSAGES, { id: urlId, after: store.cursor, [PAGE_VAR]: PAGE });
    if (urlId !== store.urlId) return; // switched threads mid-request — not this thread's page
    const conn = data.fetch__SlideThread?.as_ig_direct_thread?.slide_messages;
    for (const { node } of conn?.edges || []) {
      if (node?.message_id) store.items.set(node.message_id, node);
    }
    store.cursor = conn?.page_info?.end_cursor || null;
    store.hasOlder = !!(conn?.page_info?.has_next_page && store.cursor);
  }

  // Load the thread's metadata and its most recent page. Runs once per capture.
  async function loadNewest() {
    if (store.loadedFirst || fetching) return;
    fetching = true;
    try {
      const urlId = getUrlId();
      if (!urlId) throw new Error("Open a DM conversation (instagram.com/direct/t/...) first.");
      store.urlId = urlId;

      const head = await gql(DOC_THREAD, { thread_fbid: urlId });
      if (urlId !== store.urlId) return; // switched threads mid-request
      const thread = head.get_slide_thread_nullable?.as_ig_direct_thread;
      if (!thread) {
        throw new Error("Couldn't load this conversation. Open it fresh, then try again.");
      }
      store.threadInfo = threadInfoFrom(thread);

      await fetchPage();
      if (urlId !== store.urlId) return;
      store.loadedFirst = true;

      broadcastUpdate();
    } catch (err) {
      capturing = false;
      broadcastCaptureState(false);
      broadcastError(err?.message || String(err));
    } finally {
      fetching = false;
    }
  }

  // Fetch the next older page. Returns true if new messages were added.
  async function loadOlder() {
    if (fetching || !store.loadedFirst || !store.hasOlder) return false;
    if (getUrlId() !== store.urlId) return false; // user switched threads
    fetching = true;
    const before = store.items.size;
    try {
      await fetchPage();
      broadcastUpdate();
      return store.items.size > before;
    } catch (err) {
      broadcastError(err?.message || String(err));
      return false;
    } finally {
      fetching = false;
    }
  }

  /* ===== scroll container (for Auto-scroll's visual feedback) ===== */
  function findScrollContainer() {
    const root =
      document.querySelector('[role="main"]') ||
      document.querySelector("main") ||
      document.body;

    const candidates = [];
    for (const el of root.querySelectorAll("div")) {
      if (el.clientHeight === 0) continue;
      const overflowY = window.getComputedStyle(el).overflowY;
      if (!["auto", "scroll", "overlay"].includes(overflowY)) continue;
      if (el.scrollHeight <= el.clientHeight + 20) continue;
      const score =
        el.clientHeight * 2 +
        (el.scrollHeight - el.clientHeight) +
        Math.min(el.innerHTML.length / 100, 500);
      candidates.push({ el, score });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].el;
  }

  // IG's message list is flex-direction: column-reverse, so scrollTop=0 is the
  // visual BOTTOM (newest). A large negative value clamps to the visual top.
  function scrollToVisualTop(container) {
    container.scrollTop = -container.scrollHeight;
  }

  /* ===== scroll-driven loading (manual) ===== */
  // Loading follows the user's scroll: when capturing and not auto-scrolling,
  // a scroll gesture pulls the next older page. A capture-phase listener on the
  // document catches scroll events from the thread's inner scroller (scroll
  // doesn't bubble, but it does reach capture-phase listeners on ancestors).
  let scrollDebounce = null;
  function onDocumentScroll() {
    if (!capturing || autoScroll.active) return;
    resetIfThreadChanged(); // capture follows the user into another thread
    if (fetching || !store.loadedFirst || !store.hasOlder) return;
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      if (capturing && !autoScroll.active) loadOlder();
    }, 250);
  }
  document.addEventListener("scroll", onDocumentScroll, true);

  /* ===== auto-scroll ===== */
  function announceAutoScroll(scrolling, reason) {
    chrome.runtime
      .sendMessage({ type: "IG_EXPORTER_AUTOSCROLL_STATE", scrolling, reason: reason || "" })
      .catch(() => {});
  }

  function stopAutoScroll(reason) {
    if (!autoScroll.active) return;
    autoScroll.active = false;
    clearTimeout(autoScroll.timer);
    autoScroll.timer = null;
    autoScroll.container = null;
    autoScroll.stallTicks = 0;
    autoScroll.lastCount = -1;
    announceAutoScroll(false, reason);
  }

  function startAutoScroll() {
    if (autoScroll.active) return { ok: true, alreadyRunning: true };
    if (!capturing) return { ok: false, reason: "Start capture first, then auto-scroll." };
    if (!store.hasOlder && store.loadedFirst) {
      return { ok: false, reason: "Already at the beginning of this thread." };
    }
    autoScroll.active = true;
    autoScroll.container = findScrollContainer();
    autoScroll.stallTicks = 0;
    autoScroll.lastCount = store.items.size; // track raw history progress
    announceAutoScroll(true);
    autoTick();
    return { ok: true };
  }

  const TICK_MS = 500;
  const MAX_STALL_TICKS = 6; // ~3s of no progress → give up

  async function autoTick() {
    if (!autoScroll.active) return;

    // Scroll the visible thread for familiar feedback (and to nudge IG's own
    // lazy-rendering); the actual data comes from the fetch below.
    if (autoScroll.container && autoScroll.container.isConnected) {
      scrollToVisualTop(autoScroll.container);
    } else {
      autoScroll.container = findScrollContainer();
    }

    // Wait for Start Capture's first-page resolve to finish before doing any
    // work — don't fetch or count stalls against a thread that isn't ready yet.
    if (!store.loadedFirst || fetching) {
      autoScroll.timer = setTimeout(autoTick, TICK_MS);
      return;
    }

    await loadOlder();

    if (!autoScroll.active) return; // stopped mid-fetch

    if (!store.hasOlder) {
      stopAutoScroll("reached beginning of thread");
      return;
    }

    // Stall detection uses raw item growth (not exportable count): a page of
    // only system rows still advances us through history, so it isn't a stall.
    if (store.items.size > autoScroll.lastCount) {
      autoScroll.lastCount = store.items.size;
      autoScroll.stallTicks = 0;
    } else if (++autoScroll.stallTicks >= MAX_STALL_TICKS) {
      stopAutoScroll("reached beginning of thread");
      return;
    }

    autoScroll.timer = setTimeout(autoTick, TICK_MS);
  }

  /* ===== capture toggle ===== */
  function setCapturing(on) {
    const was = capturing;
    capturing = !!on;
    if (!capturing && autoScroll.active) stopAutoScroll("capture stopped");
    broadcastCaptureState(capturing);
    if (capturing && !was) {
      // Surface the most recent page immediately (mirrors the old behavior of
      // showing whatever was already loaded, instead of a misleading 0).
      loadNewest();
    }
  }

  /* ===== messaging to popup ===== */
  function broadcastUpdate() {
    if (!capturing) return; // only stream while the popup expects updates
    chrome.runtime
      .sendMessage({
        type: "IG_EXPORTER_UPDATED",
        messageCount: exportableCount(),
        threadTitle: titleForPopup(),
        oldest: oldestCaptured(),
      })
      .catch(() => {});
  }

  function broadcastCaptureState(on) {
    chrome.runtime.sendMessage({ type: "IG_EXPORTER_CAPTURE_STATE", capturing: on }).catch(() => {});
  }

  function broadcastError(error, problems) {
    chrome.runtime.sendMessage({ type: "IG_EXPORTER_ERROR", error, problems }).catch(() => {});
  }

  /* ===== export ===== */
  function threadInfoFrom(thread) {
    return {
      thread_id: thread.thread_fbid,
      thread_title: thread.thread_title || null,
      users: (thread.users || []).map((u) => ({
        fbid: u.interop_messaging_user_fbid,
        username: u.username,
        full_name: u.full_name,
      })),
      viewer_fbid: thread.viewer?.interop_messaging_user_fbid || null,
    };
  }

  // Keep only messages inside [from, to] (ms; either may be null).
  function withinRange(chat, from, to) {
    if (from || to) chat.messages = chat.messages.filter((m) => (!from || m.timestamp_ms >= from) && (!to || m.timestamp_ms <= to));
    return chat;
  }

  async function doExport(range = {}) {
    if (store.items.size === 0) {
      broadcastError("No messages captured yet. Start capture, then scroll up to load history.");
      return;
    }
    try {
      const { normalize, validate } = await getExportLib();
      const result = withinRange(normalize(store.threadInfo, [...store.items.values()]), range.from, range.to);
      if (!result.messages.length) {
        broadcastError("No messages in that date range. Change the dates or load more history.");
        return;
      }
      const problems = validate(result);
      if (problems.length > 0) {
        broadcastError("Validation failed", problems);
      } else {
        result._kept = store.threadInfo || null; // usernames and ids, for evidence mode; not written to message_1.json
        chrome.runtime.sendMessage({ type: "IG_EXPORTER_SUCCESS", result }).catch(() => {});
      }
    } catch (err) {
      broadcastError("Couldn't build the export: " + (err?.message || err));
    }
  }

  /* ===== several chats ===== */
  const DOC_THREADS = { name: "IGDThreadListOffMsysPaginationQuery", id: "28804933902495089" }; // chat list, by folder

  // One page of a mailbox folder ("INBOX" or "PENDING" for message requests).
  async function listChats(folder, cursor) {
    await getDtsg(); // also reads the mailbox id
    if (!mailboxId) throw new Error("Couldn't find your chat list. Refresh instagram.com and try again.");
    const data = await gql(DOC_THREADS, { count: 20, cursor: cursor || null, folder, newer_than_timestamp_ms: null, id: mailboxId });
    const conn = data.fetch__SlideMailbox?.threads_by_folder;
    const chats = (conn?.edges || [])
      .map(({ node }) => node?.as_ig_direct_thread)
      .filter((t) => t?.thread_fbid)
      .map((t) => ({
        id: String(t.thread_fbid),
        title: t.thread_title || (t.usersWithoutViewer || t.users || []).map((u) => u.full_name || u.username).filter(Boolean).join(", ") || "Instagram User",
        group: !!t.is_group,
        last: Number(t.last_activity_timestamp_ms) || 0,
        folder,
      }));
    const next = conn?.page_info?.has_next_page ? conn.page_info.end_cursor : null;
    return { chats, cursor: next };
  }

  // A whole conversation, newest page first, stopping once a page reaches
  // back past `from`.
  async function fetchChat(id, from, onCount) {
    const head = await gql(DOC_THREAD, { thread_fbid: id });
    const thread = head.get_slide_thread_nullable?.as_ig_direct_thread;
    if (!thread) throw new Error("Couldn't load one of the conversations.");
    const items = new Map();
    let cursor = null;
    do {
      const data = await gql(DOC_MESSAGES, { id, after: cursor, [PAGE_VAR]: PAGE });
      const conn = data.fetch__SlideThread?.as_ig_direct_thread?.slide_messages;
      let oldest = Infinity;
      for (const { node } of conn?.edges || []) {
        if (!node?.message_id) continue;
        items.set(node.message_id, node);
        oldest = Math.min(oldest, Number(node.timestamp_ms) || Infinity);
      }
      onCount(items.size);
      cursor = conn?.page_info?.has_next_page ? conn.page_info.end_cursor : null;
      if (from && oldest < from) break;
    } while (cursor);
    return { info: threadInfoFrom(thread), nodes: [...items.values()] };
  }

  // Export several chats (ids), or every chat in some folders, into one
  // archive: each finished chat goes straight to the offscreen doc.
  async function exportChats({ jobId, ids, folders, from, to, options }) {
    const progress = (done, total, message) =>
      chrome.runtime.sendMessage({ type: "EXPORT_PROGRESS", jobId, phase: "chats", done, total, message }).catch(() => {});
    try {
      let list = ids || [];
      if (!ids) {
        for (const folder of folders || ["INBOX"]) {
          let cursor = null;
          do {
            const page = await listChats(folder, cursor);
            list.push(...page.chats.map((c) => c.id));
            cursor = page.cursor;
            progress(0, 0, `Finding chats (${list.length})`);
          } while (cursor);
        }
      }
      if (!list.length) throw new Error("No chats to export.");
      const { normalize, validate } = await getExportLib();
      let sent = 0;
      for (let i = 0; i < list.length; i++) {
        const { info, nodes } = await fetchChat(list[i], from, (n) => progress(i, list.length, `Chat ${i + 1} of ${list.length} · ${n} messages`));
        const chat = withinRange(normalize(info, nodes), from, to);
        if (!chat.messages.length || validate(chat).length) continue; // nothing in range, or unreadable
        chat._kept = info;
        await chrome.runtime.sendMessage({ target: "offscreen", type: "CHAT_PART", jobId, chat }).catch(() => {});
        sent++;
      }
      if (!sent) throw new Error("None of those chats have messages in that date range.");
      chrome.runtime.sendMessage({ target: "offscreen", type: "CHAT_PARTS_DONE", jobId, options }).catch(() => {});
    } catch (err) {
      chrome.runtime.sendMessage({ type: "EXPORT_ERROR", jobId, error: err?.message || String(err) }).catch(() => {});
    }
  }

  // When the user switches to a different thread, drop the previous thread's
  // data so a later capture/export can't mix conversations. Capture stays on
  // across the switch, so start over on the new thread — otherwise nothing
  // would load until capture was stopped and started again.
  function resetIfThreadChanged() {
    const urlId = getUrlId();
    if (urlId && urlId !== store.urlId) {
      store.urlId = urlId;
      store.threadInfo = null;
      store.items.clear();
      store.cursor = null;
      store.hasOlder = true;
      store.loadedFirst = false;
      fetching = false; // a request still in flight belongs to the old thread
      if (capturing) loadNewest();
    }
  }

  /* ===== popup commands ===== */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "GET_STATUS") {
      resetIfThreadChanged();
      sendResponse({
        messageCount: exportableCount(),
        threadTitle: titleForPopup(),
        oldest: oldestCaptured(),
        autoScrolling: autoScroll.active,
        capturing,
      });
      return true;
    }

    if (message.action === "CAPTURE_START") {
      resetIfThreadChanged();
      setCapturing(true);
      sendResponse({ ok: true });
      return true;
    }

    if (message.action === "CAPTURE_STOP") {
      setCapturing(false);
      sendResponse({ ok: true });
      return true;
    }

    if (message.action === "AUTOSCROLL_START") {
      sendResponse(startAutoScroll());
      return true;
    }

    if (message.action === "AUTOSCROLL_STOP") {
      stopAutoScroll("manual");
      sendResponse({ ok: true });
      return true;
    }

    if (message.action === "EXPORT_REQUEST") {
      doExport({ from: message.from, to: message.to });
      return;
    }

    // The popup's chat picker: one page of a folder.
    if (message.action === "VIEWER") {
      sendResponse({ id: document.cookie.match(/(?:^|; )ds_user_id=(\d+)/)?.[1] || null });
      return;
    }

    if (message.action === "ARCHIVE_DAYS") {
      archiveDays().then((days) => sendResponse({ days }), (err) => sendResponse({ error: err.message, status: err.status || 0 }));
      return true;
    }

    if (message.action === "LIST_CHATS") {
      listChats(message.folder, message.cursor).then(sendResponse, (err) => sendResponse({ error: err?.message || String(err) }));
      return true;
    }

    // From the service worker: export several chats into one archive.
    if (message.action === "EXPORT_CHATS") {
      exportChats(message);
      sendResponse({ ok: true });
      return true;
    }

    // Profile export (offscreen.js) runs its GraphQL queries here, because
    // /api/graphql only answers requests from instagram.com itself. A 429 goes
    // straight back so the exporter can show its own countdown and retry.
    if (message.action === "IG_GQL") {
      const { query, variables } = message;
      gql(query, variables, { waitOn429: false }).then(
        (data) => sendResponse({ data, source: lastSource.get(query.name) }),
        (err) => sendResponse({ error: err?.message || String(err), status: err?.status || 0 })
      );
      return true;
    }

    // The popup's "Check Instagram": load the open chat's header and newest page.
    if (message.action === "CHECK_DM") {
      (async () => {
        const urlId = getUrlId();
        if (!urlId) return { ok: false, detail: "Open a chat on instagram.com to include chats" };
        const head = await gql(DOC_THREAD, { thread_fbid: urlId });
        if (!head.get_slide_thread_nullable?.as_ig_direct_thread) throw new Error("Couldn't load this conversation.");
        const page = await gql(DOC_MESSAGES, { id: urlId, after: null, [PAGE_VAR]: PAGE });
        const n = page.fetch__SlideThread?.as_ig_direct_thread?.slide_messages?.edges?.length || 0;
        if (!n) throw new Error("Instagram returned no messages.");
        const sources = [DOC_THREAD, DOC_MESSAGES].map((q) => lastSource.get(q.name));
        return { ok: true, detail: `${n} recent messages loaded`, sources };
      })().then(sendResponse, (err) => sendResponse({ ok: false, detail: err?.message || String(err) }));
      return true;
    }
  });

  window.addEventListener("beforeunload", () => stopAutoScroll("page unload"));
})();
