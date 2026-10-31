// src/profilepage.js
//
// The offline gallery (index.html) in profile exports: a grid of the saved
// posts, reels, stories or highlights; click one to see all its photos and
// videos full screen with the caption and date. Self-contained: inline CSS and
// JS, media from the folders beside it, nothing from the internet. Captions
// are untrusted, so the page only writes them with textContent.

const CSS = `
:root{--bg:#f3f6f8;--panel:#fff;--text:#16212a;--dim:#5d6b76;--line:#dde5eb;--accent:#0F4C75;--sky:#3282B8}
@media (prefers-color-scheme:dark){:root{--bg:#10181d;--panel:#1B262C;--text:#e7eef3;--dim:#93a6b2;--line:#26343d;--accent:#BBE1FA;--sky:#3282B8}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
:focus-visible{outline:2px solid var(--sky);outline-offset:2px}
header{position:sticky;top:0;z-index:3;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:16px 24px;background:var(--panel);border-bottom:1px solid var(--line)}
h1{margin:0;font-size:20px}header p{margin:2px 0 0;color:var(--dim);font-size:13px}
input{font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:8px 14px;width:240px}
main{padding:16px 24px 48px;max-width:1280px;margin:0 auto}
h2{font-size:15px;margin:24px 0 10px;color:var(--dim)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
.grid button{position:relative;padding:0;border:0;border-radius:14px;overflow:hidden;aspect-ratio:1;background:var(--panel);cursor:zoom-in}
.grid img,.grid video{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.grid button:hover img,.grid button:hover video{transform:scale(1.04)}
.grid .tag{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;padding:16px 8px 6px;font-size:12px;color:#fff;background:rgba(16,24,29,.6)}
#viewer{position:fixed;inset:0;z-index:10;display:grid;grid-template-columns:1fr minmax(260px,340px);background:rgba(8,12,15,.95);color:#fff}
#viewer[hidden]{display:none}
.stage{position:relative;display:grid;place-items:center;padding:56px 64px;min-width:0}
.stage img,.stage video{max-width:100%;max-height:calc(100vh - 112px);border-radius:8px;display:block}
.stage [hidden]{display:none}
.nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px;cursor:pointer}
.nav:hover{background:rgba(255,255,255,.26)}#prev{left:12px}#next{right:12px}
aside{padding:24px;overflow:auto;background:rgba(255,255,255,.04)}
aside .when{color:#b9c7d0;font-size:13px;margin:0 0 8px}aside .cap{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 16px}
aside a{color:#BBE1FA}aside .count{color:#b9c7d0;font-size:13px}
#close{position:absolute;top:12px;right:12px;border:0;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;padding:7px 14px;font:inherit;cursor:pointer}
footer{text-align:center;color:var(--dim);font-size:12px;padding:20px}
@media (max-width:760px){#viewer{grid-template-columns:1fr;grid-template-rows:1fr auto}.stage{padding:52px 12px 12px}aside{max-height:35vh}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const JS = `
const data = JSON.parse(document.getElementById("data").textContent);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const src = (p) => p.split("/").map(encodeURIComponent).join("/");
const isVideo = (p) => /\\.(mp4|mov|webm)$/i.test(p);
const fmt = (t) => t ? new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
const main = document.getElementById("grid-host");
const tiles = [];
let group = null, grid = null;
data.items.forEach((it, i) => {
  if (!grid || (it.group && it.group !== group)) {
    group = it.group || null;
    if (group) main.append(el("h2", null, group));
    grid = el("div", "grid"); main.append(grid);
  }
  const b = el("button"); b.setAttribute("aria-label", (it.caption || it.kind || "Item") + " · " + fmt(it.takenAt));
  const cover = it.cover || it.files[0];
  const m = el(isVideo(cover) ? "video" : "img"); m.src = src(cover);
  if (m.tagName === "IMG") { m.loading = "lazy"; m.alt = ""; } else { m.muted = true; m.preload = "metadata"; }
  const tag = el("span", "tag"); tag.append(el("span", null, fmt(it.takenAt)), el("span", null, it.files.length > 1 ? it.files.length + " files" : isVideo(it.files[0]) ? "▶" : ""));
  b.append(m, tag); b.onclick = () => open(i, 0);
  grid.append(b); tiles.push({ b, text: ((it.caption || "") + " " + (it.group || "")).toLowerCase() });
});
document.getElementById("q").addEventListener("input", (e) => {
  const v = e.target.value.trim().toLowerCase();
  tiles.forEach((t) => (t.b.hidden = !!v && !t.text.includes(v)));
});

