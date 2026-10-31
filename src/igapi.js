// src/igapi.js
//
// Thin client over Instagram's own web API endpoints. Everything here runs in
// an extension context (the offscreen document), which — combined with the
// host permissions in manifest.json — lets fetch() reach instagram.com with
// the user's logged-in session cookie attached and without CORS blocking the
// response body.
//
// These endpoints are NOT public/documented and Instagram changes them
// periodically. When the exporter breaks, this is almost always the file to
// fix. App id 936619743392459 is the well-known Instagram Web app id.

const APP_ID = "936619743392459";
const ORIGIN = "https://www.instagram.com";

// Persisted GraphQL queries used by instagram.com's own profile page and story
// viewer (the old REST search/profile/feed/story endpoints now answer 404, 429,
// 500 or an HTML page). Instagram rotates the ids every few weeks; bridge.js
// swaps in the id the page currently uses (read by src/pageids.js), so the
// ids here are only the fallback. To refresh them by hand, open a profile on
// instagram.com and run require("<name>.graphql").params.id in DevTools.
const DOC_SEARCH = { name: "PolarisAPITopsearchQuery", id: "40560838120170065" }; // username search
const DOC_TIMELINE = { name: "PolarisProfilePostsTabContentQuery_connection", id: "39527599490219966" }; // posts grid
const DOC_USER = { name: "PolarisProfilePageContentQuery", id: "40158838120366999" }; // profile info
const DOC_HIGHLIGHTS = { name: "PolarisProfileStoryHighlightsTrayContentQuery", id: "26970053832668570" };
const DOC_REEL = { name: "PolarisStoriesV3ReelPageStandaloneQuery", id: "29341065465524437" }; // a story ring or highlight
const DOC_REELS_TAB = { name: "PolarisProfileReelsTabContentQuery_connection", id: "39544804838467783" }; // a user's reels
const DOC_SAVED_COLLECTIONS = { name: "PolarisProfileSavedTabContentQuery", id: "27584326974521636" }; // your saved collections
const DOC_TAGGED = { name: "PolarisProfileTaggedTabContentQuery_connection", id: "28780673414922723" }; // posts a user is tagged in
const TAGGED_FLAGS = {
  __relay_internal__pv__PolarisSEOIsCrawlerrelayprovider: false,
  __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: true,
};
const TIMELINE_FLAGS = {
  include_multi_captions: true,
  __relay_internal__pv__PolarisMultiCaptionCarouselEnabledrelayprovider: true,
  __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: true,
  __relay_internal__pv__PolarisSEOIsCrawlerrelayprovider: false,
  __relay_internal__pv__PolarisThreadsStyleCommentsEnabledrelayprovider: false,
  __relay_internal__pv__PolarisReelsRecoDebugOverlayEnabledrelayprovider: false,
};
const REEL_FLAGS = {
  __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: true,
};
const USER_FLAGS = {
  __relay_internal__pv__PolarisCannesGuardianExperienceEnabledrelayprovider: true,
  __relay_internal__pv__PolarisCASB976ProfileEnabledrelayprovider: false,
  __relay_internal__pv__PolarisProfileInformTreatmentBannerEnabledrelayprovider: false,
  __relay_internal__pv__PolarisWebSchoolsEnabledrelayprovider: false,
  __relay_internal__pv__PolarisProfileRingsGradientEnabledrelayprovider: true,
  __relay_internal__pv__PolarisRepostsConsumptionEnabledrelayprovider: true,
  __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: true,
};

class IGError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "IGError";
    this.status = status;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ===== pacing ===== */
// Requests from this document wait their turn, a little under a second apart
// (GraphQL is paced the same way in bridge.js). When Instagram answers 429,
// back off for 30 s, 60 s, then 120 s, telling the UI how long through
// setWaitReporter so it can show a countdown.
// ponytail: one global pace; per-endpoint budgets if Instagram ever needs them.
const PACE_MS = 800;
const WAITS_429 = [30, 60, 120];
let paceChain = Promise.resolve();
let lastRequestAt = 0;
let reportWait = null;

function pace() {
  const turn = paceChain.then(async () => {
    const wait = lastRequestAt + PACE_MS + Math.random() * 400 - Date.now();
    if (wait > 0) await delay(wait);
    lastRequestAt = Date.now();
  });
  paceChain = turn.catch(() => {});
  return turn;
}

/** fn(untilMs) is called before each back-off, and with 0 when it ends. */
export function setWaitReporter(fn) {
  reportWait = fn;
}

async function backOff(seconds) {
  reportWait?.(Date.now() + seconds * 1000);
  await delay(seconds * 1000);
  reportWait?.(0);
}

