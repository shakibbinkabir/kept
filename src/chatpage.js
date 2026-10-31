// src/chatpage.js
//
// A self-contained offline page (index.html at the top of a chat archive)
// that shows the chat like a messaging app: bubbles, sticky day headings,
// search, jump to a date, filters, a gallery, a full-screen viewer, voice
// notes with a waveform, and a book layout for printing or saving as PDF.
// Media is loaded from the archive's own folders by relative path; nothing is
// fetched from the internet. Message text is untrusted, so the page only ever
// writes it with textContent.

const CSS = `
:root{--bg:#f3f6f8;--panel:#ffffff;--text:#16212a;--dim:#5d6b76;--theirs:#e6edf2;--mine:#0F4C75;--mine-text:#fff;--accent:#3282B8;--line:#dde5eb;--mark:#BBE1FA;--bar:#3282B8}
@media (prefers-color-scheme:dark){:root{--bg:#11171b;--panel:#1B262C;--text:#e7eef3;--dim:#8fa1ad;--theirs:#24323b;--mine:#0F4C75;--mine-text:#eaf6ff;--accent:#3282B8;--line:#26343d;--mark:#3282B8;--bar:#4A97CC}}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
header{position:sticky;top:0;z-index:5;background:var(--panel);border-bottom:1px solid var(--line);padding:14px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
h1{font-size:18px;margin:0}header p{margin:2px 0 0;color:var(--dim);font-size:13px}
.tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
input,button{font:inherit;font-size:14px;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:7px 10px}
input[type=search]{width:220px}button{cursor:pointer;padding:7px 11px}button:hover{border-color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#count{color:var(--dim);font-size:13px;min-width:70px;text-align:right}
main{max-width:760px;margin:0 auto;padding:12px 16px 60px}
#loading{color:var(--dim);font-size:13px;text-align:center;margin:16px 0}
.day{content-visibility:auto;contain-intrinsic-size:auto 600px}
.day h2{position:sticky;top:calc(var(--head,64px) + 6px);z-index:2;margin:22px auto 10px;width:max-content;font-size:12px;font-weight:600;color:var(--dim);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:3px 12px}
.msg{display:flex;flex-direction:column;align-items:flex-start;margin:2px 0;scroll-margin-top:calc(var(--head,64px) + 60px)}
.msg.mine{align-items:flex-end}
.who{font-size:12px;color:var(--dim);margin:8px 12px 2px}
.bubble{max-width:78%;background:var(--theirs);border-radius:18px;padding:8px 12px;white-space:pre-wrap;overflow-wrap:anywhere}
.mine .bubble{background:var(--mine);color:var(--mine-text)}
.bubble img,.bubble video{display:block;max-width:100%;max-height:420px;border-radius:12px;margin:2px 0}
.bubble a.photo{display:block;cursor:zoom-in}
.bubble audio{display:block;width:260px;max-width:100%;margin:4px 0}
.bubble a{color:inherit}
.voice{display:flex;align-items:center;gap:10px;min-width:220px;padding:2px 0}
.voice .play{width:34px;height:34px;flex-shrink:0;border-radius:50%;border:0;padding:0;background:var(--accent);color:#fff;font-size:13px}
.mine .voice .play{background:#fff;color:var(--mine)}
.wave{flex:1;display:flex;align-items:center;gap:2px;height:30px;cursor:pointer}
.wave i{flex:1;min-width:2px;border-radius:2px;background:currentColor;opacity:.35}
.wave i.on{opacity:1}
.voice .dur{font-size:12px;font-variant-numeric:tabular-nums;opacity:.8;min-width:34px}
.share{display:block;border-left:3px solid var(--accent);padding:2px 0 2px 8px;margin:2px 0;font-size:14px}
.meta{font-size:11px;color:var(--dim);margin:1px 12px}
.reacts{font-size:12px;margin:-4px 12px 2px;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:1px 8px}
.system{align-self:center;align-items:center;margin:8px 0}.system .bubble{background:none;color:var(--dim);font-size:13px;padding:2px}
.hit .bubble{outline:2px solid var(--accent)}.current .bubble{outline-width:3px}
mark{background:var(--mark);color:inherit;border-radius:3px}
footer{text-align:center;color:var(--dim);font-size:12px;padding:20px}
.back{color:var(--accent);text-decoration:none;font-size:13px}
.chips{display:flex;gap:6px;flex-wrap:wrap;width:100%}
.chip{border-radius:999px;padding:4px 12px;font-size:13px}.chip[aria-pressed=true]{background:var(--mine);border-color:var(--mine);color:var(--mine-text)}
#gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;max-width:960px;margin:0 auto;padding:16px}
#gallery button{padding:0;border:0;border-radius:12px;overflow:hidden;aspect-ratio:1;background:var(--theirs);position:relative;cursor:zoom-in}
#gallery img,#gallery video{width:100%;height:100%;object-fit:cover;display:block}
#gallery .kind{position:absolute;right:6px;bottom:6px;font-size:12px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;padding:1px 6px}
#viewer{position:fixed;inset:0;z-index:20;background:rgba(8,12,15,.94);display:grid;grid-template-rows:auto 1fr;color:#fff}
#viewer[hidden]{display:none}
#viewer .bar{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:12px 16px}
#viewer .bar span{font-size:14px;opacity:.85}
#viewer button{background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:999px}
#viewer button:hover{background:rgba(255,255,255,.22)}
#viewer .stage{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:0 12px 16px;min-height:0}
#viewer .stage button{width:44px;height:44px;font-size:18px;padding:0}
#viewer img,#viewer video{max-width:100%;max-height:calc(100vh - 90px);margin:auto;display:block;border-radius:8px}
#viewer [hidden]{display:none}
.list{list-style:none;margin:0 auto;padding:12px 16px;max-width:760px}
.list a{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;margin:6px 0;border-radius:14px;background:var(--panel);border:1px solid var(--line);color:inherit;text-decoration:none}
.list a:hover{border-color:var(--accent)}.list small{color:var(--dim)}
.cover{display:none}
#stats{max-width:980px;margin:0 auto;padding:16px;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.st{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px}
.st .big{display:block;font-size:28px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.15}
.st .label{color:var(--dim);font-size:13px}.st .more{display:block;font-size:13px;margin-top:4px;overflow-wrap:anywhere}
.ch{grid-column:1/-1;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px}
.ch h3{margin:0;font-size:15px}.ch .note{margin:2px 0 12px;color:var(--dim);font-size:13px}
.cols{display:flex;align-items:flex-end;gap:2px;height:150px;border-bottom:1px solid var(--line)}
.cols .b{flex:1;min-width:2px;height:100%;display:flex;align-items:flex-end;cursor:default}
.cols i{display:block;width:100%;height:var(--h);min-height:1px;background:var(--bar);border-radius:4px 4px 0 0;transform-origin:bottom;transform:scaleY(0);transition:transform .7s cubic-bezier(.16,1,.3,1) var(--d,0ms)}
.cols .b:hover i{opacity:.8}
.axis{display:flex;justify-content:space-between;color:var(--dim);font-size:11px;margin-top:4px}.axis.each{gap:2px}.axis.each span{flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rows .r{display:grid;grid-template-columns:minmax(70px,170px) 1fr minmax(48px,auto);gap:10px;align-items:center;margin:7px 0;font-size:14px}
.rows .who2{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rows .n{color:var(--dim);font-variant-numeric:tabular-nums;text-align:right}
.rows .track{height:14px}
.rows i{display:block;height:100%;width:var(--w);min-width:2px;background:var(--bar);border-radius:0 4px 4px 0;transform-origin:left;transform:scaleX(0);transition:transform .7s cubic-bezier(.16,1,.3,1) var(--d,0ms)}
#stats.in .cols i{transform:scaleY(1)}#stats.in .rows i{transform:scaleX(1)}
.ch details{margin-top:10px;font-size:13px;color:var(--dim)}.ch summary{cursor:pointer}
.ch table{border-collapse:collapse;margin-top:6px;color:var(--text)}.ch td,.ch th{padding:2px 14px 2px 0;text-align:left;font-variant-numeric:tabular-nums;font-weight:400}
#tip{position:fixed;z-index:30;pointer-events:none;background:var(--text);color:var(--bg);font-size:12px;padding:5px 9px;border-radius:8px;transform:translate(-50%,calc(-100% - 8px));white-space:nowrap}
@media (prefers-reduced-motion:reduce){.cols i,.rows i{transition:none;transform:none}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
@media print{
  @page{margin:18mm 16mm}
  :root{--bg:#fff;--panel:#fff;--text:#111;--dim:#555;--theirs:#eef2f5;--mine:#0F4C75;--mine-text:#fff;--line:#ccc}
  body{background:#fff;font-size:11pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  header,#gallery,#viewer,#stats,#tip,footer,#loading,.who:empty{display:none!important}
  main{max-width:none;padding:0}
  .cover{display:flex;flex-direction:column;justify-content:center;min-height:240mm;break-after:page;text-align:center}
  .cover h1{font-size:30pt;margin:0 0 12pt}.cover p{margin:4pt 0;color:#444;font-size:13pt}.cover small{margin-top:40pt;color:#777}
  .day{content-visibility:visible}
  .day h2{position:static;border:0;border-radius:0;background:none;width:auto;text-align:center;font-size:15pt;font-weight:600;color:#0F4C75;margin:18pt 0 8pt;padding:0 0 4pt;border-bottom:1px solid #ccd;break-after:avoid}
  .msg{break-inside:avoid}
  .bubble img{max-height:70mm}
  .bubble video,.voice .play,.wave{display:none}
  .voice .dur::before{content:"Voice note "}
  .msg[hidden]{display:flex!important}.day[hidden]{display:block!important}
  .hit .bubble{outline:none}
}
`;

