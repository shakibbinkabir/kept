// node brand/build.mjs — redraws the Kept brand kit: brand/*.svg, the promo and social images, and icons/*.png.
// Needs @resvg/resvg-js (npm i --no-save @resvg/resvg-js). Writes a proof sheet to your temp folder.
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = process.env.KEPT_REPO || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const HERE = os.tmpdir() + path.sep;
const C = { ink: "#1B262C", deep: "#0F4C75", sky: "#3282B8", ice: "#BBE1FA" };
const r1 = (n) => Math.round(n * 10) / 10;

// The Keeper ring: an open ring (round caps) with the gem held in its gap.
// a1/a2 are the ring's end angles in degrees (0 = right, negative = up).
function ring({ cx = 128, cy = 128, R = 74, sw = 38, a1 = 2.6, a2 = -82.6, gem = 24, gemAt = -40, gemOut = 0, ringC, gemC }) {
  const p = (a, r = R) => [r1(cx + r * Math.cos((a * Math.PI) / 180)), r1(cy + r * Math.sin((a * Math.PI) / 180))];
  const [x1, y1] = p(a1), [x2, y2] = p(a2), [gx, gy] = p(gemAt, R + gemOut);
  return `<path d="M${x1} ${y1}A${R} ${R} 0 1 1 ${x2} ${y2}" fill="none" stroke="${ringC}" stroke-width="${sw}" stroke-linecap="round"/><circle cx="${gx}" cy="${gy}" r="${gem}" fill="${gemC}"/>`;
}
// Small-size cut: heavier ring, bigger gem, wider gap so they stay apart at 16 px.
const SMALL = { R: 66, sw: 50, a1: 26, a2: -106, gem: 29, gemOut: 10 };

