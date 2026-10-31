# Changelog

All notable changes to IG Exporter. Versions follow [Semantic Versioning](https://semver.org/).

## [3.9.0] — 2026-10-31

"Design foundation." The brand, design system and website for the 4.0 rename to Kept. Checked in a browser: the popup in light and dark, every icon at 16, 32 and 48 px, and the website at desktop, tablet and phone widths.

### Added

- **A new mark and toolbar icon: the Keeper ring,** an open ring holding a gem, in the "Ink & sky" palette. The 16 and 32 px icons use a heavier cut so the gem stays clear of the ring. The full kit (mark, "kept" wordmark, lockups, tiles, store promo tile, social image) is in `brand/`, with usage notes and the script that draws it.
- **Design tokens** (`styles/tokens.css`): colour, type, spacing, corners, shadows and motion, with light and dark themes that follow your system setting.
- **Manrope, bundled.** One variable typeface shipped with the extension, so nothing loads from a font service.
- **A custom icon set** (`icons/ui.svg`): 24 interface icons on one grid, in the mark's round strokes.
- **The website** in `site/`, ready for kept.thisissbk.com: the ring in 3D, a sample chat you can type into and search, what Kept saves, how it works, where your data goes, feature status read from this README, install steps, answers, and the changelog and privacy notes built from this repo. It launches with 4.0.

### Changed

- The popup uses the design tokens: it follows your system's light or dark setting and uses Manrope and the new mark.
- PRIVACY.md now lists the saved-post codes kept for "Only what I haven't downloaded yet" (added in 3.8).

## [3.8.0] — 2026-10-31

"Big exports." Tested end to end against live Instagram: posts, images, reels, a highlight and a chat saved as folders; "only new" skipped 3 of 5 posts, then reported nothing new; an export of 20 posts was stopped halfway by reloading the extension and, run again, skipped the 9 already saved and finished the other 11, with no partial or duplicate files; a ZIP with a custom name pattern carried every post's date and time.

### Added

- **Save as files in a folder, not a ZIP.** Each file goes straight into `Downloads/Instagram/<account>/<posts|images|reels|stories|highlights>/` as soon as it's downloaded, so there is no 4 GB limit and nothing big is held in memory. Chats can be saved as a folder too (`Downloads/Instagram/chats/…`). Folder names stay the same between runs, so a repeat export updates the same folder.
- **Only what I haven't downloaded yet.** The extension remembers which posts, reels, stories and highlight items each export saved, per account and type, and skips them next time. The result says how many were already saved.
- **Resume a stopped export.** In folder mode each post is remembered as soon as all its files are saved, so if an export stops (browser closed, Instagram error), running it again with "Only what I haven't downloaded yet" picks up where it left off. After an error the Retry button becomes **Resume**.
- **File names you choose.** Set a pattern with `{username}`, `{date}`, `{time}`, `{code}` and `{index}`, for example `{username}_{date}_{code}`. Every name keeps the post code or number, so two posts never share one.
- **Post dates on files in ZIPs.** Every file in a ZIP now carries the date and time it was posted (chat media: when it was sent), so unzipped files sort by when they were posted.

### Changed

- Captions are saved alongside each post's media as it downloads.

## [3.7.0] — 2026-10-31

"Choose your chats." Tested end to end against live Instagram: the chat list loaded (15, then 30 with Load more), two chats from the last 7 days exported into one archive (921 messages, 47 media files, both pages and the inbox page open offline), the whole Message requests folder was scanned, and a 30-day range cut a 198-message chat down to its 28 recent messages.

### Added

- **Export several chats at once.** Click **Export several chats or the whole inbox…** to see your chat list (Inbox and Message requests), tick the ones you want, and export them into one ZIP. Or tick **Every chat in these folders** to export the whole inbox. You don't need to open or scroll each chat; the extension pages through them for you.
- **An inbox page for multi-chat archives.** `index.html` lists every chat in the archive with a search box; each chat opens on its own page with a link back.
- **Date range.** Set **From** and **To** to export only the messages in that period, for one chat or many. Older pages aren't fetched once the range is passed.
- **Filters in the offline chat page.** Show only photos, videos, voice notes, links or calls.
- **Media gallery.** A grid of every photo and video in the chat; click one to jump to its message.

## [3.6.0] — 2026-10-31

"Read your chats offline." Tested end to end against live Instagram: a 198-message chat exported, unzipped and opened from a local folder (all messages, photos and the voice note load; search and jump to date work).

### Added

- **An offline chat page in every chat export.** The ZIP now opens with `index.html`, which shows the chat like a messaging app: your messages on the right, theirs on the left, a heading for each day, photos inline, videos and voice notes you can play, shared posts as links, calls and reactions. It works with no internet connection and loads nothing from outside; media comes from the folders next to it.
- **Search inside a chat.** Type in the search box to highlight every match; Enter and Shift+Enter (or the arrows) step through them.
- **Jump to a date.** Pick a date to scroll to the first message on or after it.

## [3.5.0] — 2026-10-31

"Chats with their media." Tested end to end against live Instagram: a 198-message chat with photos and a voice note, with and without media, with and without Instagram encoding, plus a profile smoke test.

### Added

- **Chat exports are now a complete archive.** **Export chat** downloads a ZIP laid out like Instagram's own data download (`your_instagram_activity/messages/inbox/<chat>/`): `message_1.json` in the same format, every **photo, video and voice note** from the loaded part of the chat as a real file in `photos/`, `videos/` and `audio/`, with the JSON pointing at the local copies. Instagram's media links expire, so before this the exported media links stopped working after a while.
- **`chat.txt`**: a readable transcript next to the JSON, oldest message first, one heading per day, with photos, voice notes, shares, calls and reactions marked inline.
- **Include photos, videos and voice notes** (on by default) and **Match Instagram's text encoding** (off by default) options in the Chat tab, remembered between uses. The encoding option reproduces the byte-per-character escapes Instagram's own export uses, for tools that expect them.

### Changed

- Voice notes are served from `cdn.fbsbx.com`, so the extension now also has access to `*.fbsbx.com`.
- The popup's **Export JSON** button is now **Export chat**, and it shows media download progress.

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
