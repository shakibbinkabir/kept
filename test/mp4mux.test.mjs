// Self-check for src/mp4mux.js: node test/mp4mux.test.mjs
// Builds two tiny synthetic fragmented MP4s (one track each, both track 1),
// joins them, and checks the structure of the result.
import assert from "node:assert";
import { muxDash, boxes, bestDash } from "../src/mp4mux.js";

const box = (type, ...parts) => {
  const body = parts.flatMap((p) => [...p]);
  const size = 8 + body.length;
  return Uint8Array.from([size >>> 24, (size >>> 16) & 255, (size >>> 8) & 255, size & 255, ...[...type].map((c) => c.charCodeAt(0)), ...body]);
};
const n32 = (v) => [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const zeros = (n) => new Array(n).fill(0);
const full = (type, version, flags, ...rest) => box(type, [version, (flags >>> 16) & 255, (flags >>> 8) & 255, flags & 255], ...rest);

function sidx(timescale, seconds) {
  // version 0: reference_ID, timescale, earliest time, first offset, reserved, one reference
  return full("sidx", 0, 0, n32(1), n32(timescale), n32(0), n32(0), [0, 0, 0, 1], n32(100), n32(seconds * timescale), n32(0x90000000));
}

function file(timescale, times, marker) {
  const mvhd = full("mvhd", 0, 0, zeros(96), n32(2)); // ...next_track_ID = 2
  const tkhd = full("tkhd", 0, 0, zeros(8), n32(1), zeros(68)); // track_ID = 1
  const mdhd = full("mdhd", 0, 0, zeros(8), n32(timescale), zeros(8));
  const trak = box("trak", tkhd, box("mdia", mdhd));
  const trex = full("trex", 0, 0, n32(1), zeros(16));
  const moov = box("moov", mvhd, trak, box("mvex", trex));
  const frags = times.flatMap((t, i) => [
    box("moof", full("mfhd", 0, 0, n32(i + 1)), box("traf", full("tfhd", 0, 0x020000, n32(1)), full("tfdt", 0, 0, n32(t * timescale)))),
    box("mdat", [marker, i]),
  ]);
  const parts = [box("ftyp", [...Buffer.from("iso6")]), moov, sidx(timescale, times[times.length - 1] + 1), ...frags];
  return Uint8Array.from(parts.flatMap((p) => [...p]));
}

const video = file(90000, [0, 2, 4], 0x56);
const audio = file(44100, [0, 1, 2, 3, 4, 5], 0x41);
const out = muxDash(video, audio);
const top = boxes(out);
assert.deepEqual(top.slice(0, 2).map((b) => b.type), ["ftyp", "moov"]);
const moov = top[1];
const inside = boxes(out, moov.start + 8, moov.start + moov.size);
assert.deepEqual(inside.map((b) => b.type), ["mvhd", "trak", "trak", "mvex"], "one movie header, both tracks");
const mvex = inside[3];
const mehd = boxes(out, mvex.start + 8, mvex.start + mvex.size)[0];
assert.equal(mehd.type, "mehd", "a movie-extends header carries the length");
// mvhd timescale is 0 in the synthetic file, so the default 1000 applies: 6 s → 6000.
assert.equal(Number(new DataView(out.buffer, mehd.start + 12, 8).getBigUint64(0)), 6000, "length = the longer track (audio, 6 s)");
const trackIds = inside.filter((b) => b.type === "trak").map((t) => {
  const tkhd = boxes(out, t.start + 8, t.start + t.size)[0];
  return (out[tkhd.start + 20] << 24) | (out[tkhd.start + 21] << 16) | (out[tkhd.start + 22] << 8) | out[tkhd.start + 23];
});
assert.deepEqual(trackIds, [1, 2], "audio renumbered to track 2");

// Fragments interleaved by time, sequence numbers 1..n, audio fragments on track 2.
const order = [];
let seq = 0;
for (let i = 2; i < top.length; i += 2) {
  assert.equal(top[i].type, "moof");
  assert.equal(top[i + 1].type, "mdat");
  const moofKids = boxes(out, top[i].start + 8, top[i].start + top[i].size);
  const s = out[moofKids[0].start + 15];
  assert.equal(s, ++seq, "sequence numbers count up");
  const tfhd = boxes(out, moofKids[1].start + 8, moofKids[1].start + moofKids[1].size)[0];
  const track = out[tfhd.start + 15];
  const marker = out[top[i + 1].start + 8];
  assert.equal(track, marker === 0x41 ? 2 : 1, "each fragment carries its own track id");
  order.push(marker === 0x41 ? "A" : "V");
}
assert.equal(order.filter((x) => x === "V").length, 3);
assert.equal(order.filter((x) => x === "A").length, 6);
assert.ok(order.indexOf("A") < order.lastIndexOf("V"), "audio is interleaved, not appended");

// Picking the best DASH video, only when it beats the ordinary MP4.
const manifest = `<MPD><Period><AdaptationSet><Representation id="a" mimeType="video/mp4" bandwidth="500" width="720" height="1280"><BaseURL>https://x/v720.mp4?a=1&amp;b=2</BaseURL></Representation>
<Representation id="b" mimeType="video/mp4" bandwidth="1400" width="1080" height="1920"><BaseURL>https://x/v1080.mp4</BaseURL></Representation></AdaptationSet>
<AdaptationSet><Representation id="c" mimeType="audio/mp4" bandwidth="80"><BaseURL>https://x/a.mp4</BaseURL></Representation></AdaptationSet></Period></MPD>`;
assert.deepEqual(bestDash(manifest, 1280), { video: "https://x/v1080.mp4", audio: "https://x/a.mp4", height: 1920 });
assert.equal(bestDash(manifest, 1920), null, "no better than the ordinary file");
assert.equal(bestDash("", 0), null);

console.log("mp4mux ok");