// GET an instagram.com JSON endpoint with the headers IG's web client sends.
// 429s back off with a countdown; 5xx and network errors retry briefly.
async function fetchJson(path) {
  const url = path.startsWith("http") ? path : ORIGIN + path;
  let retries = 0;
  let throttled = 0;

  for (;;) {
    await pace();
    let res;
    try {
      res = await fetch(url, {
        method: "GET",
        credentials: "include",
        // A stalled request would otherwise leave the popup spinning forever.
        signal: AbortSignal.timeout(20000),
        headers: {
          "x-ig-app-id": APP_ID,
          "x-requested-with": "XMLHttpRequest",
          Accept: "application/json",
        },
      });
    } catch (err) {
      if (++retries > 3) throw new IGError("Network request failed: " + err.message, 0);
      await delay(1000 * retries);
      continue;
    }

    if (res.status === 429) {
      if (throttled >= WAITS_429.length) {
        throw new IGError("Instagram is rate-limiting requests (429). Wait a few minutes and retry.", 429);
      }
      await backOff(WAITS_429[throttled++]);
      continue;
    }
    if (res.status >= 500) {
      if (++retries > 3) throw new IGError(`Instagram server error (${res.status}).`, res.status);
      await delay(2000 * retries);
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      throw new IGError(
        "Not authorized. Make sure you're logged in to Instagram in this browser.",
        res.status
      );
    }
    if (res.status === 404) {
      throw new IGError("Not found (404).", 404);
    }
    if (!res.ok) {
      throw new IGError(`Unexpected response (${res.status}).`, res.status);
    }

    try {
      return await res.json();
    } catch {
      throw new IGError("Instagram returned a non-JSON response.", res.status);
    }
  }
}

/** Query name -> "page" | "built-in": which id the last call used. */
export const idSources = {};

// Run a persisted GraphQL query ({ name, id }). The old GET /graphql/query
// path now returns an HTML page for most queries, and POST /api/graphql
// rejects requests from the extension's own origin, so the query runs inside
// an open instagram.com tab (src/bridge.js), exactly as Instagram's web client
// sends it. A 429 comes back here so the countdown shows in the popup.
async function graphql(query, variables) {
  for (let throttled = 0; ; throttled++) {
    const res = await chrome.runtime.sendMessage({ type: "IG_GQL", query, variables });
    if (res?.data) {
      idSources[query.name] = res.source;
      return res.data;
    }
    if (res?.status === 429 && throttled < WAITS_429.length) {
      await backOff(WAITS_429[throttled]);
      continue;
    }
    throw new IGError(res?.error || "Instagram GraphQL error: no data.", res?.status || 0);
  }
}

/**
 * Resolve a username to its profile metadata.
 * @returns {{id, username, full_name, is_private, can_view, profile_pic_url_hd}}
 */
export async function resolveUser(username) {
  const clean = String(username).trim().replace(/^@/, "").toLowerCase();
  if (!clean) throw new IGError("Enter a username.", 0);

  const data = await graphql(DOC_SEARCH, {
    data: { context: "blended", query: clean, include_reel: "true", search_surface: "web_top_search" },
  });
  const users = data.xdt_api__v1__fbsearch__topsearch_connection?.users || [];
  const hit = users.map((u) => u.user).find((u) => u?.username?.toLowerCase() === clean);
  if (!hit) throw new IGError(`No such user: @${clean}`, 404);

  const { user = {} } = await graphql(DOC_USER, { id: String(hit.pk), enable_integrity_filters: true, ...USER_FLAGS });
  const isPrivate = !!(user.is_private ?? hit.is_private);
  return {
    id: String(hit.pk),
    username: user.username || hit.username,
    full_name: user.full_name || hit.full_name || "",
    is_private: isPrivate,
    // friendship_status is null on your own profile, which you can always see.
    can_view: !isPrivate || !user.friendship_status || !!user.friendship_status.following,
    // Without a photo these URLs point at Instagram's grey placeholder.
    profile_pic_url_hd: user.has_profile_pic === false ? "" : user.hd_profile_pic_url_info?.url || user.profile_pic_url || hit.profile_pic_url || "",
  };
}

/**
 * Walk a user's posts grid page by page (pinned posts first, then newest
 * first). onItems(rawItems) may return true to stop pagination early.
 */
export async function paginateFeed(username, onItems) {
  let after = null;
  do {
    const data = await graphql(DOC_TIMELINE, {
      after,
      before: null,
      data: { count: 33 }, // the server caps pages at 33
      first: 33,
      last: null,
      username,
      ...TIMELINE_FLAGS,
    });
    const conn = data.xdt_api__v1__feed__user_timeline_graphql_connection;
    if (!conn) throw new IGError("Instagram returned no posts grid.", 0);

    const stop = await onItems((conn.edges || []).map((e) => e.node));
    if (stop) break;

    after = conn.page_info?.has_next_page ? conn.page_info.end_cursor : null;
  } while (after);
}