const viewer = document.getElementById("viewer"), img = document.getElementById("vImg"), video = document.getElementById("vVideo");
let cur = [0, 0], opener = null;
function open(i, f) {
  if (viewer.hidden) opener = document.activeElement;
  const it = data.items[i], file = it.files[f];
  cur = [i, f];
  video.pause();
  img.hidden = isVideo(file); video.hidden = !isVideo(file);
  if (isVideo(file)) video.src = src(file); else img.src = src(file);
  document.getElementById("when").textContent = fmt(it.takenAt) + (it.group ? " · " + it.group : "");
  document.getElementById("cap").textContent = it.caption || "";
  document.getElementById("count").textContent = (it.files.length > 1 ? "File " + (f + 1) + " of " + it.files.length + " · " : "") + "Item " + (i + 1) + " of " + data.items.length;
  const link = document.getElementById("link");
  link.hidden = !it.url; if (it.url) link.href = it.url;
  viewer.hidden = false; document.body.style.overflow = "hidden";
  document.getElementById("close").focus();
}
function step(d) {
  let [i, f] = cur;
  f += d;
  if (f >= data.items[i].files.length) { i = (i + 1) % data.items.length; f = 0; }
  else if (f < 0) { i = (i - 1 + data.items.length) % data.items.length; f = data.items[i].files.length - 1; }
  open(i, f);
}
function close() { viewer.hidden = true; video.pause(); document.body.style.overflow = ""; if (opener) opener.focus(); }
document.getElementById("prev").onclick = () => step(-1);
document.getElementById("next").onclick = () => step(1);
document.getElementById("close").onclick = close;
addEventListener("keydown", (e) => {
  if (viewer.hidden) return;
  if (e.key === "Escape") close(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
});
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * @param {{ username: string, type: string, items: Array<{files: string[], cover?: string,
 *   caption?: string, takenAt?: number, kind?: string, url?: string, group?: string}>, exportedAt?: Date }} gallery
 */
export function profilePage({ username, type, items, exportedAt = new Date() }) {
  const title = `@${username || "instagram"} · ${type}`;
  const kept = items.filter((it) => it.files.length);
  const data = JSON.stringify({ items: kept }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style></head>
<body>
<header><div><h1>${esc(title)}</h1><p>${kept.length} saved · exported with Kept on ${esc(exportedAt.toLocaleDateString("en-GB"))}</p></div>
<input id="q" type="search" placeholder="Search captions" aria-label="Search captions"></header>
<main id="grid-host"></main>
<div id="viewer" hidden role="dialog" aria-modal="true" aria-label="Viewer">
<div class="stage"><button class="nav" id="prev" aria-label="Previous (←)">←</button><img id="vImg" alt=""><video id="vVideo" controls hidden></video><button class="nav" id="next" aria-label="Next (→)">→</button></div>
<aside><p class="when" id="when"></p><p class="cap" id="cap"></p><p><a id="link" target="_blank" rel="noopener noreferrer">Open on Instagram</a></p><p class="count" id="count"></p></aside>
<button id="close" aria-label="Close (Esc)">Close</button>
</div>
<footer>Opens offline; photos and videos come from the folders next to this file.</footer>
<script type="application/json" id="data">${data}</script>
<script>${JS}</script>
</body></html>
`;
}
