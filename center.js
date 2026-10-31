// Kept Export Center: what's exporting now, what you've exported, settings,
// and whether Instagram still answers. Everything lives in chrome.storage.local.
import { fileBase } from "./src/names.js";

const $ = (id) => document.getElementById(id);
const store = chrome.storage.local;
$("version").textContent = `v${chrome.runtime.getManifest().version}`;

function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $("toast").classList.remove("show"), 1800);
}

function summaryLabel(s = {}) {
  const n = (v, one, many = one + "s") => `${v} ${v === 1 ? one : many}`;
  const extra = (s.failed ? `, ${s.failed} failed` : "") + (s.skipped ? `, ${s.skipped} already saved` : "");
  if (s.messages != null) return `${s.chats > 1 ? n(s.chats, "chat") + ", " : ""}${n(s.messages, "message")}${s.media ? `, ${n(s.media - (s.failed || 0), "media file")}` : ""}`;
  if (s.followers != null) return `${n(s.followers, "follower")}, ${s.following} following` + (s.newFollowers != null ? ` · ${s.newFollowers} new, ${s.unfollowers} unfollowed` : "");
  if (s.posts != null) return n(s.posts, "post") + extra;
  if (s.reels != null) return n(s.reels, "reel") + extra;
  if (s.stories != null) return n(s.stories, "story", "stories") + extra;
  if (s.highlights != null) return `${n(s.highlights, "highlight")}, ${n(s.files || 0, "file")}${extra}`;
  if (s.files != null) return n(s.files, "file") + extra;
  if (s.profilePic) return "Profile picture";
  return "Saved";
}

/* ===== Theme ===== */
function applyTheme(t) {
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
for (const r of document.querySelectorAll('input[name="theme"]')) {
  r.addEventListener("change", () => {
    applyTheme(r.value);
    store.set({ theme: r.value });
  });
}

/* ===== Side navigation follows the scroll ===== */
const links = [...document.querySelectorAll(".side a")];
const navWatch = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.hash === `#${e.target.id}`));
}, { rootMargin: "-30% 0px -60% 0px" });
document.querySelectorAll("main section").forEach((s) => navWatch.observe(s));

/* ===== Now ===== */
const ring = $("nowRing");
function setNow(label, sub, mode, pct) {
  $("nowLabel").textContent = label;
  $("nowSub").textContent = sub;
  ring.className = `ring ${mode || ""}`;
  ring.style.setProperty("--p", String(pct || 0));
}
let doneTimer = null;
chrome.runtime.onMessage.addListener((m) => {
  if (m?.type === "EXPORT_PROGRESS") {
    clearTimeout(doneTimer);
    const what = String(m.jobId || "").startsWith("chat_") ? "Chat export" : "Export";
    if (m.phase === "downloading" && m.total) {
      const pct = Math.floor((m.done / m.total) * 100);
      setNow(`${what}: downloading`, `${m.done} of ${m.total} files`, "", pct);
    } else if (m.phase === "waiting") {
      setNow(`${what}: waiting`, "Instagram asked Kept to slow down; it carries on by itself.", "active");
    } else {
      setNow(`${what}: ${m.phase || "working"}`, m.message || "", "active");
    }
  } else if (m?.type === "EXPORT_DONE") {
    setNow("Saved", `${summaryLabel(m.summary)} · ${m.filename || ""}`, "ok");
    doneTimer = setTimeout(() => setNow("Nothing is exporting", "Start an export from the Kept button in your toolbar; its progress shows here too.", ""), 15000);
  } else if (m?.type === "EXPORT_ERROR") {
    setNow("Export failed", m.error || "Something went wrong.", "fail");
  } else if (m?.type === "CHECK_PROGRESS" || m?.type === "CHECK_DONE") {
    onCheck(m);
  }
});

/* ===== History ===== */
async function fileExists(id) {
  if (id == null) return false;
  const [item] = await chrome.downloads.search({ id }).catch(() => []);
  return !!item && item.state === "complete" && item.exists !== false;
}
async function renderHistory() {
  const { history = [] } = await store.get("history");
  const list = $("historyList");
  list.textContent = "";
  $("historyEmpty").hidden = history.length > 0;
  $("clearHistory").hidden = !history.length;
  for (const h of history) {
    const li = document.createElement("li");
    const kind = document.createElement("span");
    kind.className = "kind";
    kind.innerHTML = `<svg class="icon" aria-hidden="true"><use href="icons/ui.svg#${h.kind === "chat" ? "chat" : "grid"}"/></svg>`;
    const text = document.createElement("div");
    const name = document.createElement("p");
    name.className = "name";
    name.textContent = h.filename.split("/").filter(Boolean).pop() || "Export";
    name.title = h.filename;
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `${summaryLabel(h.summary)} · ${new Date(h.at).toLocaleString()}`;
    text.append(name, meta);
    const acts = document.createElement("div");
    acts.className = "acts";
    const show = document.createElement("button");
    show.className = "btn-ghost";
    show.textContent = "Show in folder";
    show.disabled = true;
    acts.append(show);
    fileExists(h.show).then((ok) => {
      show.disabled = !ok;
      show.title = ok ? "" : "The file was moved or deleted";
    });
    show.addEventListener("click", () => chrome.downloads.show(h.show));
    if (h.open != null) {
      const open = document.createElement("button");
      open.className = "btn-ghost";
      open.textContent = "Open chat";
      open.addEventListener("click", () => chrome.downloads.open(h.open));
      acts.append(open);
    }
    li.append(kind, text, acts);
    list.append(li);
  }
}
$("clearHistory").addEventListener("click", async () => {
  await store.set({ history: [] });
  toast("History cleared");
});

