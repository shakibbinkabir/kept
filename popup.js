const els = {
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
  statusSub: document.getElementById("statusSub"),
  threadName: document.getElementById("threadName"),
  msgCount: document.getElementById("msgCount"),
  progress: document.getElementById("progress"),
  captureBtn: document.getElementById("captureBtn"),
  captureLabel: document.getElementById("captureLabel"),
  autoScrollBtn: document.getElementById("autoScrollBtn"),
  autoScrollLabel: document.getElementById("autoScrollLabel"),
  exportBtn: document.getElementById("exportBtn"),
  optMedia: document.getElementById("optMedia"),
  optEncoding: document.getElementById("optEncoding"),
  optChatFolder: document.getElementById("optChatFolder"),
  saveOpts: document.getElementById("saveOpts"),
  optFolder: document.getElementById("optFolder"),
  optOnlyNew: document.getElementById("optOnlyNew"),
  optPattern: document.getElementById("optPattern"),
  chatFrom: document.getElementById("chatFrom"),
  chatTo: document.getElementById("chatTo"),

  // Several chats
  chatSingle: document.getElementById("chatSingle"),
  chatPicker: document.getElementById("chatPicker"),
  pickerOpen: document.getElementById("pickerOpen"),
  pickerBack: document.getElementById("pickerBack"),
  pickerCount: document.getElementById("pickerCount"),
  fInbox: document.getElementById("fInbox"),
  fPending: document.getElementById("fPending"),
  selectAll: document.getElementById("selectAll"),
  chatList: document.getElementById("chatList"),
  loadMore: document.getElementById("loadMore"),
  everyChat: document.getElementById("everyChat"),
  exportChatsBtn: document.getElementById("exportChatsBtn"),
  errorCard: document.getElementById("errorCard"),
  errorTitle: document.getElementById("errorTitle"),
  errorBody: document.getElementById("errorBody"),
  errorHint: document.getElementById("errorHint"),
  retryBtn: document.getElementById("retryBtn"),
  copyErrBtn: document.getElementById("copyErrBtn"),
  toast: document.getElementById("toast"),

  // Tabs
  tabChat: document.getElementById("tabChat"),
  tabProfile: document.getElementById("tabProfile"),
  chatPanel: document.getElementById("chatPanel"),
  profilePanel: document.getElementById("profilePanel"),

  // Profile form
  usernameInput: document.getElementById("usernameInput"),
  modeSelect: document.getElementById("modeSelect"),
  filterField: document.getElementById("filterField"),
  filterSelect: document.getElementById("filterSelect"),
  countField: document.getElementById("countField"),
  countFieldLabel: document.getElementById("countFieldLabel"),
  countInput: document.getElementById("countInput"),
  dateField: document.getElementById("dateField"),
  fromInput: document.getElementById("fromInput"),
  toInput: document.getElementById("toInput"),
  profileExportBtn: document.getElementById("profileExportBtn"),
  profileHint: document.getElementById("profileHint"),
  profileStatus: document.getElementById("profileStatus"),
  pStatusDot: document.getElementById("pStatusDot"),
  pStatusText: document.getElementById("pStatusText"),
  pStatusSub: document.getElementById("pStatusSub"),
  pCount: document.getElementById("pCount"),
  pCountLabel: document.getElementById("pCountLabel"),
  pProgress: document.getElementById("pProgress"),

  // Report + "Check Instagram"
  errReportBtn: document.getElementById("errReportBtn"),
  checkBtn: document.getElementById("checkBtn"),
  reportBtn: document.getElementById("reportBtn"),
  checkCard: document.getElementById("checkCard"),
  checkSummary: document.getElementById("checkSummary"),
  checkList: document.getElementById("checkList"),
  checkReportBtn: document.getElementById("checkReportBtn"),
  checkCloseBtn: document.getElementById("checkCloseBtn"),

  // 4.0: what's open, done card, first run, Export Center
  tabs: document.querySelector(".tabs"),
  contextText: document.getElementById("contextText"),
  contextIcon: document.getElementById("contextIcon"),
  reached: document.getElementById("reached"),
  centerBtn: document.getElementById("centerBtn"),
  doneCard: document.getElementById("doneCard"),
  doneTitle: document.getElementById("doneTitle"),
  doneBody: document.getElementById("doneBody"),
  showFileBtn: document.getElementById("showFileBtn"),
  openChatBtn: document.getElementById("openChatBtn"),
  doneCloseBtn: document.getElementById("doneCloseBtn"),
  welcome: document.getElementById("welcome"),
  welcomeBtn: document.getElementById("welcomeBtn"),
  pickBtn: document.getElementById("pickBtn"),
  optBestVideo: document.getElementById("optBestVideo"),
  optJpg: document.getElementById("optJpg"),
  optComments: document.getElementById("optComments"),
  optEvidence: document.getElementById("optEvidence"),
  optChatEvidence: document.getElementById("optChatEvidence"),
  usernameField: document.getElementById("usernameField"),
  collectionField: document.getElementById("collectionField"),
  collectionSelect: document.getElementById("collectionSelect"),
};

const REPO = "https://github.com/shakibbinkabir/kept";

const state = {
  tabId: null,
  tabUrl: "",
  isInstagram: false,
  count: 0,
  threadTitle: "",
  autoScrolling: false,
  capturing: false,
  lastError: null,
  phase: "idle", // idle | capturing | scrolling | exporting | success | error
  errorContext: "chat", // chat | profile — which flow owns the shared error card
  profile: {
    jobId: null,
    running: false,
    detectedUsername: "",
    detectedShortcode: "",
    detectedHighlightId: "",
    lastJob: null,
  },
};

const HINTS = {
  auth: "Open instagram.com and log in, then try again.",
  rate: "Instagram is throttling requests. Wait a minute and retry.",
  no_thread: "Open a DM conversation at instagram.com/direct/t/...",
  no_messages: "Click Start Capture, then scroll up inside the thread to load history.",
  validation: "The data Instagram returned didn't match the expected shape. Try refreshing the page and capturing again.",
  download: "Chrome blocked the download. Check your download settings or try again.",
  bridge: "Press F5 on the Instagram tab, then reopen this popup.",
  range: "Clear the From / To dates, or pick a wider range.",
  unknown: "Try refreshing the Instagram tab, then reopen this popup.",
};

function setPhase(phase, label, sub) {
  state.phase = phase;
  els.statusDot.dataset.state =
    phase === "capturing" || phase === "exporting" ? "capturing"
    : phase === "scrolling" ? "scrolling"
    : phase === "success" ? "success"
    : phase === "error" ? "error"
    : "idle";

  els.statusText.firstChild.textContent = label || tr("statusWaiting", "Waiting");
  els.statusSub.textContent = sub ? ` · ${sub}` : "";

  if (phase === "capturing" || phase === "scrolling" || phase === "exporting") {
    els.progress.classList.add("active");
  } else {
    els.progress.classList.remove("active");
  }
}

