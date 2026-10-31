// Kept picker: lists an account's posts, images, reels or highlights, lets you
// tick the ones you want, and exports just those with your saved options.
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const username = (params.get("user") || "").replace(/^@/, "");
let mode = ["posts", "images", "reels", "highlights"].includes(params.get("mode")) ? params.get("mode") : "posts";
const state = { jobId: null, loading: false, items: [], selected: new Set(), last: -1, exportJob: null };

chrome.storage.local.get("theme").then(({ theme }) => {
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
});
document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
$("title").textContent = username ? `Choose from @${username}` : "Choose what to export";

const noun = () => ({ posts: "post", images: "post", reels: "reel", highlights: "highlight" })[mode];
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const dateOf = (t) => (t ? new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

/* ===== Thumbnails: fetched by the extension (Instagram's CDN won't serve them to other pages), six at a time ===== */
const thumbQueue = [];
let thumbsActive = 0;
function loadThumb(img, url) {
  thumbQueue.push([img, url]);
  pumpThumbs();
}
function pumpThumbs() {
  while (thumbsActive < 6 && thumbQueue.length) {
    const [img, url] = thumbQueue.shift();
    thumbsActive++;
    fetch(url, { credentials: "omit" })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => { img.src = URL.createObjectURL(b); img.onload = () => img.classList.add("ok"); })
      .catch(() => {})
      .finally(() => { thumbsActive--; pumpThumbs(); });
  }
}
const seenTile = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    seenTile.unobserve(e.target);
    const img = e.target.querySelector("img");
    if (img.dataset.src) loadThumb(img, img.dataset.src);
  }
}, { rootMargin: "300px" });

/* ===== Rendering ===== */
function tile(it, index) {
  const li = document.createElement("li");
  li.className = "tile";
  const label = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.setAttribute("aria-label", `${it.kind} from ${dateOf(it.takenAt)}${it.caption ? ": " + it.caption.slice(0, 60) : ""}`);
  box.addEventListener("click", (e) => toggle(index, box.checked, e.shiftKey || state.shift));
  label.addEventListener("click", (e) => (state.shift = e.shiftKey));
  const img = document.createElement("img");
  img.alt = "";
  img.dataset.src = it.thumb || "";
  const check = document.createElement("span");
  check.className = "box";
  check.innerHTML = '<svg class="icon" aria-hidden="true"><use href="icons/ui.svg#check"/></svg>';
  const info = document.createElement("span");
  info.className = "info";
  const when = document.createElement("span");
  when.textContent = dateOf(it.takenAt);
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = it.kind === "reel" || it.kind === "video" ? "▶" : it.files > 1 ? `${it.files}` : "";
  info.append(when, badge);
  label.append(img, box, check, info);
  li.append(label);
  li.title = it.caption || "";
  seenTile.observe(li);
  return li;
}
function row(it, index) {
  const li = document.createElement("li");
  const label = document.createElement("label");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.addEventListener("click", (e) => toggle(index, box.checked, e.shiftKey || state.shift));
  label.addEventListener("click", (e) => (state.shift = e.shiftKey));
  const name = document.createElement("span");
  name.textContent = it.title;
  const cover = document.createElement("img");
  cover.className = "cover";
  cover.alt = "";
  if (it.thumb) loadThumb(cover, it.thumb);
  label.append(box, cover, name);
  li.append(label);
  return li;
}
function addItems(items) {
  const host = mode === "highlights" ? $("list") : $("grid");
  for (const it of items) {
    const index = state.items.push(it) - 1;
    host.append(mode === "highlights" ? row(it, index) : tile(it, index));
  }
  render();
}
function boxes() {
  return [...document.querySelectorAll(mode === "highlights" ? "#list input" : "#grid input")];
}
function toggle(index, on, range) {
  const all = boxes();
  const from = range && state.last >= 0 ? Math.min(state.last, index) : index;
  const to = range && state.last >= 0 ? Math.max(state.last, index) : index;
  for (let i = from; i <= to; i++) {
    const key = keyOf(state.items[i]);
    on ? state.selected.add(key) : state.selected.delete(key);
    all[i].checked = on;
    all[i].closest("li").classList.toggle("on", on);
  }
  state.last = index;
  state.shift = false;
  render();
}
const keyOf = (it) => it.code || it.id;
function render() {
  const n = state.selected.size, total = state.items.length;
  $("status").textContent = state.loading ? `Loading… ${plural(total, noun())} so far` : `${plural(total, noun())}${state.stopped ? " (stopped early)" : ""}`;
  $("stopBtn").hidden = !state.loading;
  if (!state.exportJob) {
    $("barText").textContent = n ? `${plural(n, noun())} selected` : "Nothing selected";
    $("exportBtn").textContent = n ? `Export ${plural(n, noun())}` : "Export";
    $("exportBtn").disabled = !n;
  }
  $("empty").hidden = state.loading || total > 0;
}