/**
 * Walk a user's Reels tab: every reel, including ones hidden from the posts
 * grid, newest first after any pinned reels. The tab only lists reel ids, so
 * each reel's full item (video URL, date, caption) comes from media info.
 * onItems(rawItems) may return true to stop early.
 */
export async function paginateReels(userId, onItems) {
  let after = null;
  do {
    const data = await graphql(DOC_REELS_TAB, {
      after,
      data: {},
      first: 12,
      id: String(userId),
      __relay_internal__pv__PolarisShortDramaEnabledrelayprovider: true,
    });
    const conn = data.fetch__XDTUserDict?.clips_connection;
    if (!conn) throw new IGError("Instagram returned no reels tab.", 0);

    // ponytail: one media-info request per reel, so "Everything" on an account
    // with thousands of reels is slow. Reels that are also on the grid
    // (node.media.is_in_profile_grid) could take the grid query's data instead.
    for (const { node } of conn.edges || []) {
      let item;
      try {
        item = await getMediaInfo(node.media.pk);
      } catch (err) {
        if (err.status === 404) continue; // deleted since the tab was listed
        throw err;
      }
      if (await onItems([item])) return;
    }

    after = conn.page_info?.has_next_page ? conn.page_info.end_cursor : null;
  } while (after);
}

function pickImageUrl(node) {
  const cands = node?.image_versions2?.candidates;
  return Array.isArray(cands) && cands.length ? cands[0].url : null;
}

function pickVideoUrl(node) {
  const vers = node?.video_versions;
  return Array.isArray(vers) && vers.length ? vers[0].url : null;
}

// Turn one raw feed/media node into its constituent media files.
function mediaFromNode(node) {
  const out = [];
  if (node.media_type === 2) {
    const url = pickVideoUrl(node);
    if (url) out.push({ url, type: "mp4", isVideo: true });
    // The poster frame is useful context for reels/videos.
    const thumb = pickImageUrl(node);
    if (thumb) out.push({ url: thumb, type: "jpg", isVideo: false, isThumb: true });
  } else {
    const url = pickImageUrl(node);
    if (url) out.push({ url, type: "jpg", isVideo: false });
  }
  return out;
}

/**
 * Normalize a raw feed/media item into a flat, export-friendly shape.
 * @returns {{shortcode, takenAt, productType, kind, caption, media: Array}}
 */
// A small image for picker grids: the narrowest candidate at least 240px wide.
function thumbOf(node) {
  const c = node?.image_versions2?.candidates || [];
  const fit = c.filter((x) => x.width >= 240).sort((a, b) => a.width - b.width)[0] || c[c.length - 1];
  return fit?.url || "";
}

export function extractMedia(item) {
  const productType = item.product_type || "feed";
  let kind;
  if (productType === "clips") kind = "reel";
  else if (item.media_type === 8) kind = "carousel";
  else if (item.media_type === 2) kind = "video";
  else kind = "image";

  let media = [];
  if (item.media_type === 8 && Array.isArray(item.carousel_media)) {
    for (const child of item.carousel_media) {
      media = media.concat(mediaFromNode(child));
    }
  } else {
    media = mediaFromNode(item);
  }

  return {
    shortcode: item.code || item.id || "",
    takenAt: typeof item.taken_at === "number" ? item.taken_at : 0,
    productType,
    kind,
    caption: item.caption?.text || "",
    // Pinned posts lead the grid (and pinned reels the Reels tab) out of date order.
    pinned: !!(item.timeline_pinned_user_ids?.length || item.clips_tab_pinned_user_ids?.length),
    thumb: thumbOf(item.media_type === 8 ? item.carousel_media?.[0] : item) || thumbOf(item),
    owner: item.user?.username || item.owner?.username || "",
    media,
  };
}

// Instagram shortcodes are base64 (URL-safe alphabet) of the media's numeric
// primary key. Decode it so we can hit the media-info endpoint for a single
// post given only its /p/<code>/ URL.
const SHORTCODE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function shortcodeToMediaId(shortcode) {
  let code = String(shortcode);
  // Posts from private accounts get a 28-char suffix appended to the real code.
  if (code.length > 28) code = code.slice(0, -28);
  let id = 0n;
  for (const ch of code) {
    const idx = SHORTCODE_ALPHABET.indexOf(ch);
    if (idx === -1) throw new IGError(`Invalid post code: ${shortcode}`, 0);
    id = id * 64n + BigInt(idx);
  }
  return id.toString();
}

