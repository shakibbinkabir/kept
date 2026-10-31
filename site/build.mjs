// node site/build.mjs — builds the website into site/public from the repo's own files:
// the feature status table in README.md, CHANGELOG.md and PRIVACY.md.
import fs from "node:fs";
import path from "node:path";

const SITE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const ROOT = path.join(SITE, "..");
const OUT = path.join(SITE, "public");
const REPO = "https://github.com/shakibbinkabir/kept";
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ===== a small Markdown subset: headings, paragraphs, lists, tables, bold, code, links ===== */
function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${/^(https?:|#|mailto:)/.test(u) ? u : `${REPO}/blob/main/${u}`}">${t}</a>`);
}
export function markdown(md) {
  const out = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));
      const body = rows.slice(2).map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
      out.push(`<table><thead><tr>${cells(rows[0]).map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }
    const list = line.match(/^(\s*)([-*]|\d+\.)\s+/);
    if (list) {
      const tag = /\d/.test(list[2]) ? "ol" : "ul";
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

/* ===== the status table ===== */
const ABOUT = [
  [/^DM capture/, "Chats with their media", "Every message in a chat, with photos, videos and voice notes as files, and the offline page to read it."],
  [/^Several chats/, "Several chats and the inbox", "Pick chats from your list, or every chat in your inbox and message requests, with an optional date range."],
  [/^Posts/, "Posts, images and reels", "Everything on a profile, the latest few, the oldest, or a date range, each post with its caption."],
  [/^Current stories/, "Stories", "The stories an account has up right now, before they disappear."],
  [/^Story highlights/, "Highlights", "Every highlight in its own folder, or just the one you have open."],
  [/^Profile picture/, "Profile picture", "The full-size picture, saved as it is."],
  [/^Single post/, "One post or reel", "The post or reel open in your tab, including private ones you follow."],
  [/^Folder saves/, "Folders, only new, resume", "Files straight into a folder with no size limit, skipping what you saved before."],
  [/^Saved posts/, "Your saved posts", "All your saved posts, one collection or every collection, each post with its author, link, date and caption."],
  [/^Tagged posts/, "Tagged posts and your archive", "Posts an account is tagged in, your own archived stories by month, and highlight covers."],
  [/^Followers and following/, "Followers and following", "Your followers and following as CSV, with who doesn't follow back and who followed or unfollowed since last time."],
  [/^Save button/, "Save button and best quality", "A save button on photos and videos on instagram.com, videos up to 1080p with sound, and images as JPG."],
  [/^Choose posts/, "Choosing what to export", "A grid of an account's posts or highlights: tick the ones you want, export only those, and browse them offline in a gallery."],
];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function status() {
  const readme = read("README.md");
  const rows = readme.split("\n").filter((l) => /^\| .* \| (✅|⚠️|❌)/.test(l)).map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  const items = [];
  for (const [feature, state, when] of rows) {
    const about = ABOUT.find(([re]) => re.test(feature));
    if (!about) continue;
    const [y, m, d] = (when.match(/\d{4}-\d{2}-\d{2}/) || ["0000-01-01"])[0].split("-").map(Number);
    const label = state.replace(/^\S+\s*/, "") || "Working";
    items.push({ order: ABOUT.indexOf(about), name: about[1], about: about[2], label, date: `${months[m - 1]} ${d}`, year: y });
  }
  items.sort((a, b) => a.order - b.order);
  const checked = items.length ? `${items[0].date}, ${items[0].year}` : "";
  return {
    checked,
    rows: items.map((it) => `<li tabindex="0"><div class="row-head">${esc(it.name)}<span>${esc(it.label)} · ${esc(it.date)}</span></div><div class="row-body"><p>${esc(it.about)}</p></div></li>`).join(""),
    checks: items.map((it) => `<li><i></i>${esc(it.name)}</li>`).join(""),
  };
}

/* ===== picture credits ===== */
function credits() {
  const list = JSON.parse(fs.readFileSync(path.join(SITE, "assets/credits.json"), "utf8"));
  const parts = list.map((c) => {
    const by = c.creator && !/unidentified|unknown/i.test(c.creator) ? ` by ${esc(c.creator)}` : "";
    return `<a href="${esc(c.page)}">“${esc(c.title)}”</a>${by}, <a href="${esc(c.licenseUrl)}">${esc(c.license)}</a>`;
  });
  return `Pictures: ${parts.join("; ")}, via Wikimedia Commons. Shown as examples of how people kept things before chats; the photo in the sample chat is a painting, not a real message.`;
}

/* ===== build ===== */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.mkdirSync(path.join(OUT, "fonts"), { recursive: true });
const version = JSON.parse(read("manifest.json")).version;
const s = status();
const fill = (html, vars) => html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
const vars = { REPO, VERSION: version, CHECKED: s.checked, STATUS_ROWS: s.rows, CHECK_ROWS: s.checks, CREDITS: credits() };

fs.writeFileSync(path.join(OUT, "index.html"), fill(fs.readFileSync(path.join(SITE, "index.html"), "utf8"), vars));
const page = fs.readFileSync(path.join(SITE, "page.html"), "utf8");
for (const [file, md, title] of [["changelog.html", "CHANGELOG.md", "Changelog"], ["privacy.html", "PRIVACY.md", "Privacy"]]) {
  const body = markdown(read(md).replace(/\bIG Exporter\b/g, "Kept"));
  fs.writeFileSync(path.join(OUT, file), fill(page, { ...vars, TITLE: title, CONTENT: body }));
}
for (const f of ["style.css", "main.js", "ring.js"]) fs.copyFileSync(path.join(SITE, f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(SITE, "assets"))) if (/\.(jpg|png|webp)$/.test(f)) fs.copyFileSync(path.join(SITE, "assets", f), path.join(OUT, "assets", f));
for (const f of ["manrope-latin.woff2", "manrope-latin-ext.woff2", "OFL.txt"]) fs.copyFileSync(path.join(ROOT, "fonts", f), path.join(OUT, "fonts", f));
fs.copyFileSync(path.join(ROOT, "brand/tile.svg"), path.join(OUT, "favicon.svg"));
fs.copyFileSync(path.join(ROOT, "brand/mark-on-dark.svg"), path.join(OUT, "mark-on-dark.svg"));
if (fs.existsSync(path.join(ROOT, "brand/og.png"))) fs.copyFileSync(path.join(ROOT, "brand/og.png"), path.join(OUT, "og.png"));
fs.writeFileSync(path.join(OUT, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; frame-ancestors 'none'\n");
console.log(`built site/public (v${version}, ${s.rows.split("<li").length - 1} status rows)`);