const svg = (w, h, body, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${extra}>${body}</svg>\n`;
const tile = (size, cut = {}, pad = 0) => {
  const s = size - pad * 2;
  return `<rect x="${pad}" y="${pad}" width="${s}" height="${s}" rx="${r1(s * 0.23)}" fill="${C.ink}"/><g transform="translate(${pad} ${pad}) scale(${r1(s / 256 * 1000) / 1000})">${ring({ ...cut, ringC: C.ice, gemC: C.sky })}</g>`;
};

// "kept", built from the same round strokes as the ring; the e is an open ring too.
// Baseline 170, x-height top 70, ascender 20, descender 220, stroke 22.
function wordmark(color) {
  const sw = 24, k = 12, e = 170, p = 268, t = 437;
  const c45 = r1(50 * Math.cos(Math.PI / 4));
  const d = [
    `M${k} 20V170`, // k stem
    `M${k + 58} 70L${k} 128`, // k arm
    `M${k + 22} 107L${k + 63} 170`, // k leg
    `M${e - 50} 120H${e + 50}`, // e bar
    `M${e + 50} 120A50 50 0 1 0 ${r1(e + c45)} ${r1(120 + c45)}`, // e bowl, open at the lower right
    `M${p} 70V220`, // p stem
    `M${p} 120A50 50 0 1 1 ${p} 120.01Z`, // p bowl
    `M${t} 35V140A30 30 0 0 0 ${t + 30} 170`, // t stem with a round foot
    `M${t - 28} 70H${t + 34}`, // t bar
  ].join("");
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const WM = { w: 496, h: 244 }; // wordmark box incl. caps

const lockup = (ringC, gemC, textC) => {
  // Mark 256 high; wordmark scaled so its x-height sits inside the ring's height.
  const s = 0.86;
  return svg(256 + 40 + Math.round(WM.w * s), 256, `${ring({ ringC, gemC })}<g transform="translate(${256 + 40} ${Math.round((256 - WM.h * s) / 2) + 10}) scale(${s})">${wordmark(textC)}</g>`);
};

const out = {
  "brand/mark.svg": svg(256, 256, ring({ ringC: C.deep, gemC: C.sky })),
  "brand/mark-on-dark.svg": svg(256, 256, ring({ ringC: C.ice, gemC: C.sky })),
  "brand/mark-small.svg": svg(256, 256, ring({ ...SMALL, ringC: C.deep, gemC: C.sky })),
  "brand/tile.svg": svg(256, 256, tile(256)),
  "brand/tile-small.svg": svg(256, 256, tile(256, SMALL)),
  "brand/wordmark.svg": svg(WM.w, WM.h, `<g transform="translate(0 0)">${wordmark(C.ink)}</g>`),
  "brand/wordmark-on-dark.svg": svg(WM.w, WM.h, wordmark(C.ice)),
  "brand/lockup.svg": lockup(C.deep, C.sky, C.ink),
  "brand/lockup-on-dark.svg": lockup(C.ice, C.sky, C.ice),
};
for (const [f, s] of Object.entries(out)) fs.writeFileSync(`${REPO}/${f}`, s);

const png = (s, size, bg = "rgba(0,0,0,0)") => new Resvg(s, { fitTo: { mode: "width", value: size }, background: bg }).render().asPng();
// Toolbar / store icons: the small cut full-bleed at 16 and 32, the regular cut with a margin above.
fs.writeFileSync(`${REPO}/icons/icon16.png`, png(svg(256, 256, tile(256, SMALL)), 16));
fs.writeFileSync(`${REPO}/icons/icon32.png`, png(svg(256, 256, tile(256, SMALL)), 32));
fs.writeFileSync(`${REPO}/icons/icon48.png`, png(svg(256, 256, tile(256, {}, 6)), 48));
fs.writeFileSync(`${REPO}/icons/icon128.png`, png(svg(256, 256, tile(256, {}, 16)), 128));
fs.writeFileSync(`${REPO}/icons/icon256.png`, png(svg(256, 256, tile(256, {}, 16)), 256));

// Store small promo tile 440x280: ink, mark + wordmark in ice.
const promo = svg(440, 280, `<rect width="440" height="280" fill="${C.ink}"/><g transform="translate(70 92) scale(0.375)">${ring({ ringC: C.ice, gemC: C.sky })}</g><g transform="translate(184 100) scale(0.42)">${wordmark(C.ice)}</g>`);
fs.writeFileSync(`${REPO}/brand/promo-440x280.svg`, promo);
fs.writeFileSync(`${REPO}/brand/promo-440x280.png`, png(promo, 440));

// Social preview 1200x630 for the website.
const og = svg(1200, 630, `<rect width="1200" height="630" fill="${C.ink}"/><g transform="translate(137 148) scale(1.3)">${ring({ ringC: C.ice, gemC: C.sky })}</g><g transform="translate(517 193) scale(1.1)">${wordmark(C.ice)}</g>`);
fs.writeFileSync(`${REPO}/brand/og.png`, png(og, 1200));

// Proof sheet: every asset, plus true-size icons on light and dark toolbars.
const img = (f, x, y, w, h, bg) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${bg}"/><image href="data:image/svg+xml;base64,${Buffer.from(out[f] || fs.readFileSync(`${REPO}/${f}`, "utf8")).toString("base64")}" x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}"/>`;
const ico = (n, x, y) => `<image href="data:image/png;base64,${fs.readFileSync(`${REPO}/icons/icon${n}.png`).toString("base64")}" x="${x}" y="${y}" width="${n}" height="${n}"/>`;
const sheet = svg(1200, 760, `<rect width="1200" height="760" fill="#E9EDF0"/>
${img("brand/mark.svg", 30, 30, 200, 200, "#fff")}${img("brand/mark-on-dark.svg", 250, 30, 200, 200, C.ink)}${img("brand/tile.svg", 470, 30, 200, 200, "#fff")}${img("brand/tile-small.svg", 690, 30, 200, 200, "#fff")}
${img("brand/lockup.svg", 30, 260, 560, 200, "#fff")}${img("brand/lockup-on-dark.svg", 610, 260, 560, 200, C.ink)}
${img("brand/promo-440x280.svg", 30, 490, 380, 250, "#fff")}
<rect x="440" y="490" width="360" height="110" rx="12" fill="#F3F3F3"/>${ico(16, 470, 520)}${ico(32, 500, 512)}${ico(48, 550, 504)}${ico(128, 620, 480)}
<rect x="440" y="620" width="360" height="110" rx="12" fill="#202124"/>${ico(16, 470, 650)}${ico(32, 500, 642)}${ico(48, 550, 634)}
`);
fs.writeFileSync(`${HERE}kept-sheet.png`, png(sheet, 1200, "#E9EDF0"));
console.log("ok · proof sheet:", `${HERE}kept-sheet.png`);
