// node firefox/build.mjs — the Firefox build: dist/firefox/ and dist/kept-firefox-<version>.zip.
// Same code as the Chrome extension; only the manifest differs (a background
// page instead of a service worker plus offscreen document, and a gecko id).
import fs from "node:fs";
import path from "node:path";
import { createZip } from "../src/zip.js";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const OUT = path.join(ROOT, "dist", "firefox");
const SHIP = ["manifest.json", "background.js", "offscreen.js", "popup.html", "popup.js", "center.html", "center.js", "pick.html", "pick.js", "LICENSE", "PRIVACY.md"];
const DIRS = ["src", "styles", "fonts", "icons", "firefox", "_locales"];

const files = [...SHIP, ...DIRS.flatMap(function walk(d) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) return [];
  return fs.statSync(abs).isDirectory() ? fs.readdirSync(abs).flatMap((f) => walk(path.join(d, f))) : [d];
})].filter((f) => !/build\.mjs$|\.ps1$/.test(f));

for (const f of files) {
  const text = /\.(js|json|html)$/.test(f) ? fs.readFileSync(path.join(ROOT, f), "utf8") : "";
  if (/E2E TEMP|e2e-hook|igx-e2e/.test(text)) throw new Error(`Test hooks found in ${f}; remove them before building.`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
manifest.background = { scripts: ["firefox/background.js"], type: "module" };
manifest.permissions = manifest.permissions.filter((p) => p !== "offscreen");
// Kept sends nothing anywhere, which Firefox asks extensions to declare.
manifest.browser_specific_settings = { gecko: { id: "kept@thisissbk.com", strict_min_version: "140.0", data_collection_permissions: { required: ["none"] } } };

fs.rmSync(OUT, { recursive: true, force: true });
const entries = [];
for (const f of files) {
  const dest = path.join(OUT, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const bytes = f === "manifest.json" ? Buffer.from(JSON.stringify(manifest, null, 2) + "\n") : fs.readFileSync(path.join(ROOT, f));
  fs.writeFileSync(dest, bytes);
  entries.push({ path: f.replace(/\\/g, "/"), bytes: new Uint8Array(bytes) });
}
const zip = path.join(ROOT, "dist", `kept-firefox-${manifest.version}.zip`);
fs.writeFileSync(zip, createZip(entries));
console.log(`built ${path.relative(ROOT, OUT)} (${entries.length} files) and ${path.relative(ROOT, zip)}`);