function renderButtons() {
  // Capture toggle
  if (state.capturing) {
    els.captureLabel.textContent = tr("stopCapture", "Stop capture");
    els.captureBtn.classList.remove("btn-primary");
    els.captureBtn.classList.add("btn-danger");
  } else {
    els.captureLabel.textContent = tr("startCapture", "Start capture");
    els.captureBtn.classList.add("btn-primary");
    els.captureBtn.classList.remove("btn-danger");
  }
  els.captureBtn.disabled = !state.isInstagram;

  // Auto-scroll requires capture to be on
  els.autoScrollBtn.disabled = !state.capturing;
  els.autoScrollLabel.textContent = state.autoScrolling ? tr("stopScroll", "Stop scroll") : tr("autoScroll", "Auto-scroll");
  els.autoScrollBtn.classList.toggle("active", state.autoScrolling);

  // Export available whenever we have data (even after stopping)
  if (state.count > 0 && state.phase !== "exporting") {
    els.exportBtn.disabled = false;
    els.exportBtn.classList.remove("btn-secondary");
    els.exportBtn.classList.add("btn-primary");
  } else if (state.phase !== "exporting") {
    els.exportBtn.disabled = true;
    els.exportBtn.classList.add("btn-secondary");
    els.exportBtn.classList.remove("btn-primary");
  }
}

function animateCount(from, to) {
  if (from === to) return;
  const duration = 280;
  const start = performance.now();
  els.msgCount.classList.add("bumping");
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    els.msgCount.textContent = value;
    if (t < 1) requestAnimationFrame(tick);
    else {
      els.msgCount.textContent = to;
      setTimeout(() => els.msgCount.classList.remove("bumping"), 200);
    }
  }
  requestAnimationFrame(tick);
}

function updateCount(newCount) {
  const old = state.count;
  state.count = newCount;
  animateCount(old, newCount);
  if (!state.threadTitle) updateThread(null);
  renderButtons();
}

function showReached(oldest) {
  els.reached.textContent = oldest ? tr("backTo", "Back to $1", new Date(oldest).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })) : "";
}

function updateThread(title) {
  if (title) {
    if (title !== state.threadTitle) {
      state.threadTitle = title;
      els.threadName.textContent = title;
      if (state.context === "chat") setContext("chat", tr("ctxChatWith", "Chat with $1", title));
    }
    return;
  }
  if (state.count > 0) {
    els.threadName.textContent = "Active thread";
  } else {
    els.threadName.textContent = state.capturing ? tr("waitingMessages", "Waiting for messages…") : tr("notCapturing", "Not capturing");
  }
}

function classifyError(msg, problems) {
  const m = (msg || "").toLowerCase();
  if (m.includes("bridge") || m.includes("refresh")) return "bridge";
  if (m.includes("logged in") || m.includes("authoriz")) return "auth";
  if (m.includes("rate-limit") || m.includes("429")) return "rate";
  if (m.includes("no messages")) return "no_messages";
  if (m.includes("validation") || (problems && problems.length)) return "validation";
  if (m.includes("download")) return "download";
  if (m.includes("date range")) return "range";
  if (m.includes("conversation")) return "no_thread";
  return "unknown";
}

function showError(title, body, problems) {
  state.errorContext = "chat";
  state.lastError = { title, body, problems };
  els.retryBtn.textContent = tr("retry", "Retry");
  setPhase("error", "Error", "");
  els.errorTitle.textContent = title || "Something went wrong";
  els.errorBody.textContent = body + (problems?.length ? `\n• ${problems.slice(0, 3).join("\n• ")}` : "");
  els.errorHint.textContent = HINTS[classifyError(body, problems)] || "";
  els.errorCard.hidden = false;
  renderButtons();
  if (state.count > 0) {
    els.exportBtn.textContent = "Retry export";
  }
}

function clearError() {
  state.lastError = null;
  els.errorCard.hidden = true;
}

function showToast(msg, ms = 1600) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), ms);
}

function applyCaptureState(on) {
  state.capturing = on;
  if (on) {
    setPhase("capturing", tr("capturing", "Capturing"), state.count > 0 ? tr("soFar", "$1 so far", state.count) : tr("scrollUp", "scroll up to load"));
  } else {
    if (state.count > 0) {
      setPhase("idle", "Stopped", `${state.count} captured`);
    } else {
      setPhase("idle", "Idle", "click Start to begin");
    }
  }
  updateThread(state.threadTitle || null);
  renderButtons();
}

/* ===== Countdowns (Instagram asked us to slow down) ===== */
const countdowns = {};
function startCountdown(key, until, render) {
  clearInterval(countdowns[key]);
  const tick = () => {
    const secs = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    render(secs);
    if (!secs) stopCountdown(key);
  };
  tick();
  countdowns[key] = setInterval(tick, 500);
}
function stopCountdown(key) {
  clearInterval(countdowns[key]);
  delete countdowns[key];
}

/* ===== Report a problem ===== */
// Opens a prefilled GitHub issue the user reviews before posting. Usernames
// are replaced so a report never says whose account was being exported.
function redact(text) {
  return String(text ?? "").replace(/@[\w.]+/g, "@<user>");
}

function openIssue(title, details) {
  const browser = (navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1];
  const body = [
    "**What happened?**",
    "<!-- What you clicked and what you expected. A screenshot helps. -->",
    "",
    "",
    "**Details** (added by Kept, usernames removed)",
    "```",
    `Version: ${chrome.runtime.getManifest().version}`,
    browser ? `Browser: Chromium ${browser}` : null,
    ...details.map(redact),
    "```",
  ].filter((line) => line !== null).join("\n");
  chrome.tabs.create({
    url: `${REPO}/issues/new?title=${encodeURIComponent(redact(title))}&body=${encodeURIComponent(body)}`,
  });
}

function errorDetails() {
  const e = state.lastError;
  if (!e) return [];
  const chat = state.errorContext === "chat";
  return [
    chat ? `Area: chat (${state.phase}, ${state.count} captured)` : `Area: profile (${state.profile.lastJob?.mode || els.modeSelect.value})`,
    `Error: ${e.title}: ${e.body}`,
    ...(e.problems || []).slice(0, 5).map((p) => `  - ${p}`),
  ];
}

function sendToTab(message, callback) {
  if (!state.tabId) return;
  chrome.tabs.sendMessage(state.tabId, message, (resp) => {
    if (chrome.runtime.lastError) {
      // Always invoke the callback so the popup can react (with null) instead
      // of waiting forever. This happens when the content script in the tab is
      // stale (after the extension was reloaded but the IG tab wasn't).
      callback?.(null);
      return;
    }
    callback?.(resp);
  });
}

/* ===== Profile media export ===== */

// Reserved first path segments that are never usernames.
const IG_RESERVED = new Set([
  "explore", "reels", "reel", "p", "tv", "direct", "stories", "accounts",
  "about", "legal", "developer", "api", "graphql", "your_activity",
  "settings", "emails", "challenge", "privacy",
]);