const JS = `
const chat = JSON.parse(document.getElementById("data").textContent);
const waves = JSON.parse(document.getElementById("waves").textContent);
const setHead = () => document.documentElement.style.setProperty("--head", document.querySelector("header").offsetHeight + "px");
setHead(); addEventListener("resize", setHead);
const me = chat.participants.length ? chat.participants[chat.participants.length - 1].name : "";
const main = document.getElementById("chat");
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const pad = (n) => String(n).padStart(2, "0");
const dayKey = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const base = document.body.dataset.base || "";
const src = (uri) => /^(https?:|data:)/.test(uri) ? uri : base + uri.split("/").map(encodeURIComponent).join("/");
const fmt = (t) => Math.floor(t / 60) + ":" + pad(Math.floor(t % 60));
const msgs = [...chat.messages].reverse();
const items = [], media = [];
let section = null, lastDay = "", lastSender = "", days = [], target = main;
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

// A voice note with its waveform (worked out when the chat was exported).
let playing = null;
function voice(s) {
  const audio = el("audio"); audio.preload = "metadata"; audio.src = src(s.uri);
  const w = waves[s.uri];
  if (!w || !w.length) { audio.controls = true; return audio; }
  const box = el("div", "voice"), btn = el("button", "play", "▶"), bars = el("span", "wave"), dur = el("span", "dur", "0:00");
  btn.type = "button"; btn.setAttribute("aria-label", "Play voice note"); bars.setAttribute("aria-hidden", "true");
  const spans = w.map((v) => { const b = el("i"); b.style.height = Math.max(10, Math.round(v * 100)) + "%"; bars.append(b); return b; });
  const paint = () => { const k = audio.duration ? audio.currentTime / audio.duration : 0; const n = Math.round(k * spans.length); spans.forEach((b, j) => b.classList.toggle("on", j < n)); };
  audio.addEventListener("loadedmetadata", () => { if (isFinite(audio.duration)) dur.textContent = fmt(audio.duration); });
  audio.addEventListener("timeupdate", () => { paint(); dur.textContent = fmt(audio.currentTime); });
  audio.addEventListener("play", () => { if (playing && playing !== audio) playing.pause(); playing = audio; btn.textContent = "❚❚"; btn.setAttribute("aria-label", "Pause voice note"); });
  audio.addEventListener("pause", () => { btn.textContent = "▶"; btn.setAttribute("aria-label", "Play voice note"); });
  audio.addEventListener("ended", () => { audio.currentTime = 0; paint(); if (isFinite(audio.duration)) dur.textContent = fmt(audio.duration); });
  btn.onclick = () => (audio.paused ? audio.play() : audio.pause());
  bars.onclick = (e) => { const r = bars.getBoundingClientRect(); if (audio.duration) { audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; paint(); } };
  box.append(btn, bars, dur, audio);
  return box;
}

function addMessage(m, i) {
  const at = new Date(m.timestamp_ms), key = dayKey(at);
  if (key !== lastDay) {
    section = el("section", "day"); section.dataset.date = key;
    section.append(el("h2", null, dayFmt.format(at)));
    target.append(section); lastDay = key; lastSender = "";
  }
  const call = m.call_duration != null;
  const row = el("div", "msg " + (call ? "system" : m.sender_name === me ? "mine" : "theirs"));
  row.id = "m" + i;
  if (!call && m.sender_name !== me && m.sender_name !== lastSender) row.append(el("div", "who", m.sender_name));
  lastSender = m.sender_name;
  const b = el("div", "bubble");
  let text = m.content || "";
  if (call) text = (m.call_duration ? "📞 " : "📞 Missed: ") + text + (m.call_duration ? " · " + Math.floor(m.call_duration / 60) + " min " + (m.call_duration % 60) + " s" : "");
  const t = el("span", "t", text); b.append(t);
  const item = { row, t, text: text.toLowerCase(), raw: text, m };
  for (const p of m.photos || []) {
    const a = el("a", "photo"); a.href = src(p.uri); a.target = "_blank";
    const img = el("img"); img.loading = "lazy"; img.alt = "Photo"; img.src = src(p.uri); a.append(img); b.append(a);
    const n = media.push({ uri: p.uri, kind: "photo", item }) - 1;
    a.onclick = (e) => { e.preventDefault(); openViewer(n); };
  }
  for (const v of m.videos || []) {
    const video = el("video"); video.controls = true; video.preload = "none"; video.src = src(v.uri); b.append(video);
    media.push({ uri: v.uri, kind: "video", item });
  }
  for (const s of m.audio_files || []) b.append(voice(s));
  if (m.share) {
    const s = el(/^https?:/.test(m.share.link || "") ? "a" : "span", "share", m.share.share_text || m.share.link || "Shared post");
    if (s.tagName === "A") { s.href = m.share.link; s.target = "_blank"; s.rel = "noopener noreferrer"; }
    b.append(s);
  }
  if (!text && !b.querySelector("img,video,audio,.share")) t.textContent = "(no content)";
  row.append(b, el("div", "meta", timeFmt.format(at)));
  if (m.reactions && m.reactions.length) row.append(el("div", "reacts", m.reactions.map((r) => r.reaction + " " + r.actor).join("  ")));
  const kinds = [];
  if ((m.photos || []).length) kinds.push("photo");
  if ((m.videos || []).length) kinds.push("video");
  if ((m.audio_files || []).length) kinds.push("audio");
  if (m.share || /https?:\\/\\//.test(text)) kinds.push("link");
  if (call) kinds.push("call");
  row.dataset.k = kinds.join(" ");
  section.append(row);
  items.push(item);
}

// Long chats are built in slices (about 12 ms each, off-screen, then added
// in one go) so the page shows the first messages at once and stays responsive.
async function build() {
  const status = document.getElementById("loading");
  let i = 0;
  while (i < msgs.length) {
    target = document.createDocumentFragment();
    const until = performance.now() + 12;
    do addMessage(msgs[i], i); while (++i < msgs.length && performance.now() < until);
    main.insertBefore(target, status);
    if (i < msgs.length) {
      status.textContent = "Loading " + i.toLocaleString() + " of " + msgs.length.toLocaleString() + " messages…";
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  target = main;
  status.remove();
  days = [...document.querySelectorAll(".day")];
  if (days.length) { jump.min = days[0].dataset.date; jump.max = days[days.length - 1].dataset.date; }
  document.body.dataset.ready = "1";
}

// Filters: show only messages with photos, videos, voice notes, links or calls.
const chips = [...document.querySelectorAll(".chip[data-f]")];
function filter(kind) {
  for (const c of chips) c.setAttribute("aria-pressed", String(c.dataset.f === kind));
  for (const it of items) it.row.hidden = kind !== "all" && !it.row.dataset.k.split(" ").includes(kind);
  for (const s of document.querySelectorAll(".day")) s.hidden = ![...s.querySelectorAll(".msg")].some((r) => !r.hidden);
}
for (const c of chips) c.onclick = () => { showStats(false); showGallery(false); filter(c.dataset.f); };

// Gallery: every photo and video in a grid; click one to view it full screen.
const gallery = document.getElementById("gallery"), galleryBtn = document.getElementById("galleryBtn");
function showGallery(on) {
  if (on) showStats(false);
  galleryBtn.setAttribute("aria-pressed", String(on));
  gallery.hidden = !on; main.hidden = on;
  if (!on || gallery.children.length) return;
  media.forEach((it, n) => {
    const btn = el("button"); btn.title = "View";
    const m = el(it.kind === "photo" ? "img" : "video"); m.src = src(it.uri);
    if (it.kind === "photo") { m.loading = "lazy"; m.alt = "Photo"; } else m.preload = "metadata";
    btn.append(m); if (it.kind === "video") btn.append(el("span", "kind", "▶ video"));
    btn.onclick = () => openViewer(n);
    gallery.append(btn);
  });
  if (!gallery.children.length) gallery.append(el("p", null, "No photos or videos in this chat."));
}
galleryBtn.onclick = () => showGallery(gallery.hidden);

// Insights: who writes most, when you talk, and how it changed over time.
const stats = document.getElementById("stats"), statsBtn = document.getElementById("statsBtn"), tip = document.getElementById("tip");
const nf = (n) => n.toLocaleString();
function tile(big, label, more) {
  const t = el("div", "st"); t.append(el("span", "big", big), el("span", "label", label));
  if (more) t.append(el("span", "more", more));
  return t;
}
function table(rows) {
  const d = el("details"), tb = el("table");
  d.append(el("summary", null, "Show as a table"));
  for (const [k, v] of rows) { const tr = el("tr"); tr.append(el("th", null, k), el("td", null, nf(v))); tb.append(tr); }
  d.append(tb); return d;
}
function columns(title, note, rows, first, last) {
  const box = el("div", "ch"), cols = el("div", "cols"), top = Math.max(1, ...rows.map((r) => r[1]));
  box.append(el("h3", null, title), el("p", "note", note));
  rows.forEach(([k, v], i) => {
    const b = el("div", "b"), bar = el("i");
    bar.style.setProperty("--h", (v / top) * 100 + "%"); bar.style.setProperty("--d", Math.min(i * 12, 600) + "ms");
    b.dataset.tip = k + ": " + nf(v); b.append(bar); cols.append(b);
  });
  const axis = el("div", "axis" + (rows.length <= 12 ? " each" : ""));
  if (rows.length <= 12) for (const [k] of rows) axis.append(el("span", null, k));
  else axis.append(el("span", null, first), el("span", null, last));
  box.append(cols, axis, table(rows)); return box;
}
function insights() {
  const per = new Map(), hours = Array(24).fill(0), week = Array(7).fill(0), months = new Map(), days = new Map();
  const totals = { photos: 0, videos: 0, voice: 0, links: 0, calls: 0, reactions: 0 };
  for (const m of msgs) {
    const d = new Date(m.timestamp_ms);
    totals.reactions += (m.reactions || []).length;
    if (m.call_duration != null) { totals.calls++; continue; }
    per.set(m.sender_name, (per.get(m.sender_name) || 0) + 1);
    hours[d.getHours()]++; week[(d.getDay() + 6) % 7]++;
    const mk = d.getFullYear() + "-" + pad(d.getMonth() + 1); months.set(mk, (months.get(mk) || 0) + 1);
    const dk = dayKey(d); days.set(dk, (days.get(dk) || 0) + 1);
    totals.photos += (m.photos || []).length; totals.videos += (m.videos || []).length; totals.voice += (m.audio_files || []).length;
    if (m.share || /https?:\\/\\//.test(m.content || "")) totals.links++;
  }
  stats.textContent = "";
  if (!msgs.length) { stats.append(el("p", null, "No messages in this chat.")); return; }
  // Headline facts.
  const firstMsg = msgs[0], dayList = [...days.keys()].sort();
  let best = ["", 0], run = 1, longest = [1, dayList[0], dayList[0]], start = dayList[0];
  for (const [k, v] of days) if (v > best[1]) best = [k, v];
  for (let i = 1; i < dayList.length; i++) {
    const gap = Math.round((new Date(dayList[i] + "T12:00") - new Date(dayList[i - 1] + "T12:00")) / 864e5);
    if (gap === 1) run++; else { run = 1; start = dayList[i]; }
    if (run > longest[0]) longest = [run, start, dayList[i]];
  }
  const longDay = (k) => new Date(k + "T12:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const firstText = firstMsg.content ? (firstMsg.content.length > 120 ? firstMsg.content.slice(0, 120) + "…" : firstMsg.content) : (firstMsg.photos || []).length ? "A photo" : (firstMsg.audio_files || []).length ? "A voice note" : (firstMsg.videos || []).length ? "A video" : "";
  stats.append(
    tile(nf(msgs.length), "messages", nf(days.size) + " days with messages · " + nf(Math.round(msgs.length / Math.max(1, days.size))) + " a day on those days"),
    tile(longDay(dayKey(new Date(firstMsg.timestamp_ms))), "first message", firstMsg.sender_name + (firstText ? ": “" + firstText + "”" : "")),
    tile(nf(best[1]), "messages on the busiest day", longDay(best[0])),
    tile(nf(longest[0]) + (longest[0] === 1 ? " day" : " days"), "longest daily streak", longest[0] > 1 ? longDay(longest[1]) + " – " + longDay(longest[2]) : ""),
    tile(nf(totals.photos) + " · " + nf(totals.videos), "photos · videos"),
    tile(nf(totals.voice) + " · " + nf(totals.calls), "voice notes · calls"),
    tile(nf(totals.links) + " · " + nf(totals.reactions), "links · reactions")
  );
  // Who writes most: horizontal bars, labelled.
  const people = [...per].sort((a, b) => b[1] - a[1]), topP = people[0][1];
  const pb = el("div", "ch"), rows = el("div", "rows");
  pb.append(el("h3", null, "Messages per person"), el("p", "note", people.length > 1 ? people[0][0] + " sent " + Math.round((topP / msgs.length) * 100) + "% of messages." : ""));
  people.slice(0, 12).forEach(([name, n], i) => {
    const r = el("div", "r"), track = el("div", "track"), bar = el("i");
    bar.style.setProperty("--w", (n / topP) * 100 + "%"); bar.style.setProperty("--d", i * 40 + "ms");
    track.append(bar); r.append(el("span", "who2", name), track, el("span", "n", nf(n))); rows.append(r);
  });
  pb.append(rows, table(people)); stats.append(pb);
  // When: hours and weekdays.
  const peakH = hours.indexOf(Math.max(...hours));
  stats.append(columns("Messages by hour", "Busiest hour: " + pad(peakH) + ":00–" + pad((peakH + 1) % 24) + ":00, " + nf(hours[peakH]) + " messages.", hours.map((v, h) => [pad(h) + ":00", v]), "00:00", "23:00"));
  const names = [...Array(7)].map((_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(undefined, { weekday: "short" }));
  const peakW = week.indexOf(Math.max(...week));
  stats.append(columns("Messages by weekday", "Most on " + new Date(2024, 0, 1 + peakW).toLocaleDateString(undefined, { weekday: "long" }) + "s.", week.map((v, i) => [names[i], v]), names[0], names[6]));
  // Over time: months (years for very long chats), gaps filled with zero.
  const keys = [...months.keys()].sort(), series = [];
  const [y0, m0] = keys[0].split("-").map(Number), [y1, m1] = keys[keys.length - 1].split("-").map(Number);
  const span = (y1 - y0) * 12 + (m1 - m0) + 1;
  if (span > 48) {
    for (let y = y0; y <= y1; y++) series.push([String(y), keys.filter((k) => k.startsWith(y + "-")).reduce((n, k) => n + months.get(k), 0)]);
  } else {
    for (let i = 0; i < span; i++) {
      const d = new Date(y0, m0 - 1 + i, 1), k = d.getFullYear() + "-" + pad(d.getMonth() + 1);
      series.push([d.toLocaleDateString(undefined, { month: "short", year: "numeric" }), months.get(k) || 0]);
    }
  }
  const peakT = series.reduce((a, b) => (b[1] > a[1] ? b : a));
  stats.append(columns(span > 48 ? "Messages per year" : "Messages per month", "Busiest: " + peakT[0] + ", " + nf(peakT[1]) + " messages.", series, series[0][0], series[series.length - 1][0]));
}
function showStats(on) {
  statsBtn.setAttribute("aria-pressed", String(on));
  stats.hidden = !on;
  if (on) { gallery.hidden = true; galleryBtn.setAttribute("aria-pressed", "false"); main.hidden = true; stats.classList.remove("in"); insights(); requestAnimationFrame(() => requestAnimationFrame(() => stats.classList.add("in"))); }
  else if (gallery.hidden) main.hidden = false;
}
statsBtn.onclick = () => showStats(stats.hidden);
stats.addEventListener("mouseover", (e) => {
  const b = e.target.closest("[data-tip]");
  if (!b) { tip.hidden = true; return; }
  const r = b.getBoundingClientRect();
  tip.textContent = b.dataset.tip; tip.hidden = false;
  tip.style.left = r.left + r.width / 2 + "px"; tip.style.top = r.bottom - b.firstChild.offsetHeight + "px";
});
stats.addEventListener("mouseleave", () => (tip.hidden = true));

// Full-screen viewer: arrows or ← → to move, Esc to close.
const viewer = document.getElementById("viewer"), vImg = document.getElementById("vImg"), vVideo = document.getElementById("vVideo"), vCount = document.getElementById("vCount");
let vi = -1, opener = null;
function openViewer(n) {
  if (!media.length) return;
  if (viewer.hidden) opener = document.activeElement;
  vi = (n + media.length) % media.length;
  const it = media[vi], photo = it.kind === "photo";
  vVideo.pause();
  vImg.hidden = !photo; vVideo.hidden = photo;
  if (photo) vImg.src = src(it.uri); else vVideo.src = src(it.uri);
  vCount.textContent = (vi + 1) + " of " + media.length + " · " + new Date(it.item.m.timestamp_ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  viewer.hidden = false; document.body.style.overflow = "hidden";
  document.getElementById("vClose").focus();
}
function closeViewer() { viewer.hidden = true; vVideo.pause(); document.body.style.overflow = ""; if (opener) opener.focus(); }
document.getElementById("vClose").onclick = closeViewer;
document.getElementById("vPrev").onclick = () => openViewer(vi - 1);
document.getElementById("vNext").onclick = () => openViewer(vi + 1);
document.getElementById("vShow").onclick = () => { const it = media[vi]; closeViewer(); showGallery(false); filter("all"); it.item.row.scrollIntoView({ block: "center" }); };
viewer.addEventListener("click", (e) => { if (e.target.classList.contains("stage")) closeViewer(); });
addEventListener("keydown", (e) => {
  if (viewer.hidden) return;
  if (e.key === "Escape") closeViewer();
  else if (e.key === "ArrowLeft") openViewer(vi - 1);
  else if (e.key === "ArrowRight") openViewer(vi + 1);
});

// Search: highlight every match, step through them with Enter / Shift+Enter.
const q = document.getElementById("q"), count = document.getElementById("count");
let hits = [], cur = -1, timer = 0;
function paintHit(item, needle) {
  item.t.textContent = "";
  if (!needle) { item.t.textContent = item.raw; return; }
  let from = 0, at;
  const low = item.text;
  while ((at = low.indexOf(needle, from)) !== -1) {
    item.t.append(item.raw.slice(from, at), el("mark", null, item.raw.slice(at, at + needle.length)));
    from = at + needle.length;
  }
  item.t.append(item.raw.slice(from));
}
function search() {
  const needle = q.value.trim().toLowerCase();
  for (const h of hits) { h.row.classList.remove("hit", "current"); paintHit(h, ""); }
  hits = needle ? items.filter((it) => it.text.includes(needle)) : [];
  for (const h of hits) { h.row.classList.add("hit"); paintHit(h, needle); }
  cur = -1; count.textContent = needle ? hits.length + (hits.length === 1 ? " result" : " results") : "";
  if (hits.length) go(1);
}
function go(step) {
  if (!hits.length) return;
  if (cur >= 0) hits[cur].row.classList.remove("current");
  cur = (cur + step + hits.length) % hits.length;
  hits[cur].row.classList.add("current");
  hits[cur].row.scrollIntoView({ block: "center" });
  count.textContent = (cur + 1) + " of " + hits.length;
}
q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 200); });
q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); go(e.shiftKey ? -1 : 1); } });
document.getElementById("next").onclick = () => go(1);
document.getElementById("prev").onclick = () => go(-1);

// Jump to the first day on or after the chosen date.
const jump = document.getElementById("jump");
jump.addEventListener("change", () => {
  const target = days.find((d) => d.dataset.date >= jump.value) || days[days.length - 1];
  if (target) target.scrollIntoView({ block: "start" });
});

// Print, or save as PDF: load every photo first so none prints blank.
function loadAll() {
  const imgs = [...document.querySelectorAll(".bubble img")];
  for (const i of imgs) i.loading = "eager";
  return Promise.race([Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))), new Promise((r) => setTimeout(r, 8000))]);
}
addEventListener("beforeprint", loadAll);
document.getElementById("print").onclick = async () => { await loadAll(); print(); };

build();
`;

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// JSON inside <script> must not be able to close the tag.
const scriptJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

