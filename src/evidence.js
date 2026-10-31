// src/evidence.js
//
// Evidence mode: alongside an export, a list of every file with its size and
// SHA-256 (in the format `sha256sum -c` checks), one fingerprint for the whole
// export (the SHA-256 of that list), what was exported, by which account,
// when and in which timezone, and a log of the export. Pure apart from the
// hashing, which uses Web Crypto; test/evidence.test.mjs checks it.

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async (bytes) => hex(await crypto.subtle.digest("SHA-256", bytes));

/**
 * @param files [{ path, size, sha256 }] every file in the export
 * @param context { tool, version, mode, source, exportedBy, startedAt, finishedAt, timezone, userAgent, counts }
 * @param log [{ at, text }]
 * @returns Promise<{ fingerprint, files: [{ path, text }] }> the evidence/ files to add
 */
export async function evidenceFiles(files, context, log) {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const list = sorted.map((f) => `${f.sha256}  ${f.path}`).join("\n") + "\n";
  const fingerprint = await sha256(new TextEncoder().encode(list));
  const iso = (t) => new Date(t).toISOString();
  const record = {
    ...context,
    startedAt: iso(context.startedAt),
    finishedAt: iso(context.finishedAt),
    files: sorted.length,
    bytes: sorted.reduce((n, f) => n + f.size, 0),
    fingerprint,
    fingerprintOf: "evidence/files.sha256",
  };
  const readme = [
    "Evidence from Kept",
    "",
    `Fingerprint (SHA-256 of evidence/files.sha256): ${fingerprint}`,
    `Exported ${record.startedAt} to ${record.finishedAt} (UTC), timezone ${context.timezone?.name || "unknown"} (UTC${context.timezone?.offset || ""})`,
    `${record.files} files, ${record.bytes.toLocaleString("en")} bytes`,
    "",
    "To check that nothing changed since the export:",
    "  1. In this folder (the one that holds evidence/), run:",
    "       macOS / Linux:  shasum -a 256 -c evidence/files.sha256",
    "       Windows:        certutil -hashfile <file> SHA256   (compare with the line in files.sha256)",
    "     Every file should report OK.",
    "  2. The fingerprint above is the SHA-256 of evidence/files.sha256 itself:",
    "       shasum -a 256 evidence/files.sha256",
    "     Write it down or send it to someone when you make the export; if it still matches later, the list (and so every file) is unchanged.",
    "",
    "export.json says what was exported, by which account, when, and in which timezone. log.txt is the export, step by step.",
  ].join("\n") + "\n";
  const logText = log.map((l) => `${iso(l.at)}  ${l.text}`).join("\n") + "\n";
  return {
    fingerprint,
    files: [
      { path: "evidence/files.sha256", text: list },
      { path: "evidence/export.json", text: JSON.stringify(record, null, 2) + "\n" },
      { path: "evidence/log.txt", text: logText },
      { path: "evidence/README.txt", text: readme },
    ],
  };
}