/* ===== Settings ===== */
async function loadSettings() {
  const all = await store.get(null);
  document.querySelector(`input[name="theme"][value="${all.theme || "system"}"]`).checked = true;
  applyTheme(all.theme);
  const o = all.saveOptions || {};
  $("sFolder").checked = !!o.folder;
  $("sOnlyNew").checked = !!o.onlyNew;
  $("sPattern").value = o.pattern || "";
  $("sPattern").placeholder = o.folder ? "{date}_{code}" : "{index}_{date}_{code}";
  const c = all.chatOptions || {};
  $("sMedia").checked = c.media !== false;
  $("sEncoding").checked = !!c.instagramEncoding;
  const seen = Object.keys(all).filter((k) => k.startsWith("seen:"));
  const items = seen.reduce((n, k) => n + (all[k]?.length || 0), 0);
  const snap = all["audience:me"];
  $("seenInfo").textContent = (seen.length
    ? `Kept remembers ${items} saved item${items === 1 ? "" : "s"} across ${seen.length} account and type pair${seen.length === 1 ? "" : "s"}, so "only new" can skip them.`
    : 'Nothing remembered yet. Exports remember what they saved, so "only new" can skip it next time.') +
    (snap ? ` Your follower snapshot is from ${new Date(snap.at).toLocaleDateString()}.` : "");
  $("forgetSeen").disabled = !seen.length && !snap;
  showPreview();
}
// A live example of the file names the pattern gives, for a post and a reel.
function showPreview() {
  const at = Math.floor(Date.now() / 1000);
  const name = (index) => fileBase($("sPattern").value, { folder: $("sFolder").checked, username: "nasa", takenAt: at, code: "DfH-Y3JugI4", index });
  $("patternPreview").textContent = `Example: a post saves as ${name(1)}/01.jpg, a reel as ${name(2)}.mp4`;
}
$("sPattern").addEventListener("input", showPreview);

function saveSettings() {
  $("sPattern").placeholder = $("sFolder").checked ? "{date}_{code}" : "{index}_{date}_{code}";
  showPreview();
  store.set({
    saveOptions: { folder: $("sFolder").checked, onlyNew: $("sOnlyNew").checked, pattern: $("sPattern").value.trim() },
    chatOptions: { media: $("sMedia").checked, instagramEncoding: $("sEncoding").checked },
  });
}
for (const id of ["sFolder", "sOnlyNew", "sMedia", "sEncoding", "sPattern"]) $(id).addEventListener("change", saveSettings);
$("forgetSeen").addEventListener("click", async () => {
  const all = await store.get(null);
  await store.remove(Object.keys(all).filter((k) => k.startsWith("seen:") || k === "audience:me"));
  toast("Forgotten. The next export downloads everything again, and starts a new follower snapshot.");
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.history) renderHistory();
  if (Object.keys(changes).some((k) => k.startsWith("seen:") || k === "saveOptions" || k === "chatOptions" || k === "theme")) loadSettings();
});

/* ===== Instagram check ===== */
const STEPS = [["search", "Find accounts"], ["posts", "Posts"], ["post", "Single posts"], ["reels", "Reels"], ["stories", "Stories"], ["highlights", "Highlights"]];
const check = { jobId: null, running: false, rows: new Map() };
function renderCheck() {
  const list = $("checkList");
  list.textContent = "";
  for (const [key] of STEPS) {
    const r = check.rows.get(key);
    if (!r) continue;
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.dataset.state = r.state;
    const text = document.createElement("span");
    text.textContent = r.label;
    if (r.detail) {
      const d = document.createElement("span");
      d.className = "detail";
      d.textContent = r.detail;
      text.append(d);
    }
    li.append(dot, text);
    list.append(li);
  }
  const failed = [...check.rows.values()].filter((r) => r.state === "fail").length;
  $("checkSummary").textContent = check.running ? "Checking…" : check.rows.size ? (failed ? `${failed} not working. Use Report a problem in the popup to tell us.` : "Everything works.") : "";
  $("runCheck").disabled = check.running;
}
function onCheck(m) {
  if (!check.running || (check.jobId && m.jobId !== check.jobId)) return;
  if (m.type === "CHECK_PROGRESS" && m.key) check.rows.set(m.key, { label: m.label, state: m.state, detail: m.detail });
  if (m.type === "CHECK_DONE") check.running = false;
  renderCheck();
}
$("runCheck").addEventListener("click", () => {
  check.running = true;
  check.jobId = null;
  check.rows = new Map(STEPS.map(([key, label]) => [key, { label, state: "idle" }]));
  renderCheck();
  chrome.runtime.sendMessage({ type: "RUN_CHECK" }, (resp) => {
    if (chrome.runtime.lastError || !resp?.ok) {
      check.running = false;
      check.rows.set("search", { label: "Find accounts", state: "fail", detail: resp?.error || "The background worker didn't respond." });
      renderCheck();
      return;
    }
    check.jobId = resp.jobId;
  });
});

loadSettings();
renderHistory();