/* ===== Listing ===== */
function start() {
  if (state.jobId && state.loading) chrome.runtime.sendMessage({ type: "LIST_STOP", jobId: state.jobId });
  Object.assign(state, { jobId: null, loading: true, items: [], selected: new Set(), last: -1, stopped: false });
  $("grid").textContent = "";
  $("list").textContent = "";
  $("grid").hidden = mode === "highlights";
  $("list").hidden = mode !== "highlights";
  $("sub").textContent = { posts: "Posts, newest first", images: "Posts with images, newest first", reels: "Reels from the Reels tab, newest first", highlights: "Story highlights" }[mode];
  render();
  if (!username) {
    state.loading = false;
    $("empty").textContent = "Open this from the Kept popup on a profile, so it knows which account to list.";
    render();
    return;
  }
  chrome.runtime.sendMessage({ type: "LIST_POSTS", username, mode }, (resp) => {
    if (chrome.runtime.lastError || !resp?.ok) return fail(resp?.error || "The background worker didn't respond.");
    state.jobId = resp.jobId;
  });
}
function fail(text) {
  state.loading = false;
  $("empty").textContent = text;
  render();
  $("empty").hidden = false;
}
chrome.runtime.onMessage.addListener((m) => {
  if (m?.jobId && m.jobId === state.jobId) {
    if (m.type === "PICK_ITEMS") {
      if (m.username) $("title").textContent = `Choose from @${m.username}`;
      addItems(m.items);
    } else if (m.type === "PICK_DONE") {
      state.loading = false;
      state.stopped = !!m.stopped;
      if (!state.items.length) $("empty").textContent = `No ${noun()}s to show.`;
      render();
    } else if (m.type === "PICK_ERROR") {
      fail(m.error);
    } else if (m.type === "PICK_WAIT" && m.until > Date.now()) {
      $("status").textContent = `Instagram asked Kept to slow down. Carrying on in ${Math.ceil((m.until - Date.now()) / 1000)} s…`;
    }
  }
  if (state.exportJob && m?.jobId === state.exportJob) onExport(m);
});
for (const r of document.querySelectorAll('input[name="mode"]')) {
  r.addEventListener("change", () => {
    mode = r.value;
    history.replaceState(null, "", `?user=${encodeURIComponent(username)}&mode=${mode}`);
    start();
  });
}
$("stopBtn").addEventListener("click", () => chrome.runtime.sendMessage({ type: "LIST_STOP", jobId: state.jobId }));
$("allBtn").addEventListener("click", () => {
  boxes().forEach((b, i) => { b.checked = true; b.closest("li").classList.add("on"); state.selected.add(keyOf(state.items[i])); });
  render();
});
$("noneBtn").addEventListener("click", () => {
  boxes().forEach((b) => { b.checked = false; b.closest("li").classList.remove("on"); });
  state.selected.clear();
  render();
});

/* ===== Exporting the selection ===== */
$("exportBtn").addEventListener("click", async () => {
  const { saveOptions = {} } = await chrome.storage.local.get("saveOptions");
  const picked = [...state.selected];
  const options = { folder: !!saveOptions.folder, onlyNew: false, pattern: saveOptions.pattern || "", bestVideo: saveOptions.bestVideo !== false, jpg: !!saveOptions.jpg };
  if (mode === "highlights") options.highlightIds = picked;
  else options.only = picked;
  $("exportBtn").disabled = true;
  $("showBtn").hidden = true;
  $("barText").textContent = "Starting…";
  chrome.runtime.sendMessage({ type: "PROFILE_EXPORT", mode, username, options }, (resp) => {
    if (chrome.runtime.lastError || !resp?.ok) {
      $("barText").textContent = resp?.error || "Couldn't start the export.";
      $("exportBtn").disabled = false;
      return;
    }
    state.exportJob = resp.jobId;
  });
});
function onExport(m) {
  if (m.type === "EXPORT_PROGRESS") {
    $("barText").textContent = m.phase === "downloading" && m.total ? `Downloading ${m.done} of ${m.total} files…` : m.phase === "waiting" ? "Instagram asked Kept to slow down; carrying on shortly…" : m.message || "Working…";
  } else if (m.type === "EXPORT_DONE") {
    $("barText").textContent = `Saved · ${m.filename || ""}`;
    const job = state.exportJob;
    state.exportJob = null;
    $("exportBtn").disabled = false;
    $("exportBtn").textContent = "Export again";
    chrome.runtime.sendMessage({ type: "JOB_FILES", jobId: job }, (files) => {
      if (chrome.runtime.lastError || files?.show == null) return;
      $("showBtn").hidden = false;
      $("showBtn").onclick = () => chrome.downloads.show(files.show);
    });
  } else if (m.type === "EXPORT_ERROR") {
    state.exportJob = null;
    $("barText").textContent = m.error || "Export failed.";
    render();
  }
}

start();