/** Fetch a single media item by its numeric id. Returns the raw item node. */
export async function getMediaInfo(mediaId) {
  const data = await fetchJson(`/api/v1/media/${mediaId}/info/`);
  const item = Array.isArray(data.items) ? data.items[0] : null;
  if (!item) throw new IGError("Could not load that post.", 404);
  return item;
}

/**
 * Fetch one "reel" — a user's active story ring (numeric user id) or a
 * highlight ("highlight:1790…"). Each item has the same media_type /
 * image_versions2 / video_versions shape as a feed post.
 * @returns {{items: Array, title: string, owner: string}}
 */
export async function getReel(reelId) {
  const data = await graphql(DOC_REEL, {
    reel_ids_arr: [reelId],
    is_highlight: reelId.startsWith("highlight:"),
    ...REEL_FLAGS,
  });
  // No active story → an empty list.
  const reel = data.xdt_api__v1__feed__reels_media?.reels_media?.[0] || {};
  return {
    items: Array.isArray(reel.items) ? reel.items : [],
    title: reel.title || "",
    owner: reel.user?.username || "",
  };
}

/** Highlights tray for a user → [{ id (numeric string), title }]. */
/**
 * Your saved collections: the automatic "All posts" one and those you made.
 * @returns {Promise<Array<{id: string, name: string, count: number|null, auto: boolean}>>}
 */
export async function getCollections() {
  const data = await graphql(DOC_SAVED_COLLECTIONS, {
    collection_types: ["ALL_MEDIA_AUTO_COLLECTION", "PLAYLIST_AUTO_COLLECTION", "MEDIA", "AUDIO_AUTO_COLLECTION"],
    first: 100,
  });
  const edges = data?.viewer?.collections_unified_with_auto_collections?.edges || [];
  return edges
    .map(({ node }) => ({
      id: String(node.collection_id || ""),
      name: node.collection_name || "Saved",
      count: node.collection_media_count ?? null,
      auto: node.__typename !== "MediaCollection",
    }))
    .filter((c) => c.id);
}

/**
 * Page through your saved posts ("all") or one collection, newest saved first.
 * onItems(rawItems) returns true to stop.
 */
export async function paginateSaved(collectionId, onItems) {
  const base = collectionId && collectionId !== "all" ? `/api/v1/feed/collection/${collectionId}/posts/` : "/api/v1/feed/saved/posts/";
  let maxId = "";
  for (;;) {
    const data = await fetchJson(base + (maxId ? `?max_id=${encodeURIComponent(maxId)}` : ""));
    const items = (data.items || []).map((i) => i.media).filter(Boolean);
    if (await onItems(items)) return;
    if (!data.more_available || !data.next_max_id) return;
    maxId = data.next_max_id;
  }
}

/**
 * Page through the posts a user is tagged in. The Tagged tab's list has no
 * dates or video files, so each post's full details are fetched one by one
 * (like reels). onItems(fullItems) returns true to stop.
 */
export async function paginateTagged(userId, onItems) {
  let after = null;
  for (;;) {
    const data = await graphql(DOC_TAGGED, { after, before: null, count: 12, first: 12, last: null, user_id: String(userId), ...TAGGED_FLAGS });
    const conn = data?.xdt_api__v1__usertags__user_id__feed_connection;
    const full = [];
    for (const { node } of conn?.edges || []) {
      if (!node?.code) continue;
      full.push(await getMediaInfo(shortcodeToMediaId(node.code)).catch(() => node));
    }
    if (await onItems(full)) return;
    if (!conn?.page_info?.has_next_page || !conn.page_info.end_cursor) return;
    after = conn.page_info.end_cursor;
  }
}

/** Several reels at once (archive days, story rings): [{ id, items }]. */
export async function getReels(reelIds) {
  const data = await graphql(DOC_REEL, { reel_ids_arr: reelIds, is_highlight: false, ...REEL_FLAGS });
  return (data.xdt_api__v1__feed__reels_media?.reels_media || []).map((r) => ({ id: String(r.id || ""), items: Array.isArray(r.items) ? r.items : [] }));
}

export async function getHighlightsTray(userId) {
  const data = await graphql(DOC_HIGHLIGHTS, { user_id: String(userId) });
  return (data.highlights?.edges || []).map(({ node }) => ({
    id: String(node.id || "").replace(/^highlight:/, ""),
    title: node.title || "Highlight",
    cover: node.cover_media?.cropped_image_version?.url || "",
  }));
}

export { IGError };