function parseIgUrl(url) {
  const result = { username: "", shortcode: "", highlightId: "", story: false };
  if (!url) return result;
  let u;
  try { u = new URL(url); } catch { return result; }
  if (!/(^|\.)instagram\.com$/.test(u.hostname)) return result;

  const segs = u.pathname.split("/").filter(Boolean);

  // /stories/highlights/{id}/  → a specific highlight (no username in URL)
  if (segs[0] === "stories" && segs[1] === "highlights" && segs[2]) {
    result.highlightId = segs[2];
    return result;
  }
  // /stories/{username}/...  → the active story viewer
  if (segs[0] === "stories" && segs[1] && segs[1] !== "highlights") {
    result.username = segs[1];
    result.story = true;
    return result;
  }

  // /p/{code}/, /reel/{code}/, /tv/{code}/, /reels/{code}/ (the Reels feed),
  // optionally prefixed with /{username}/.
  const postIdx = segs.findIndex((s) => s === "p" || s === "reel" || s === "reels" || s === "tv");
  if (postIdx !== -1 && segs[postIdx + 1]) {
    result.shortcode = segs[postIdx + 1];
    if (postIdx > 0 && !IG_RESERVED.has(segs[0])) result.username = segs[0];
    return result;
  }
  if (segs.length >= 1 && !IG_RESERVED.has(segs[0])) result.username = segs[0];
  return result;
}

function switchTab(panelId) {
  const onProfile = panelId === "profilePanel";
  state.activeTab = onProfile ? "profile" : "chat";
  els.chatPanel.hidden = onProfile;
  els.profilePanel.hidden = !onProfile;
  els.tabChat.classList.toggle("active", !onProfile);
  els.tabProfile.classList.toggle("active", onProfile);
  els.tabChat.setAttribute("aria-selected", String(!onProfile));
  els.tabProfile.setAttribute("aria-selected", String(onProfile));
  els.tabs.dataset.active = onProfile ? "profile" : "chat";
}

/* ===== What's open in this tab, and its one main action ===== */
function setContext(icon, text) {
  els.contextIcon.setAttribute("href", `icons/ui.svg#${icon}`);
  els.contextText.textContent = text;
}

// Reads the tab's address, names what's open and picks the tab that exports it.
function detectContext(url) {
  const { username, shortcode, highlightId, story } = parseIgUrl(url);
  let path = "";
  try { path = new URL(url).pathname; } catch {}
  if (!state.isInstagram) {
    state.context = "none";
    setContext("search", tr("ctxOpenIG", "Open instagram.com to start"));
    return;
  }
  if (path.startsWith("/direct/t/")) {
    state.context = "chat";
    setContext("chat", tr("ctxChatOpen", "A chat is open"));
    switchTab("chatPanel");
  } else if (path.startsWith("/direct")) {
    state.context = "inbox";
    setContext("inbox", tr("ctxInbox", "Your inbox: open a chat, or export several"));
    switchTab("chatPanel");
  } else if (path.startsWith("/archive/stories")) {
    state.context = "archive";
    setContext("story", tr("ctxArchive", "Your story archive"));
    els.modeSelect.value = "archive";
    switchTab("profilePanel");
    refreshProfileFields();
  } else if (/^\/[^/]+\/tagged\/?$/.test(path) && username) {
    state.context = "tagged";
    setContext("profile", tr("ctxTagged", "Posts @$1 is tagged in", username));
    els.modeSelect.value = "tagged";
    switchTab("profilePanel");
    refreshProfileFields();
  } else if (/^\/[^/]+\/saved(\/|$)/.test(path)) {
    state.context = "saved";
    setContext("download", tr("ctxSaved", "Your saved posts"));
    els.modeSelect.value = "saved";
    state.wantCollection = (path.match(/^\/[^/]+\/saved\/[^/]+\/(\d+)\/?$/) || [])[1] || "all";
    switchTab("profilePanel");
    refreshProfileFields();
  } else if (shortcode) {
    state.context = "post";
    setContext("image", username ? tr("ctxPostBy", "A post by @$1", username) : tr("ctxPost", "A post or reel"));
    switchTab("profilePanel");
  } else if (highlightId) {
    state.context = "highlight";
    setContext("highlight", tr("ctxHighlight", "A story highlight"));
    switchTab("profilePanel");
  } else if (story) {
    state.context = "story";
    setContext("story", tr("ctxStories", "@$1's stories", username));
    switchTab("profilePanel");
  } else if (username) {
    state.context = "profile";
    setContext("profile", tr("ctxProfile", "@$1's profile", username));
    switchTab("profilePanel");
  } else {
    state.context = "home";
    setContext("search", tr("ctxHome", "Open a chat or a profile to export it"));
  }
}

// The Profiles tab's button says exactly what it will do.
function updateMainAction() {
  if (state.profile.running) return;
  const mode = els.modeSelect.value;
  const who = els.usernameInput.value.trim().replace(/^@/, "");
  // [key with an account, its English, key without one, its English]
  const named = {
    posts: ["actPostsOf", "Export @$1's posts", "actPosts", "Export posts"],
    images: ["actImagesOf", "Export @$1's images", "actImages", "Export images"],
    reels: ["actReelsOf", "Export @$1's reels", "actReels", "Export reels"],
    stories: ["actStoriesOf", "Save @$1's stories", "actStories", "Save stories"],
    highlights: ["actHighlightsOf", "Export @$1's highlights", "actHighlights", "Export highlights"],
    profilePic: ["actPicOf", "Save @$1's profile picture", "actPic", "Save profile picture"],
    tagged: ["actTaggedOf", "Export posts @$1 is tagged in", "actTagged", "Export tagged posts"],
    audience: ["actAudienceOf", "Export @$1's followers and following", "actAudience", "Export followers and following"],
  }[mode];
  const collection = els.collectionSelect.value;
  const label = mode === "highlights" && state.profile.detectedHighlightId ? tr("actThisHighlight", "Export this highlight")
    : named ? (who ? tr(named[0], named[1], who) : tr(named[2], named[3]))
    : {
        post: tr("actPost", "Export this post"),
        myaudience: tr("actMyAudience", "Export your followers and following"),
        archive: tr("actArchive", "Export your archived stories"),
        saved: collection === "all" ? tr("actSavedAll", "Export your saved posts") : collection === "every" ? tr("actSavedEvery", "Export every collection") : tr("actSavedOne", "Export “$1”", els.collectionSelect.selectedOptions[0]?.textContent || "collection"),
      }[mode];
  els.profileExportBtn.textContent = label || tr("export", "Export");
}

function updateProfileHint() {
  const mode = els.modeSelect.value;
  if (mode === "post") {
    els.profileHint.textContent = state.profile.detectedShortcode
      ? `Will export the open post (${state.profile.detectedShortcode}).`
      : "Open a post or reel on instagram.com first.";
  } else if (mode === "profilePic") {
    els.profileHint.textContent = "Downloads the full-resolution profile picture.";
  } else if (mode === "stories") {
    els.profileHint.textContent = "Downloads all currently-active (24h) stories.";
  } else if (mode === "highlights") {
    els.profileHint.textContent = state.profile.detectedHighlightId
      ? "Open highlight detected — exporting just this one."
      : "Exports all of this account's story highlights.";
  } else {
    els.profileHint.textContent = state.profile.detectedUsername
      ? ""
      : "Tip: open a profile to auto-fill the username.";
  }
}

