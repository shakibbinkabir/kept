// src/mp4mux.js
//
// Instagram keeps its best video as two separate fragmented MP4 files (DASH):
// one video-only, one audio-only. muxDash() joins them into a single MP4 with
// both tracks, without re-encoding: the audio track becomes track 2, the two
// movie headers are merged, and the fragments are interleaved by time.
// Pure; test/mp4mux.test.mjs checks it.

const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u64 = (b, o) => Number((BigInt(u32(b, o)) << 32n) | BigInt(u32(b, o + 4)));
const put32 = (b, o, v) => { b[o] = v >>> 24; b[o + 1] = (v >>> 16) & 255; b[o + 2] = (v >>> 8) & 255; b[o + 3] = v & 255; };
const put64 = (b, o, v) => { put32(b, o, Math.floor(v / 2 ** 32)); put32(b, o + 4, v >>> 0); };

/** The boxes between start and end: [{ type, start, size, head }]. */
export function boxes(b, start = 0, end = b.length) {
  const out = [];
  for (let o = start; o + 8 <= end; ) {
    let size = u32(b, o);
    let head = 8;
    if (size === 1) { size = u64(b, o + 8); head = 16; }
    else if (size === 0) size = end - o;
    if (size < head || o + size > end) break;
    out.push({ type: String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]), start: o, size, head });
    o += size;
  }
  return out;
}
const kids = (b, box) => boxes(b, box.start + box.head, box.start + box.size);
const kid = (b, box, type) => kids(b, box).find((x) => x.type === type);
const copy = (b, box) => b.slice(box.start, box.start + box.size);
const whole = (b) => ({ start: 0, size: b.length, head: 8 });

function wrap(type, parts) {
  const size = 8 + parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(size);
  put32(out, 0, size);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  let o = 8;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function parse(b) {
  const top = boxes(b);
  const ftyp = top.find((x) => x.type === "ftyp");
  const moov = top.find((x) => x.type === "moov");
  if (!moov) throw new Error("Not an MP4 file.");
  const trak = kid(b, moov, "trak");
  const mvex = kid(b, moov, "mvex");
  const mdhd = kid(b, kid(b, trak, "mdia"), "mdhd");
  const timescale = u32(b, mdhd.start + 8 + (b[mdhd.start + 8] === 1 ? 20 : 12)) || 1;
  const frags = [];
  // The file's length in seconds, from its segment index (sidx).
  let duration = 0;
  for (const sidx of top.filter((x) => x.type === "sidx")) {
    const o = sidx.start + 8;
    const scale = u32(b, o + 8) || 1;
    const p = o + (b[o] === 1 ? 32 : 24); // entries start after the reference count
    const count = (b[p - 2] << 8) | b[p - 1];
    let sum = 0;
    for (let i = 0; i < count; i++) sum += u32(b, p + i * 12 + 4);
    duration = Math.max(duration, sum / scale);
  }
  top.forEach((box, i) => {
    const next = top[i + 1];
    if (box.type !== "moof" || next?.type !== "mdat") return;
    const traf = kid(b, box, "traf");
    const tfdt = traf && kid(b, traf, "tfdt");
    const t = !tfdt ? 0 : b[tfdt.start + 8] === 1 ? u64(b, tfdt.start + 12) : u32(b, tfdt.start + 12);
    frags.push({ moof: copy(b, box), mdat: copy(b, next), time: t / timescale });
  });
  return {
    ftyp: ftyp && copy(b, ftyp),
    mvhd: copy(b, kid(b, moov, "mvhd")),
    trak: copy(b, trak),
    trex: mvex && kid(b, mvex, "trex") && copy(b, kid(b, mvex, "trex")),
    mehd: mvex && kid(b, mvex, "mehd") && copy(b, kid(b, mvex, "mehd")),
    frags,
    duration,
  };
}

function setTrack(t, id) {
  const tkhd = kid(t.trak, whole(t.trak), "tkhd");
  put32(t.trak, tkhd.start + 8 + (t.trak[tkhd.start + 8] === 1 ? 20 : 12), id);
  if (t.trex) put32(t.trex, 12, id);
  for (const f of t.frags) {
    const tfhd = kid(f.moof, kid(f.moof, whole(f.moof), "traf"), "tfhd");
    put32(f.moof, tfhd.start + 12, id);
  }
}

/** Join a video-only and an audio-only fragmented MP4 into one file. */
export function muxDash(video, audio) {
  const v = parse(video);
  const a = parse(audio);
  if (!v.trex || !a.trex || !v.frags.length || !a.frags.length) throw new Error("Not a fragmented MP4 pair.");
  setTrack(v, 1);
  setTrack(a, 2);
  const mvhd = v.mvhd.slice();
  const v1 = mvhd[8] === 1;
  put32(mvhd, 8 + (v1 ? 108 : 96), 3); // next_track_ID
  // The whole length, so players show the right duration and can seek:
  // in the movie header and a movie-extends header (mehd).
  const scale = u32(mvhd, 8 + (v1 ? 20 : 12)) || 1000;
  const length = Math.round(Math.max(v.duration, a.duration) * scale);
  if (length) v1 ? put64(mvhd, 8 + 24, length) : put32(mvhd, 8 + 16, Math.min(length, 0xffffffff));
  const mehd = length ? wrap("mehd", [Uint8Array.of(1, 0, 0, 0), new Uint8Array(8)]) : v.mehd;
  if (length) put64(mehd, 12, length);
  const moov = wrap("moov", [mvhd, v.trak, a.trak, wrap("mvex", [...(mehd ? [mehd] : []), v.trex, a.trex])]);
  const frags = [...v.frags, ...a.frags].sort((x, y) => x.time - y.time);
  const parts = [v.ftyp || a.ftyp, moov].filter(Boolean);
  let offset = parts.reduce((n, p) => n + p.length, 0);
  frags.forEach((f, i) => {
    put32(f.moof, kid(f.moof, whole(f.moof), "mfhd").start + 12, i + 1); // sequence number
    const tfhd = kid(f.moof, kid(f.moof, whole(f.moof), "traf"), "tfhd");
    if (f.moof[tfhd.start + 11] & 1) put64(f.moof, tfhd.start + 16, offset); // absolute base offset → this moof
    parts.push(f.moof, f.mdat);
    offset += f.moof.length + f.mdat.length;
  });
  const out = new Uint8Array(offset);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/**
 * From an item's DASH manifest, the best video and the audio file — only when
 * the video beats the best ordinary MP4 (progressiveHeight). Else null.
 */
export function bestDash(manifest, progressiveHeight = 0) {
  if (!manifest) return null;
  const reps = [...manifest.matchAll(/<Representation\b([^>]*)>([\s\S]*?)<\/Representation>/g)].map(([, attrs, body]) => ({
    mime: attrs.match(/\smimeType="([^"]+)"/)?.[1] || "",
    height: Number(attrs.match(/\sheight="(\d+)"/)?.[1] || 0),
    bandwidth: Number(attrs.match(/\sbandwidth="(\d+)"/)?.[1] || 0),
    url: (body.match(/<BaseURL>([^<]+)<\/BaseURL>/)?.[1] || "").replace(/&amp;/g, "&"),
  })).filter((r) => r.url);
  const video = reps.filter((r) => r.mime.startsWith("video/")).sort((x, y) => y.height - x.height || y.bandwidth - x.bandwidth)[0];
  const audio = reps.filter((r) => r.mime.startsWith("audio/")).sort((x, y) => y.bandwidth - x.bandwidth)[0];
  if (!video || video.height <= progressiveHeight) return null;
  return { video: video.url, audio: audio?.url || null, height: video.height };
}
