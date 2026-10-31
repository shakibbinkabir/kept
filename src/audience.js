// src/audience.js
//
// Followers and following: CSV files and snapshot comparisons. Pure
// functions; test/audience.test.mjs checks them.

// One CSV field: quoted when needed, and a leading = + - @ (which spreadsheet
// apps run as a formula) neutralised with an apostrophe.
const field = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** users: [{ pk, username, full_name, is_private, is_verified }] → CSV text (with a BOM for Excel). */
export function usersCsv(users) {
  const rows = [["username", "full_name", "user_id", "private", "verified", "profile"]];
  for (const u of users) rows.push([u.username, u.full_name, u.pk, u.is_private ? "yes" : "no", u.is_verified ? "yes" : "no", `https://www.instagram.com/${u.username}/`]);
  return "﻿" + rows.map((r) => r.map(field).join(",")).join("\r\n") + "\r\n";
}

/** A snapshot to keep: { at, followers: {pk: username}, following: {pk: username} }. */
export function snapshotOf(followers, following, at = Date.now()) {
  const map = (list) => Object.fromEntries(list.map((u) => [String(u.pk), u.username]));
  return { at, followers: map(followers), following: map(following) };
}

/**
 * What changed since the last snapshot, and who doesn't follow back.
 * Returns users ({ pk, username }) for each list.
 */
export function compare(prev, now) {
  const users = (map, keys) => keys.map((pk) => ({ pk, username: map[pk] }));
  const nowF = Object.keys(now.followers);
  const out = {
    notFollowingBack: users(now.following, Object.keys(now.following).filter((pk) => !(pk in now.followers))),
    newFollowers: [],
    unfollowers: [],
    since: prev?.at || null,
  };
  if (prev) {
    out.newFollowers = users(now.followers, nowF.filter((pk) => !(pk in prev.followers)));
    out.unfollowers = users(prev.followers, Object.keys(prev.followers).filter((pk) => !(pk in now.followers)));
  }
  return out;
}
