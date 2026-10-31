# Changelog

All notable changes to IG Exporter. Versions follow [Semantic Versioning](https://semver.org/).

## [3.4.0] — 2026-10-31

"Never broken for long." Tested end to end against live Instagram: every profile mode, the open post / reel / highlight detection, and chat capture, auto-scroll and export.

### Added

- **Query ids are read from Instagram's own page.** Instagram rotates the ids of its private queries every few weeks, which used to break the exporter until a new release. A small script now reads the current ids (and their settings) from the instagram.com tab and the extension remembers them, falling back to its built-in ids if Instagram rejects one. Both chat queries had already been rotated since 3.2.1, and Instagram had only kept accepting the old ids.
- **Check Instagram.** A button at the bottom of the popup tests every feature against Instagram in about ten seconds (account search, posts, single posts, reels, stories, highlights, and the open chat if there is one) and shows which ones work.
- **Report a problem.** Opens a GitHub issue filled in with the error, the version and the check results, with usernames removed. You review it before posting. Also on every error card, next to *Copy details*.
- **Gentle pacing, shown on screen.** Requests are spaced a little under a second apart. When Instagram asks to slow down, the exporter waits 30 s, 60 s, then 120 s, with a countdown in the popup, instead of retrying within seconds and failing.
- **Privacy statement** ([PRIVACY.md](PRIVACY.md)): what the extension reads, sends and stores, why it needs each permission, no remote code, never for sale. The popup links to it and says the extension isn't affiliated with Instagram or Meta.

### Changed

- Exports are a little slower because of the pacing; reels in particular take about a second each.
- New `storage` permission, to remember Instagram's current query ids. Chrome grants it without a prompt.
- The README is rewritten around what people search for (export Instagram DMs, download stories, highlights and reels), with an FAQ.

## [3.3.0] — 2026-10-31

Every feature was tested end to end in a real browser against live Instagram for this release: all profile modes and filters on a public and a private account, the open post / reel / highlight / story detection, the popup's input checks and Retry, and DM capture, scroll and auto-scroll, export and thread switching. Each download was opened and checked: every file matches its index, and every image and video is the format its name says.

### Fixed

- **"All reels" missed reels that aren't on the posts grid.** It filtered the grid, but reels can be hidden from it and then only appear on the profile's Reels tab. An account whose reels were all off the grid got *No reels found*. Reels now come from the Reels tab, with each reel's video, date and caption fetched separately.
- **"All images" with *Most recent N* or *Oldest N* counted video posts.** It took the N newest posts of any kind and then dropped the videos, so an account posting mostly reels returned fewer than N images or *No images found*. Only posts with an image count now.
- **"Profile picture" saved Instagram's grey placeholder** for accounts with no photo. It now says *No profile picture available*.
- **The chat capture count could read lower than the export.** Shared posts that are no longer available but have reactions were exported (with their reactions) but not counted. A thread with seven of them counted 190 messages and exported 197.
- **A chat with an emoji-only name was saved as `instagram___<time>.json`.** Names with nothing readable left now fall back to `instagram_thread_<time>.json`.

### Added

- README: a **Status & maintenance** section with how often releases ship and when each feature was last verified, plus live badges for the latest release and the last update. The version badge now reads the latest release automatically.

## [3.2.3] — 2026-10-31

### Fixed

- **Profile export failed with *Not found (404)*.** Instagram removed the username search endpoint (`/api/v1/web/search/topsearch/` now answers `404`), so every mode that takes a username failed before exporting anything. Search now uses the same GraphQL query as instagram.com's search box.
- **Stories and highlights**: the `reels_media` endpoint they came from now answers `500`. They load through the story viewer's GraphQL query instead.
- **Posts, reels, images and highlights**: the GET `/graphql/query` path now returns an HTML page for the posts-grid and highlights-tray queries. Every profile query now goes through `POST /api/graphql`, the way instagram.com sends them, and the posts-grid query id is updated.

### Changed

- **Profile export needs an instagram.com tab open** (any page, logged in). `/api/graphql` rejects requests from the extension's own origin with an HTML page, so the queries run inside that tab. A tab opened before the extension was installed or reloaded works too: the exporter injects itself into it.
- Chat capture refetches an expired session token and retries once, instead of failing with *Instagram returned a non-JSON response* until you reloaded the page.

## [3.2.2] — 2026-10-07

### Fixed

- **Call durations are back.** 3.2.1 exported calls as plain text with no `call_duration`, because Instagram's web API stopped exposing one. Each call is again a single message with a `call_duration` in seconds, now derived from the gap between Instagram's "started" and "ended" notices. That gap includes the time the call rang before it was answered, so it can read up to about a minute over the real talk time (checked against two calls with known durations: +2 s and +48 s). Missed calls get `0`.
- **Switching conversations while capturing left the popup stuck at 0.** The previous thread's messages were dropped, but nothing loaded for the new one until you stopped and restarted capture. Capture now follows you into the new thread, whether you reopen the popup or just scroll.
- **File names lost a leading or trailing underscore** from usernames and post codes, so `@some_user_`'s export was named after `@some_user` (`some_user_posts_…zip`), and a post code that starts or ends with `_` was clipped in its folder name. Both are kept verbatim now.
- Profile export summaries read "1 posts", "1 highlights": singular counts are worded properly.

### Changed

- A call message now also carries Instagram's "… started an audio call" / "… started a video chat" text as `content`. In 3.2.0 it had `call_duration` only.
- A call notice whose other half is outside the loaded range (for example an "ended" row at the very start of what you scrolled to) is exported as a plain text row without a duration.
- Call pairing matches Instagram's English notice text. With Instagram in another language, calls export as two plain text rows.

## [3.2.1] — 2026-10-07

### Fixed

- **DM export failed with *Unexpected response (404)*.** Instagram removed the `direct_v2` REST endpoints from the web — `/api/v1/direct_v2/inbox/` and `threads/<id>/` now answer `404` — so Start Capture failed before loading a single message. DM export now runs the same GraphQL queries as instagram.com's own message view.

### Changed

- The open `/direct/t/<id>/` thread is loaded straight from the id in its URL. The inbox lookup is gone, and with it the limit of only finding conversations among your 120 most recent.
- Rewrote the message normalizer for the new `SlideMessage` shape — text, photos/videos, view-once media, voice messages, GIFs/stickers, shared reels/posts/links, and reactions.
- **Call events are exported as their notice text** ("… started an audio call", "Audio call ended"), one message per row, with no `call_duration`: the new API exposes neither a call id nor a duration.
- Your own name in the export comes from messages you sent. If none are in the loaded range, you appear as "Viewer".
- Added `test/normalizer.test.mjs`, a self-check for the normalizer (`node test/normalizer.test.mjs`).

## [3.2.0] — 2026-09-29

### Fixed

- **Profile export was broken.** Instagram retired the REST endpoints the exporter relied on: `web_profile_info` and `users/<id>/info` now answer `429`, and the user-feed, story, and highlights-tray endpoints return an HTML page instead of JSON. Every mode except "This post / reel" sat on *Resolving…* for about 25 seconds and then failed with a misleading rate-limit error. Profile export now uses the same GraphQL queries as instagram.com's own profile page, with search to resolve usernames.
- **"This post / reel" hung on *Resolving @instagram…*.** When the URL had no username, it looked up the @instagram account before exporting. It now takes the owner from the post itself and skips the profile lookup entirely.
- **Posts from private accounts couldn't be exported.** Their URLs carry a 28-character suffix that was being decoded as part of the post id.
- **Pinned posts broke filtering.** A date range stopped as soon as it reached an old pinned post (returning nothing), and *Most recent N* counted pinned posts as recent.
- **Images were saved as `.jpg` even though Instagram serves most of them as WebP.** Files are now named by what they actually are (`.webp`, `.jpg`, `.png`), and `index.json` matches.
- **Downloads could be saved under a random UUID name** when a download-manager extension (e.g. IDM) is installed. The extension now re-asserts its own filenames.
- **Non-Latin names were flattened to underscores** in file and folder names (e.g. a Bengali thread title or highlight name). Letters from every script are kept now.
- A reel opened from the Reels feed (`/reels/<code>/`) wasn't detected as an open post.
- Chat: shared profiles were silently dropped from the export. They're exported as a `share` linking to the profile.
- Chat: shared stories linked to `/p/<code>/`, which doesn't open a story. They link to `/stories/<user>/<id>/` now.
- Chat: the live *captured* count included empty messages that the export drops, so it could read higher than what was exported.
- Chat: errors while capturing were titled *Export failed*, and login / rate-limit errors showed a hint telling you to open a DM.
- A stalled request could leave the popup spinning forever. API requests now time out after 20 seconds.

### Changed

- **Exporting a single highlight no longer needs a username** — open the highlight and click Export.
- Links shared in chat now also carry the URL as `share.link`, next to the message text.
- Single-file downloads (a lone post image/video, the profile picture) now go through the same fetch → type-check → save path as ZIPs.
- The popup's version label and *Copy details* report read the version from the manifest, and the report now covers profile-export errors too.

## [3.1.0] — 2026-07-22

### Fixed

- **DM export stopped detecting messages.** Instagram moved Direct Message traffic off the page's main thread, so the page-world GraphQL interception saw nothing and the capture count sat at 0.

### Changed

- DM export actively fetches Instagram's private `direct_v2` REST API with your logged-in session. The chat UI (Start Capture, scroll to load, Auto-scroll, Export JSON) is unchanged.
- Rewrote the message normalizer for the `direct_v2` item shape — text, photos/videos, view-once media, voice messages, reel/post shares, call events, and reactions.
- Removed the obsolete `src/interceptor.js`.

## [3.0.2] — 2026-06-17

### Fixed

- DMs with deactivated, deleted, or blocked accounts failed validation because those participants have no name; they're now exported as "Instagram User", matching Instagram's own UI.

## [3.0.1] — 2026-06-11

### Added

- **Profile tab** — download any account's posts, images, reels, stories, highlights, or profile picture as foldered ZIPs, via a background service worker and an offscreen document.

### Fixed

- DM capture after Instagram began splitting a thread across several GraphQL ids that no longer matched the `/direct/t/` URL.

## [2.2.1] — 2026-05-19

### Fixed

- Call events are captured as one `call_duration` row per call; other admin rows (theme changes, etc.) are dropped.
- Messages without a timestamp are rejected instead of slipping past validation.
- The popup reports a stale content script instead of getting stuck.

## [2.1.1] — 2026-05-19

### Changed

- New branded extension icons, plus a committed `icons/build.ps1` to regenerate them.

## [2.1.0] — 2026-05-19

### Added

- Dark popup, Start / Stop Capture, Auto-scroll, detected thread title, and an error card with hints, Retry, and Copy details.

### Fixed

- Auto-scroll direction on Instagram's reversed message list, live count matching the export, and thread title detection.

## [2.0.0] — 2026-05-19

First open-source release: Manifest V3 rewrite around GraphQL interception, with DYI-compatible output and schema validation before download.

[3.2.2]: https://github.com/shakibbinkabir/igexporter/releases/tag/v3.2.2
[3.2.1]: https://github.com/shakibbinkabir/igexporter/releases/tag/v3.2.1
[3.2.0]: https://github.com/shakibbinkabir/igexporter/releases/tag/v3.2.0
[3.1.0]: https://github.com/shakibbinkabir/igexporter/releases/tag/v3.1.0
[3.0.1]: https://github.com/shakibbinkabir/igexporter/releases/tag/v3.0.1
[2.2.1]: https://github.com/shakibbinkabir/igexporter/releases/tag/v2.2.1
[2.1.1]: https://github.com/shakibbinkabir/igexporter/releases/tag/v2.1.1
[2.1.0]: https://github.com/shakibbinkabir/igexporter/releases/tag/v2.1.0
[2.0.0]: https://github.com/shakibbinkabir/igexporter/releases/tag/v2.0.0