function refreshProfileFields() {
  const mode = els.modeSelect.value;
  const isFeed = ["posts", "images", "reels", "saved", "tagged", "archive", "highlights"].includes(mode) && !(mode === "highlights" && state.profile.detectedHighlightId);
  els.usernameField.hidden = mode === "saved" || mode === "archive" || mode === "myaudience";
  els.collectionField.hidden = mode !== "saved";
  if (mode === "saved") loadCollections();
  const filter = els.filterSelect.value;
  els.filterField.hidden = !isFeed;
  els.saveOpts.hidden = mode === "post" || mode === "profilePic";
  els.pickBtn.hidden = !["posts", "images", "reels", "highlights"].includes(mode) || !!state.profile.detectedHighlightId;
  els.countField.hidden = !(isFeed && (filter === "recent" || filter === "oldest"));
  els.dateField.hidden = !(isFeed && filter === "range");
  if (filter === "recent") els.countFieldLabel.textContent = "How many (most recent)";
  else if (filter === "oldest") els.countFieldLabel.textContent = "How many (oldest)";
  updateProfileHint();
  updateMainAction();
}

function initProfile(url) {
  const { username, shortcode, highlightId, story } = parseIgUrl(url);
  state.profile.detectedUsername = username;
  state.profile.detectedShortcode = shortcode;
  state.profile.detectedHighlightId = highlightId || "";
  if (username) els.usernameInput.value = username;
  if (shortcode) els.modeSelect.value = "post";
  else if (highlightId) els.modeSelect.value = "highlights";
  else if (story) els.modeSelect.value = "stories";
  refreshProfileFields();
}

function setProfilePhase(phase, label, sub) {
  els.profileStatus.hidden = false;
  els.pStatusDot.dataset.state =
    phase === "running" ? "capturing"
    : phase === "success" ? "success"
    : phase === "error" ? "error"
    : "idle";
  els.pStatusText.firstChild.textContent = label || tr("ready", "Ready");
  els.pStatusSub.textContent = sub ? ` · ${sub}` : "";
}

function setProfileProgress({ indeterminate, pct }) {
  if (indeterminate) {
    els.pProgress.classList.add("active");
    els.pProgress.classList.remove("determinate");
    els.pProgress.style.removeProperty("--p");
  } else {
    els.pProgress.classList.remove("active");
    els.pProgress.classList.add("determinate");
    els.pProgress.style.setProperty("--p", String(pct));
  }
}

function profileHintFor(body) {
  const m = (body || "").toLowerCase();
  if (m.includes("private")) return "You can only export from public accounts or ones you follow.";
  if (m.includes("logged in") || m.includes("authoriz")) return "Open instagram.com and log in, then try again.";
  if (m.includes("rate") || m.includes("429")) return "Instagram is throttling requests. Wait a minute and retry.";
  if (m.includes("no such user") || m.includes("not found")) return "Check the username spelling.";
  if (m.includes("no posts") || m.includes("no images") || m.includes("no reels") || m.includes("no saved")) return "Try a different range or mode.";
  if (m.includes("nothing new")) return "Untick “Only what I haven't downloaded yet” to download everything again.";
  if (m.includes("post") && m.includes("open")) return "Open a post/reel page first, or pick a different mode.";
  return "";
}

function showProfileError(title, body) {
  state.errorContext = "profile";
  state.lastError = { title, body, problems: null };
  els.errorTitle.textContent = title || tr("exportFailed", "Export failed");
  els.errorBody.textContent = body || "";
  els.errorHint.textContent = profileHintFor(body);
  els.errorCard.hidden = false;
  // A folder export keeps what it saved, so it can pick up where it stopped.
  els.retryBtn.textContent = state.profile.lastJob?.options?.folder && !/nothing new/i.test(body) ? tr("resume", "Resume") : tr("retry", "Retry");
  setProfilePhase("error", "Error", "");
  els.pProgress.classList.remove("active");
  els.profileExportBtn.disabled = false;
  state.profile.running = false;
  updateMainAction();
}

function summaryLabel(s) {
  if (!s) return "complete";
  const count = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const fail = (s.failed ? `, ${s.failed} failed` : "") + (s.skipped ? `, ${s.skipped} already saved` : "") + (s.fingerprint ? ` · fingerprint ${s.fingerprint.slice(0, 12)}…` : "");
  if (s.followers != null) return `${count(s.followers, "follower")}, ${s.following} following` + (s.newFollowers != null ? ` · ${s.newFollowers} new, ${s.unfollowers} unfollowed, ${s.notBack} not following back` : "");
  if (s.posts != null) return count(s.posts, "post") + fail;
  if (s.reels != null) return count(s.reels, "reel") + fail;
  if (s.stories != null) return count(s.stories, "story", "stories") + fail;
  if (s.highlights != null) return `${count(s.highlights, "highlight")}, ${count(s.files, "file")}${fail}`;
  if (s.files != null) return count(s.files, "file") + fail;
  if (s.profilePic) return "profile picture";
  return "complete";
}

// Your saved collections, loaded once for the "Which saved posts" list.
let collectionsLoaded = false;
function loadCollections() {
  if (collectionsLoaded) return;
  collectionsLoaded = true;
  chrome.runtime.sendMessage({ type: "LIST_COLLECTIONS" }, (resp) => {
    if (chrome.runtime.lastError || !resp?.collections) {
      collectionsLoaded = false;
      return;
    }
    for (const c of resp.collections.filter((c) => !c.auto)) {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.count != null ? `${c.name} (${c.count})` : c.name;
      els.collectionSelect.append(o);
    }
    if (state.wantCollection && [...els.collectionSelect.options].some((o) => o.value === state.wantCollection)) els.collectionSelect.value = state.wantCollection;
    updateMainAction();
  });
}

function buildJobFromForm() {
  const mode = els.modeSelect.value;
  const username = els.usernameInput.value.trim().replace(/^@/, "");
  const options = {};

  if (mode === "post") {
    if (!state.profile.detectedShortcode) {
      showProfileError("No post open", "Open an Instagram post or reel in the active tab, then try again.");
      return null;
    }
    options.shortcode = state.profile.detectedShortcode;
  } else if (mode === "saved") {
    options.collection = els.collectionSelect.value;
  } else if (mode === "archive" || mode === "myaudience") {
    // your own account: no username
  } else if (!username && !(mode === "highlights" && state.profile.detectedHighlightId)) {
    showProfileError("Username required", "Enter the @username you want to export.");
    return null;
  }

  if (!els.filterField.hidden) {
    const ftype = els.filterSelect.value;
    const filter = { type: ftype };
    if (ftype === "recent" || ftype === "oldest") {
      const n = parseInt(els.countInput.value, 10);
      if (!Number.isFinite(n) || n < 1) {
        showProfileError("Invalid count", "Enter how many posts to export (1 or more).");
        return null;
      }
      filter.n = n;
    } else if (ftype === "range") {
      filter.fromDate = els.fromInput.value || null;
      filter.toDate = els.toInput.value || null;
      if (!filter.fromDate && !filter.toDate) {
        showProfileError("No dates", "Pick a From and/or To date for the range.");
        return null;
      }
    }
    options.filter = filter;
  }

  if (mode === "highlights" && state.profile.detectedHighlightId) {
    options.highlightId = state.profile.detectedHighlightId;
  }

  if (!els.saveOpts.hidden) {
    options.folder = els.optFolder.checked;
    options.onlyNew = els.optOnlyNew.checked;
    options.pattern = els.optPattern.value.trim();
    options.bestVideo = els.optBestVideo.checked;
    options.jpg = els.optJpg.checked;
    options.comments = els.optComments.checked;
    options.evidence = els.optEvidence.checked;
  }

  return { mode, username, options };
}