/**
 * The offline page for a chat whose media uris are relative to the archive
 * root. `base` reaches the root from the page (e.g. "../"); `back` links to
 * the list of chats in a multi-chat archive; `waves` maps a voice note's uri
 * to its waveform (numbers 0–1).
 */
export function chatPage(chat, { exportedAt = new Date(), base = "", back = "", waves = {} } = {}) {
  const msgs = chat.messages || [];
  const first = msgs.length ? new Date(msgs[msgs.length - 1].timestamp_ms) : null;
  const last = msgs.length ? new Date(msgs[0].timestamp_ms) : null;
  const span = first ? `${first.toLocaleDateString("en-GB")} – ${last.toLocaleDateString("en-GB")}` : "";
  const people = (chat.participants || []).map((p) => p.name).join(", ");
  const mine = {};
  for (const m of msgs) for (const a of m.audio_files || []) if (waves[a.uri]) mine[a.uri] = waves[a.uri];
  const title = escapeHtml(chat.title || "Instagram chat");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — chat</title>
<style>${CSS}</style></head>
<body data-base="${escapeHtml(base)}">
<header><div>${back ? `<a class="back" href="${escapeHtml(back)}">← All chats</a>` : ""}<h1>${title}</h1><p>${escapeHtml(people)} · ${msgs.length} messages${span ? " · " + span : ""}</p></div>
<div class="tools"><input id="q" type="search" placeholder="Search messages" aria-label="Search messages"><span id="count" aria-live="polite"></span>
<button id="prev" title="Previous result (Shift+Enter)" aria-label="Previous result">↑</button><button id="next" title="Next result (Enter)" aria-label="Next result">↓</button>
<input id="jump" type="date" aria-label="Jump to date" title="Jump to date"><button id="print" title="Print the chat as a book, or save it as a PDF">Print / PDF</button></div>
<div class="chips" role="toolbar" aria-label="Show"><button class="chip" data-f="all" aria-pressed="true">All</button><button class="chip" data-f="photo" aria-pressed="false">Photos</button><button class="chip" data-f="video" aria-pressed="false">Videos</button><button class="chip" data-f="audio" aria-pressed="false">Voice notes</button><button class="chip" data-f="link" aria-pressed="false">Links</button><button class="chip" data-f="call" aria-pressed="false">Calls</button><button class="chip" id="galleryBtn" aria-pressed="false">Gallery</button><button class="chip" id="statsBtn" aria-pressed="false">Insights</button></div></header>
<section class="cover" aria-hidden="true"><h1>${title}</h1><p>${escapeHtml(people)}</p><p>${span}</p><p>${msgs.length} messages</p><small>Kept on ${escapeHtml(exportedAt.toLocaleDateString("en-GB"))}</small></section>
<main id="chat"><p id="loading">Loading…</p></main>
<section id="gallery" hidden aria-label="Photos and videos"></section>
<section id="stats" hidden aria-label="Chat insights"></section><div id="tip" hidden></div>
<div id="viewer" hidden role="dialog" aria-modal="true" aria-label="Photo and video viewer">
<div class="bar"><span id="vCount"></span><span><button id="vShow">Show in chat</button> <button id="vClose" aria-label="Close (Esc)">Close</button></span></div>
<div class="stage"><button id="vPrev" aria-label="Previous (←)">←</button><div><img id="vImg" alt="Photo"><video id="vVideo" controls hidden></video></div><button id="vNext" aria-label="Next (→)">→</button></div>
</div>
<footer>Exported with Kept on ${escapeHtml(exportedAt.toLocaleString("en-GB"))}. Opens offline; media comes from the folders next to this file.</footer>
<script type="application/json" id="data">${scriptJson(chat)}</script>
<script type="application/json" id="waves">${scriptJson(mine)}</script>
<script>${JS}</script>
</body></html>
`;
}

/** The front page of a multi-chat archive: every chat, with a search box. */
export function inboxPage(chats, { exportedAt = new Date() } = {}) {
  const rows = chats.map((chat, i) => {
    const msgs = chat.messages || [];
    const span = msgs.length ? `${new Date(msgs[msgs.length - 1].timestamp_ms).toLocaleDateString("en-GB")} – ${new Date(msgs[0].timestamp_ms).toLocaleDateString("en-GB")}` : "";
    const people = (chat.participants || []).map((p) => p.name).join(", ");
    return `<li data-q="${escapeHtml((chat.title + " " + people).toLowerCase())}"><a href="chats/${String(i + 1).padStart(3, "0")}.html"><span><strong>${escapeHtml(chat.title || "Instagram chat")}</strong><br><small>${escapeHtml(people)}</small></span><small>${msgs.length} messages<br>${span}</small></a></li>`;
  });
  const total = chats.reduce((n, c) => n + (c.messages || []).length, 0);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instagram chats — ${chats.length}</title>
<style>${CSS}</style></head>
<body>
<header><div><h1>Instagram chats</h1><p>${chats.length} chats · ${total} messages</p></div>
<div class="tools"><input id="q" type="search" placeholder="Find a chat" aria-label="Find a chat"></div></header>
<ul class="list" id="list">${rows.join("")}</ul>
<footer>Exported with Kept on ${escapeHtml(exportedAt.toLocaleString("en-GB"))}. Opens offline.</footer>
<script>
const q = document.getElementById("q"), rows = [...document.querySelectorAll("#list li")];
q.addEventListener("input", () => { const v = q.value.trim().toLowerCase(); for (const r of rows) r.hidden = !!v && !r.dataset.q.includes(v); });
</script>
</body></html>
`;
}