function startProfileExport(job) {
  clearError();
  hideDone();
  state.profile.lastJob = job;
  state.profile.dlStart = 0;
  state.profile.running = true;
  state.profile.jobId = null;
  els.profileExportBtn.disabled = true;
  els.profileExportBtn.textContent = tr("exporting", "Exporting…");
  setProfilePhase("running", "Starting", "");
  setProfileProgress({ indeterminate: true });
  els.pCount.textContent = "0";
  els.pCountLabel.textContent = "starting";

  chrome.runtime.sendMessage(
    { type: "PROFILE_EXPORT", mode: job.mode, username: job.username, options: job.options },
    (resp) => {
      if (chrome.runtime.lastError || !resp || resp.ok === false) {
        showProfileError(
          "Couldn't start export",
          (resp && resp.error) || chrome.runtime.lastError?.message || "The background worker didn't respond."
        );
        return;
      }
      state.profile.jobId = resp.jobId;
    }
  );
}

function handleProfileMessage(msg) {
  if (!msg) return;
  // Ignore messages from a different job once ours is known.
  if (state.profile.jobId && msg.jobId && msg.jobId !== state.profile.jobId) return;

  if (msg.type !== "EXPORT_PROGRESS" || msg.phase !== "waiting") stopCountdown("profile");

  if (msg.type === "EXPORT_PROGRESS") {
    state.profile.running = true;
    if (msg.phase === "waiting") {
      if (msg.until > Date.now()) {
        setProfileProgress({ indeterminate: true });
        startCountdown("profile", msg.until, (secs) =>
          setProfilePhase("running", "Waiting", secs ? `${secs}s · Instagram asked us to slow down` : "resuming")
        );
      }
      return;
    }
    if (msg.phase === "resolving") {
      setProfilePhase("running", "Resolving", msg.message || "");
      setProfileProgress({ indeterminate: true });
      els.pCount.textContent = "…";
      els.pCountLabel.textContent = "profile";
    } else if (msg.phase === "enumerating") {
      setProfilePhase("running", "Scanning", "finding posts");
      setProfileProgress({ indeterminate: true });
      els.pCount.textContent = msg.done ?? 0;
      els.pCountLabel.textContent = "found";
    } else if (msg.phase === "downloading") {
      const pct = msg.total ? Math.floor((msg.done / msg.total) * 100) : 0;
      if (!state.profile.dlStart || !msg.done) state.profile.dlStart = Date.now();
      setProfilePhase("running", "Downloading", `${msg.done}/${msg.total}${timeLeft(state.profile.dlStart, msg.done, msg.total)}`);
      setProfileProgress({ indeterminate: false, pct });
      els.pCount.textContent = `${pct}%`;
      els.pCountLabel.textContent = "downloaded";
    } else if (msg.phase === "zipping") {
      setProfilePhase("running", "Packaging", "building ZIP");
      setProfileProgress({ indeterminate: true });
      els.pCount.textContent = "…";
      els.pCountLabel.textContent = "zipping";
    }
    return;
  }

  if (msg.type === "EXPORT_DONE") {
    state.profile.running = false;
    clearError();
    setProfilePhase("success", tr("done", "Done"), msg.filename || "");
    setProfileProgress({ indeterminate: false, pct: 100 });
    els.pCount.textContent = "✓";
    els.pCountLabel.textContent = summaryLabel(msg.summary);
    els.profileExportBtn.disabled = false;
    updateMainAction();
    showDone(tr("saved", "Saved"), `${summaryLabel(msg.summary)}\n${msg.filename || ""}`, msg.jobId);
    return;
  }

  if (msg.type === "EXPORT_ERROR") {
    showProfileError(tr("exportFailed", "Export failed"), msg.error || "Something went wrong.");
  }
}

/* ===== Time left, and the done card ===== */
function timeLeft(start, done, total) {
  if (!start || done < 3 || done >= total) return "";
  const secs = ((Date.now() - start) / done) * (total - done) / 1000;
  if (secs < 45) return " · a few seconds left";
  const mins = Math.round(secs / 60);
  return ` · about ${mins} min left`;
}

function hideDone() {
  els.doneCard.hidden = true;
}

// Shows what was saved, with "Show in folder" (and "Open chat" for a chat
// saved as a folder) once the background says which download it was.
function showDone(title, body, jobId) {
  els.doneTitle.textContent = title;
  els.doneBody.textContent = body.trim();
  els.showFileBtn.hidden = true;
  els.openChatBtn.hidden = true;
  els.doneCard.hidden = false;
  chrome.runtime.sendMessage({ type: "JOB_FILES", jobId }, (files) => {
    if (chrome.runtime.lastError || !files) return;
    if (files.show != null) {
      els.showFileBtn.hidden = false;
      els.showFileBtn.onclick = () => chrome.downloads.show(files.show);
    }
    if (files.open != null) {
      els.openChatBtn.hidden = false;
      els.openChatBtn.onclick = () => chrome.downloads.open(files.open);
    }
  });
}

/* ===== Chat archive progress ===== */
// The optional From/To dates, as ms (To covers the whole day).
function chatRange() {
  const day = (v, end) => (v ? new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}`).getTime() : null);
  return { from: day(els.chatFrom.value, false), to: day(els.chatTo.value, true) };
}

function handleChatJob(msg) {
  if (msg.type === "EXPORT_PROGRESS") {
    if (msg.phase === "chats") setPhase("exporting", "Loading chats", msg.message || `${msg.done} chats`);
    else if (msg.phase === "downloading") setPhase("exporting", "Saving media", `${msg.done}/${msg.total}`);
    else if (msg.phase === "zipping") setPhase("exporting", "Packaging", "building ZIP");
    return;
  }
  els.exportBtn.textContent = "Export chat";
  if (msg.type === "EXPORT_DONE") {
    const s = msg.summary || {};
    const saved = (s.media || 0) - (s.failed || 0);
    const media = s.media ? `, ${saved} media file${saved === 1 ? "" : "s"}${s.failed ? ` (${s.failed} failed)` : ""}` : "";
    const chats = s.chats > 1 ? `${s.chats} chats, ` : "";
    setPhase("success", "Exported", `${chats}${s.messages} messages${media}`);
    renderButtons();
    showDone(tr("chatSaved", "Chat saved"), `${chats}${s.messages} messages${media}${s.fingerprint ? `\nFingerprint ${s.fingerprint}` : ""}\n${msg.filename || ""}`, msg.jobId);
  } else if (msg.type === "EXPORT_ERROR") {
    showError(tr("exportFailed", "Export failed"), msg.error || "Couldn't build the chat export.");
  }
}

/* ===== Several chats ===== */
const picker = { chats: new Map(), selected: new Set(), cursors: {}, loading: false };
const FOLDERS = () => [els.fInbox.checked && "INBOX", els.fPending.checked && "PENDING"].filter(Boolean);

function renderPicker() {
  els.chatList.textContent = "";
  if (picker.loading && !picker.chats.size) {
    for (let i = 0; i < 5; i++) {
      const li = document.createElement("li");
      li.className = "skeleton";
      li.setAttribute("aria-hidden", "true");
      els.chatList.append(li);
    }
  }
  for (const c of picker.chats.values()) {
    if (!FOLDERS().includes(c.folder)) continue;
    const li = document.createElement("li");
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = picker.selected.has(c.id);
    box.onchange = () => {
      box.checked ? picker.selected.add(c.id) : picker.selected.delete(c.id);
      renderPickerCount();
    };
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = c.title + (c.folder === "PENDING" ? " · request" : "");
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = c.last ? new Date(c.last).toLocaleDateString() : "";
    label.append(box, name, when);
    li.append(label);
    els.chatList.append(li);
  }
  const more = FOLDERS().some((f) => picker.cursors[f] !== null);
  els.loadMore.hidden = !more;
  els.loadMore.disabled = picker.loading;
  els.loadMore.textContent = picker.loading ? "Loading…" : "Load more";
  renderPickerCount();
}

function renderPickerCount() {
  const visible = [...picker.chats.values()].filter((c) => FOLDERS().includes(c.folder));
  const chosen = visible.filter((c) => picker.selected.has(c.id)).length;
  els.selectAll.checked = !!visible.length && chosen === visible.length;
  els.pickerCount.textContent = els.everyChat.checked ? tr("everyChatLower", "every chat") : tr("nSelected", "$1 selected", chosen);
  const n = els.everyChat.checked ? "every" : chosen;
  els.exportChatsBtn.textContent = els.everyChat.checked ? tr("exportEveryChat", "Export every chat") : n === 1 ? tr("exportOneChat", "Export 1 chat") : tr("exportNChats", "Export $1 chats", n);
  els.exportChatsBtn.disabled = !FOLDERS().length || (!els.everyChat.checked && !chosen);
}

// Load the next page of each chosen folder (bridge.js runs the query).
async function loadChats() {
  if (picker.loading) return;
  picker.loading = true;
  renderPicker();
  for (const folder of FOLDERS()) {
    if (picker.cursors[folder] === null) continue; // that folder is done
    const page = await new Promise((resolve) => sendToTab({ action: "LIST_CHATS", folder, cursor: picker.cursors[folder] }, resolve));
    if (!page || page.error) {
      showError("Couldn't list chats", page?.error || "The Instagram tab didn't answer. Refresh it and try again.");
      break;
    }
    for (const c of page.chats) picker.chats.set(c.id, c);
    picker.cursors[folder] = page.cursor;
  }
  picker.loading = false;
  renderPicker();
}

function openPicker(open) {
  if (open && !state.isInstagram) {
    showError("Open instagram.com", "Open instagram.com in this tab to pick chats.");
    return;
  }
  els.chatPicker.hidden = !open;
  els.chatSingle.hidden = open;
  els.pickerOpen.hidden = open;
  if (open && !picker.chats.size) loadChats();
}

function exportChats() {
  const folders = FOLDERS();
  const ids = els.everyChat.checked ? undefined : [...picker.selected].filter((id) => folders.includes(picker.chats.get(id)?.folder));
  const options = { media: els.optMedia.checked, instagramEncoding: els.optEncoding.checked, folder: els.optChatFolder.checked, evidence: els.optChatEvidence.checked };
  clearError();
  openPicker(false);
  els.exportBtn.disabled = true;
  setPhase("exporting", tr("exportingShort", "Exporting"), "finding chats");
  els.threadName.textContent = ids ? `${ids.length} chats` : "Every chat";
  chrome.runtime.sendMessage({ type: "CHATS_EXPORT", ids, folders, ...chatRange(), options }, (resp) => {
    if (chrome.runtime.lastError || !resp?.ok) {
      showError(tr("exportFailed", "Export failed"), resp?.error || chrome.runtime.lastError?.message || "The background worker didn't respond.");
    }
  });
}

/* ===== "Check Instagram" ===== */
// One request per feature, run by the offscreen doc against a public account;
// chats are checked in the open conversation, if there is one.
const CHECK_STEPS = [
  ["search", "Find accounts"],
  ["posts", "Posts"],
  ["post", "Single posts"],
  ["reels", "Reels"],
  ["stories", "Stories"],
  ["highlights", "Highlights"],
  ["dm", "Chats"],
];
const check = { jobId: null, running: false, rows: new Map(), idSources: null };

function checkBusy() {
  return check.running || check.rows.get("dm")?.state === "running";
}

function renderCheck() {
  els.checkList.textContent = "";
  for (const [key] of CHECK_STEPS) {
    const row = check.rows.get(key);
    if (!row) continue;
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "status-dot";
    dot.dataset.state = row.state;
    const text = document.createElement("span");
    text.textContent = row.label;
    if (row.detail) {
      const detail = document.createElement("span");
      detail.className = "check-detail";
      detail.textContent = row.detail;
      text.appendChild(detail);
    }
    li.append(dot, text);
    els.checkList.appendChild(li);
  }
  if (!countdowns.check) {
    const failed = [...check.rows.values()].filter((r) => r.state === "fail").length;
    els.checkSummary.textContent = checkBusy() ? "checking…" : failed ? `${failed} not working` : "everything works";
  }
  els.checkBtn.disabled = checkBusy();
}

function startCheck() {
  if (checkBusy()) return;
  check.running = true;
  check.jobId = null;
  check.idSources = null;
  check.rows = new Map(CHECK_STEPS.slice(0, -1).map(([key, label]) => [key, { label, state: "idle" }]));
  els.checkCard.hidden = false;

  if (/instagram\.com\/direct\/t\//.test(state.tabUrl)) {
    check.rows.set("dm", { label: "Chats", state: "running" });
    sendToTab({ action: "CHECK_DM" }, (r) => {
      check.rows.set("dm", {
        label: "Chats",
        state: r?.ok ? "ok" : "fail",
        detail: r?.detail || "The Instagram tab didn't answer. Refresh it and try again.",
      });
      renderCheck();
    });
  } else {
    check.rows.set("dm", { label: "Chats", state: "idle", detail: "Open a chat on instagram.com to include chats" });
  }
  renderCheck();

  chrome.runtime.sendMessage({ type: "RUN_CHECK" }, (resp) => {
    if (chrome.runtime.lastError || !resp?.ok) {
      check.running = false;
      check.rows.set("search", {
        label: "Find accounts",
        state: "fail",
        detail: resp?.error || chrome.runtime.lastError?.message || "The background worker didn't respond.",
      });
      renderCheck();
      return;
    }
    check.jobId = resp.jobId;
  });
}

function handleCheckMessage(msg) {
  if (!check.running || (check.jobId && msg.jobId !== check.jobId)) return;
  if ("waiting" in msg) {
    if (msg.waiting > Date.now()) {
      startCountdown("check", msg.waiting, (secs) => {
        els.checkSummary.textContent = secs ? `waiting ${secs}s` : "checking…";
      });
    } else {
      stopCountdown("check");
    }
  } else if (msg.type === "CHECK_PROGRESS") {
    check.rows.set(msg.key, { label: msg.label, state: msg.state, detail: msg.detail });
  } else if (msg.type === "CHECK_DONE") {
    check.running = false;
    check.idSources = msg.idSources || {};
    stopCountdown("check");
  }
  renderCheck();
}

function checkDetails() {
  if (!check.rows.size) return [];
  const mark = { ok: "✓", fail: "✗", running: "…", idle: "–" };
  const lines = ["Instagram check:"];
  for (const [key] of CHECK_STEPS) {
    const row = check.rows.get(key);
    if (row) lines.push(`  ${mark[row.state] || "–"} ${row.label}${row.detail ? ` — ${row.detail}` : ""}`);
  }
  if (check.idSources) {
    const sources = Object.values(check.idSources);
    const fromPage = sources.filter((s) => s === "page").length;
    lines.push(`Query ids: ${fromPage} read from the page, ${sources.length - fromPage} built-in`);
  }
  return lines;
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".version").textContent = `v${chrome.runtime.getManifest().version}`;

  // Firefox treats site access as optional: ask for it if it's missing.
  const origins = chrome.runtime.getManifest().host_permissions || [];
  chrome.permissions?.contains({ origins }).then((ok) => {
    if (ok) return;
    const card = document.getElementById("accessCard");
    card.hidden = false;
    document.getElementById("accessBtn").addEventListener("click", () =>
      chrome.permissions.request({ origins }).then((granted) => granted && location.reload())
    );
  }).catch(() => {});

  // Theme from the Export Center (system by default), and the first-run welcome.
  chrome.storage.local.get(["theme", "welcomed"]).then(({ theme, welcomed }) => {
    if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
    if (!welcomed) els.welcome.hidden = false;
  }).catch(() => {});
  els.welcomeBtn.addEventListener("click", () => {
    els.welcome.hidden = true;
    chrome.storage.local.set({ welcomed: true }).catch(() => {});
  });
  els.centerBtn.addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("center.html") }));
  els.doneCloseBtn.addEventListener("click", hideDone);
  els.pickBtn.addEventListener("click", () => {
    const user = els.usernameInput.value.trim().replace(/^@/, "");
    if (!user) return showProfileError("Username required", "Enter the @username whose posts you want to choose from.");
    chrome.tabs.create({ url: chrome.runtime.getURL(`pick.html?user=${encodeURIComponent(user)}&mode=${els.modeSelect.value}`) });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;
    state.tabId = tab.id;
    state.tabUrl = tab.url || "";
    state.isInstagram = !!tab.url?.includes("instagram.com");

    // Profile tab works regardless of the active tab; autodetect runs first.
    initProfile(tab.url);
    detectContext(tab.url);

    if (!state.isInstagram) {
      setPhase("idle", "Not Instagram", "");
      els.threadName.textContent = "Open instagram.com to start";
      renderButtons();
      return;
    }

    // Paint defaults up front so the UI never sits at the raw HTML state
    // (e.g. when the content script in the tab is stale and never replies).
    applyCaptureState(false);

    sendToTab({ action: "GET_STATUS" }, (resp) => {
      if (!resp) {
        showError(
          "Bridge not responding",
          "The Instagram tab needs to be refreshed (the extension was reloaded after the page was open)."
        );
        return;
      }
      if (resp.threadTitle) updateThread(resp.threadTitle);
      if (resp.messageCount > 0) state.count = resp.messageCount;
      showReached(resp.oldest);
      state.autoScrolling = !!resp.autoScrolling;
      applyCaptureState(!!resp.capturing);
      if (state.count > 0) els.msgCount.textContent = state.count;
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "IG_EXPORTER_UPDATED") {
      if (message.threadTitle) updateThread(message.threadTitle);
      updateCount(message.messageCount);
      showReached(message.oldest);
      if (state.capturing && state.phase !== "scrolling") {
        setPhase("capturing", tr("capturing", "Capturing"), `${message.messageCount}`);
        clearError();
      }
    }

    if (message.type === "IG_EXPORTER_CAPTURE_STATE") {
      applyCaptureState(message.capturing);
    }

    if (message.type === "IG_EXPORTER_AUTOSCROLL_STATE") {
      state.autoScrolling = message.scrolling;
      if (message.scrolling) {
        setPhase("scrolling", tr("autoScrolling", "Auto-scrolling"), tr("loadingHistory", "loading history"));
      } else if (state.phase === "scrolling") {
        applyCaptureState(state.capturing);
      }
      renderButtons();
    }

    if (message.type === "IG_EXPORTER_WAIT") {
      if (message.until > Date.now()) {
        startCountdown("chat", message.until, (secs) =>
          setPhase(state.autoScrolling ? "scrolling" : "capturing", "Waiting", secs ? `${secs}s · Instagram asked us to slow down` : "resuming")
        );
      } else {
        stopCountdown("chat");
        if (state.autoScrolling) setPhase("scrolling", tr("autoScrolling", "Auto-scrolling"), tr("loadingHistory", "loading history"));
        else applyCaptureState(state.capturing);
      }
    }

    if (message.type === "IG_EXPORTER_ERROR") {
      stopCountdown("chat");
      showError(state.phase === "exporting" ? tr("exportFailed", "Export failed") : "Capture failed", message.error, message.problems);
    }

    // The chat is captured and validated: the offscreen doc downloads its
    // media and builds the ZIP; progress comes back as EXPORT_* messages.
    if (message.type === "IG_EXPORTER_SUCCESS") {
      const options = { media: els.optMedia.checked, instagramEncoding: els.optEncoding.checked, folder: els.optChatFolder.checked, evidence: els.optChatEvidence.checked };
      setPhase("exporting", tr("exportingShort", "Exporting"), options.media ? "saving media" : "packaging");
      chrome.runtime.sendMessage({ type: "CHAT_EXPORT", chat: message.result, options }, (resp) => {
        if (chrome.runtime.lastError || !resp?.ok) {
          showError(tr("exportFailed", "Export failed"), resp?.error || chrome.runtime.lastError?.message || "The background worker didn't respond.");
        }
      });
    }
  });

  // Chat export options, remembered between popups.
  chrome.storage.local
    .get("chatOptions")
    .then(({ chatOptions }) => {
      if (!chatOptions) return;
      els.optMedia.checked = chatOptions.media !== false;
      els.optEncoding.checked = !!chatOptions.instagramEncoding;
    })
    .catch(() => {});
  const saveChatOptions = () =>
    chrome.storage.local
      .set({ chatOptions: { media: els.optMedia.checked, instagramEncoding: els.optEncoding.checked } })
      .catch(() => {});
  els.optMedia.addEventListener("change", saveChatOptions);
  els.optEncoding.addEventListener("change", saveChatOptions);

  // Saving options (folder / only new / file names), remembered too. The
  // folder choice is shared by the Chat and Profile tabs.
  const showPattern = () => (els.optPattern.placeholder = els.optFolder.checked ? "{date}_{code}" : "{index}_{date}_{code}");
  chrome.storage.local
    .get("saveOptions")
    .then(({ saveOptions: o }) => {
      if (!o) return;
      els.optFolder.checked = els.optChatFolder.checked = !!o.folder;
      els.optOnlyNew.checked = !!o.onlyNew;
      els.optPattern.value = o.pattern || "";
      els.optBestVideo.checked = o.bestVideo !== false;
      els.optJpg.checked = !!o.jpg;
      els.optComments.checked = !!o.comments;
      els.optEvidence.checked = els.optChatEvidence.checked = !!o.evidence;
      showPattern();
    })
    .catch(() => {});
  const saveSaveOptions = (e) => {
    if (e?.target === els.optChatFolder) els.optFolder.checked = els.optChatFolder.checked;
    els.optChatFolder.checked = els.optFolder.checked;
    if (e?.target === els.optChatEvidence) els.optEvidence.checked = els.optChatEvidence.checked;
    els.optChatEvidence.checked = els.optEvidence.checked;
    showPattern();
    chrome.storage.local
      .get("saveOptions")
      .then(({ saveOptions: old = {} }) => chrome.storage.local.set({ saveOptions: { ...old, folder: els.optFolder.checked, onlyNew: els.optOnlyNew.checked, pattern: els.optPattern.value.trim(), bestVideo: els.optBestVideo.checked, jpg: els.optJpg.checked, comments: els.optComments.checked, evidence: els.optEvidence.checked } }))
      .catch(() => {});
  };
  for (const el of [els.optFolder, els.optChatFolder, els.optOnlyNew, els.optBestVideo, els.optJpg, els.optComments, els.optEvidence, els.optChatEvidence]) el.addEventListener("change", saveSaveOptions);
  els.optPattern.addEventListener("change", saveSaveOptions);

  // A live example of the file names the pattern gives.
  import("./src/names.js").then(({ fileBase }) => {
    const preview = document.getElementById("patternPreview");
    const show = () => {
      const name = fileBase(els.optPattern.value, { folder: els.optFolder.checked, username: els.usernameInput.value.trim() || "username", takenAt: Math.floor(Date.now() / 1000), code: "DfH-Y3JugI4", index: 1 });
      preview.textContent = `Example: ${name}${els.modeSelect.value === "posts" || els.modeSelect.value === "images" ? "/01.jpg" : els.modeSelect.value === "reels" ? ".mp4" : ".jpg"}`;
    };
    for (const el of [els.optPattern, els.usernameInput]) el.addEventListener("input", show);
    for (const el of [els.optFolder, els.modeSelect]) el.addEventListener("change", show);
    chrome.storage.local.get("saveOptions").then(show, show);
  });

  // Several chats
  els.pickerOpen.addEventListener("click", () => openPicker(true));
  els.pickerBack.addEventListener("click", () => openPicker(false));
  els.loadMore.addEventListener("click", loadChats);
  els.exportChatsBtn.addEventListener("click", exportChats);
  els.everyChat.addEventListener("change", renderPickerCount);
  for (const box of [els.fInbox, els.fPending]) {
    box.addEventListener("change", () => (picker.chats.size && FOLDERS().some((f) => !(f in picker.cursors)) ? loadChats() : renderPicker()));
  }
  els.selectAll.addEventListener("change", () => {
    for (const c of picker.chats.values()) {
      if (!FOLDERS().includes(c.folder)) continue;
      els.selectAll.checked ? picker.selected.add(c.id) : picker.selected.delete(c.id);
    }
    renderPicker();
  });

  /* ===== Buttons ===== */
  els.captureBtn.addEventListener("click", () => {
    clearError();
    if (state.capturing) {
      sendToTab({ action: "CAPTURE_STOP" });
    } else {
      sendToTab({ action: "CAPTURE_START" });
    }
  });

  els.exportBtn.addEventListener("click", () => {
    if (state.count === 0) return;
    clearError();
    hideDone();
    els.exportBtn.disabled = true;
    els.exportBtn.textContent = "Validating…";
    setPhase("exporting", tr("exportingShort", "Exporting"), "validating");
    sendToTab({ action: "EXPORT_REQUEST", ...chatRange() });
  });

  els.autoScrollBtn.addEventListener("click", () => {
    if (state.autoScrolling) {
      sendToTab({ action: "AUTOSCROLL_STOP" });
    } else {
      clearError();
      sendToTab({ action: "AUTOSCROLL_START" }, (resp) => {
        if (resp && resp.ok === false) {
          showError("Can't auto-scroll", resp.reason || "No scrollable thread container found.");
        }
      });
    }
  });

  els.retryBtn.addEventListener("click", () => {
    if (state.errorContext === "profile") {
      clearError();
      const job = state.profile.lastJob;
      if (job?.options?.folder) job.options = { ...job.options, onlyNew: true }; // resume
      if (job) startProfileExport(job);
      return;
    }
    clearError();
    if (state.count > 0) {
      els.exportBtn.click();
    } else {
      sendToTab({ action: "GET_STATUS" }, (resp) => {
        if (resp?.messageCount > 0) updateCount(resp.messageCount);
        applyCaptureState(!!resp?.capturing);
      });
    }
  });

  els.copyErrBtn.addEventListener("click", async () => {
    if (!state.lastError) return;
    const chat = state.errorContext === "chat";
    const payload = [
      `Kept v${chrome.runtime.getManifest().version} — ${chat ? "chat" : "profile"} error report`,
      chat ? `Phase: ${state.phase}` : `Mode: ${state.profile.lastJob?.mode || els.modeSelect.value}`,
      chat ? `Captured: ${state.count}` : null,
      chat ? `Capturing: ${state.capturing}` : null,
      `Title: ${state.lastError.title}`,
      `Body: ${state.lastError.body}`,
      state.lastError.problems?.length ? `Problems:\n${state.lastError.problems.map(p => "  - " + p).join("\n")}` : null,
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed");
    }
  });

  /* ===== Profile tab wiring ===== */
  els.tabChat.addEventListener("click", () => switchTab("chatPanel"));
  els.tabProfile.addEventListener("click", () => switchTab("profilePanel"));

  els.modeSelect.addEventListener("change", refreshProfileFields);
  els.collectionSelect.addEventListener("change", updateMainAction);
  els.filterSelect.addEventListener("change", refreshProfileFields);
  els.usernameInput.addEventListener("input", () => {
    state.profile.detectedUsername = els.usernameInput.value.trim();
    updateProfileHint();
    updateMainAction();
  });

  els.profileExportBtn.addEventListener("click", () => {
    if (state.profile.running) return;
    const job = buildJobFromForm();
    if (job) startProfileExport(job);
  });

  // Progress / completion / error from the offscreen worker (relayed broadcast).
  chrome.runtime.onMessage.addListener((message) => {
    if (
      message?.type === "EXPORT_PROGRESS" ||
      message?.type === "EXPORT_DONE" ||
      message?.type === "EXPORT_ERROR"
    ) {
      // Chat archives and profile exports share the offscreen pipeline.
      if (String(message.jobId || "").startsWith("chat_")) handleChatJob(message);
      else handleProfileMessage(message);
    }
    if (message?.type === "CHECK_PROGRESS" || message?.type === "CHECK_DONE") {
      handleCheckMessage(message);
    }
  });

  /* ===== Check Instagram + Report a problem ===== */
  els.checkBtn.addEventListener("click", startCheck);
  els.checkCloseBtn.addEventListener("click", () => {
    els.checkCard.hidden = true;
  });
  els.checkReportBtn.addEventListener("click", () => {
    const broken = [...check.rows.values()].filter((r) => r.state === "fail").map((r) => r.label);
    openIssue(broken.length ? `Not working: ${broken.join(", ")}` : "Instagram check", checkDetails());
  });
  els.errReportBtn.addEventListener("click", () => {
    const e = state.lastError;
    openIssue(e ? `${e.title}: ${e.body}`.slice(0, 120) : "Problem report", [...errorDetails(), ...checkDetails()]);
  });
  els.reportBtn.addEventListener("click", () => {
    openIssue("Something isn't working", [`Open tab: ${state.activeTab || "chat"}`, ...errorDetails(), ...checkDetails()]);
  });
});
