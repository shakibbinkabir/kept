# Changelog

All notable changes to IG Exporter. Versions follow [Semantic Versioning](https://semver.org/).

## [4.9.0] — 2026-11-01

"Ready for everyone." Tested in Brave with the interface in English, Bangla, Arabic and Spanish: every screen took its words from the browser's language, Arabic turned the whole layout right to left with usernames still reading correctly, and an export from the translated popup saved and checked out as before. axe, the standard accessibility checker, found nothing on the popup, the Export Center, the picker or the archive pages, in light and dark. The Firefox build passes Mozilla's add-on checker with no errors; it has not yet been run in Firefox itself.

### Added

- **Firefox.** `node firefox/build.mjs` builds the same extension for Firefox 140 or later, and each release now includes `kept-firefox-<version>.zip`. Firefox has no offscreen documents, so the export engine runs in the background page there; the first time, Kept asks for permission to read instagram.com, which Firefox doesn't grant on install.
- **Your language.** The popup, the Export Center and the picker follow the browser's language: English, বাংলা (Bangla), العربية (Arabic) and Español, with English for anything not yet translated. Arabic turns the layout right to left; usernames, file names and date fields keep reading left to right. Adding a language is one file in `_locales/`.

### Changed

- **Accessibility.** The popup has a page title, a main region and a heading; faint text in light mode is darker, reaching a 4.5:1 contrast ratio; the picker's tip sits inside the page's main region; the selected filter in chat archives uses the deep blue, so its label is easy to read.
- Icons in the Export Center and the picker are built without `innerHTML`.

## [4.8.0] — 2026-10-31

"Evidence and comments." Tested end to end against live Instagram: a post export with comments saved 150 of a post's 2,938 comments with their replies; with evidence mode on, every file's SHA-256 checked out against the archive, the fingerprint matched, and a chat export recorded the people in it with their usernames, the thread, the date range, the exporting account, the timezone and a log.

### Added

- **Evidence mode.** Tick **Evidence mode** (Options, or the Export Center) and every export gets an `evidence/` folder: `files.sha256` with every file's SHA-256 (checkable with `shasum -a 256 -c`), one **fingerprint** for the whole export (the SHA-256 of that list, also shown when the export finishes), `export.json` with what was exported (for chats: the thread, the people in it with their usernames, the first and last message), the account that exported it, when, the computer's timezone and browser, and `log.txt`, the export step by step. `README.txt` explains how to check it. Folder exports get a dated `evidence_<time>` folder.
- **Comments.** Tick **Include comments** to save each post's comments (up to 150 per post) with the replies Instagram shows under them, as `comments.json` and a readable `comments.txt` beside the post (for reels, `<reel>.comments.json`). Each says how many comments the post has in total.

### Changed

- Chat archives keep the people's usernames and ids for evidence mode; `message_1.json` stays exactly in Instagram's format.

## [4.7.0] — 2026-10-31

"On Instagram itself." Tested end to end against live Instagram: the save button appeared in the top-left corner of a photo and saved it in one click, and on a six-photo carousel it saved just the photo on screen; a reel came out at 1080×1920 with sound (41 seconds long, seeking works) instead of 720p; images saved as JPG were real JPEGs.

### Added

- **A save button on instagram.com.** Hover over a photo or video in the feed, on a profile grid, in a post or in Reels, and a small Kept button appears in its top-left corner, where Instagram has none of its own controls. One click saves that photo or video to `Downloads/Instagram/<account>/`; on a carousel it saves the photo you're looking at. It floats above the page without changing it, and can be turned off in the Export Center.
- **Best-quality video.** Instagram often keeps its sharpest video (up to 1080p) as separate picture and sound files. Kept now joins them into one MP4, without re-encoding, whenever that beats the ordinary 720p file, for posts, reels, stories, highlights, saved posts and the save button. If anything goes wrong it falls back to the ordinary file. On by default; turn it off under Options for smaller files.
- **Save images as JPG.** Instagram serves most images as WebP; tick **Save images as JPG** (Options, or the Export Center) to convert them as they're saved.

## [4.6.0] — 2026-10-31

"Your audience." Tested end to end against live Instagram: your own followers and following were exported in full as CSV with the accounts that don't follow you back; a second export compared itself with the first and listed new followers and unfollowers; another account's lists were exported slowly and capped.

### Added

- **Your followers and following, as CSV.** **My followers and following (CSV)** saves both lists in full (username, name, id, private, verified and a profile link), opens in any spreadsheet app, and lists the accounts you follow that don't follow you back.
- **What changed since last time.** Kept keeps a snapshot of your lists in the browser, so the next export adds `new_followers` and `unfollowers` files and a summary of the change. Each file is dated, so a folder export builds up a history. The Export Center can forget the snapshot.
- **Another account's lists, once.** **Their followers and following (up to 1,000)** saves a public account's (or one you follow) lists, capped at 1,000 each and paced slowly so Instagram doesn't flag your account. Instagram shows other people only part of a large account's follower list; the summary says so. Kept never tracks other accounts over time.
- CSV files are safe to open in spreadsheet apps: text that would run as a formula is neutralised.

## [4.5.0] — 2026-10-31

"More from profiles." Tested end to end against live Instagram: the popup opened on an account's Tagged tab offered its tagged posts and exported the newest three with their dates and authors; on your story archive it exported the newest archived stories by month, and a From/To range kept exactly the stories inside it; highlights with a date range saved only the stories in range, with each highlight's cover.

### Added

- **Posts they're tagged in.** A new **Posts they're tagged in** choice saves the posts an account is tagged in, each with the account that posted it, its date and caption, and the usual Range, folder and file name options. Instagram's Tagged list leaves out dates and videos, so Kept loads each post's details one at a time, like reels.
- **Your archived stories.** **My archived stories** saves the stories in your own archive, sorted into a folder per month, with a gallery grouped the same way. A From/To range skips whole days outside it, so short ranges are quick.
- **Highlight covers.** Each highlight's cover image is saved as `cover.jpg` in its folder, and the picker shows covers next to highlight names.
- **A date range for highlights.** The Range options (everything, newest, oldest, From/To) now work for highlights too.
- The popup recognises an account's Tagged tab and your story archive, and picks the matching choice.

## [4.4.0] — 2026-10-31

"Chat insights." Checked in a browser on a 20,000-message sample chat (every number cross-checked against the table views, hover labels, light and dark, reduced motion) and in a real export, which now carries `chat.md` and the Insights view.

### Added

- **Insights in the offline chat page.** A new **Insights** button shows how the chat went: the number of messages and the days you talked, the first message, the busiest day, the longest streak of days in a row, photos, videos, voice notes, calls, links and reactions, and four charts: messages per person, by hour, by weekday, and per month (per year for chats longer than four years). The bars grow in when you open it (still with reduced motion), each shows its number on hover, and every chart has a table view.
- **The chat as Markdown.** Every chat archive now includes `chat.md` beside `chat.txt`: a heading for each day, senders in bold, photos inline and videos and voice notes linked to their files, ready for notes apps and editors.

### Not possible

- **Voice-note transcripts.** Instagram's web data has none: a voice message carries only the audio, its length and its waveform. If Instagram adds transcripts, Kept will save them.

## [4.3.0] — 2026-10-31

"Everything you saved." Tested end to end against live Instagram: opened on one of your collections, the popup switched to it by itself and exported its newest posts with their authors, links, dates and captions; "every collection" exported four collections into four folders with a gallery grouped the same way; "all saved posts" exported the newest saved posts.

### Added

- **Your saved posts and collections.** Pick **My saved posts and collections** in the Profiles tab, then **All saved posts**, one of your collections, or **Every collection, each in its own folder**. Every post is saved with its photos and videos, its caption, the account that posted it, a link back to it and its date (in `index.json`, and `caption.txt` beside the files). The usual Range, folder, only-new and file name options apply, and `{username}` in a file name pattern means the post's author.
- **Opens on the right collection.** On instagram.com/you/saved/ the popup offers your saved posts straight away, with the collection you're looking at already chosen.
- **A collection browser.** The export's offline gallery groups posts by collection and searches captions, authors and collection names; each post shows who posted it.

## [4.2.0] — 2026-10-31

"Pick before you export." Tested end to end against live Instagram: the picker listed an account's posts with thumbnails and stopped on request, a shift-click ticked three posts and exactly those three were exported; one of five highlights was picked and exported alone; the gallery pages of both exports opened offline with every file present; a folder export got its own gallery file; and the file name previews matched what the exports produced.

### Added

- **Choose which ones to export.** In the Profiles tab, **Choose which ones to export…** opens a full page with the account's posts, images or reels as a grid of thumbnails (or its highlights as a list). Tick the ones you want (shift-click to tick a run of them), then export just those with your usual saving options. Posts appear as they load; **Stop loading** when you've seen enough.
- **A gallery page in profile exports.** Every posts, images, reels, stories or highlights export now includes an `index.html` you can open offline: a grid of what was saved (highlights grouped by name), with each post's photos and videos full screen, its caption, date and a link back to Instagram, and a search over captions. Folder exports get one per run, `gallery_<time>.html`, beside the `index_<time>.json`.
- **A live preview of file name patterns** in the popup's options and in the Export Center, showing exactly what a post and a reel will be called.

### Changed

- The Export Center's settings are now separate sections: Appearance, Saving, Chats and Remembered downloads.

## [4.1.0] — 2026-10-31

"The chat page, polished." Checked in a browser with a 100,000-message chat (first messages in under half a second, all of it built in the background in about 9 seconds, scrolling at 60 frames a second, search finding the last message), a sample chat for the viewer, voice player and print layout, and a real export of six chats with their voice notes.

### Added

- **Full-screen viewer** for photos and videos in the offline chat page: click a photo in the chat or anything in the gallery, step through with the arrows or ← →, close with Esc, or jump to the message with **Show in chat**.
- **Voice notes with a waveform.** Kept works out each voice note's waveform while exporting, and the page plays it from a waveform you can click to jump to any point, with the time counting up.
- **Print / PDF.** A book layout for the browser's print dialog: a cover page with the names, dates and message count, a heading for each day, page breaks that never split a message, and photos sized for paper. Save it as a PDF from the same dialog.

### Changed

- **Long chats open at once.** The page draws the first messages immediately and builds the rest in the background in small slices, so a chat of 100,000 messages stays responsive. Days already off screen aren't drawn until you scroll to them, and the day headings stay pinned while you read.

## [4.0.0] — 2026-10-31

"New name, new look." IG Exporter is now **Kept**, with a redesigned popup, a full-page Export Center and a website at kept.thisissbk.com. Tested end to end in the real extension against live Instagram: the popup on a profile, a post, a chat and the inbox; a profile ZIP export and a chat saved as a folder with the done card, Show in folder and Open chat; the history entry each one left; capture with the "back to" date; the error card; and all seven Instagram checks.

### Changed

- **The new name, everywhere:** the extension, the popup, the offline chat pages, the docs, and the GitHub repository (github.com/shakibbinkabir/kept; the old address redirects). Your settings and remembered downloads carry over.
- **A redesigned popup.** It reads the open tab and names it ("Chat with Ana", "@nasa's profile", "A post by @nasa"), opens the right tab, and offers one main action that says what it will do ("Export @nasa's posts"). Options fold away until you need them.
- **Progress you can read:** a ring with a live count, how far back a chat has reached ("Back to 12 Mar 2024"), time left on downloads, and the slow-down countdown.
- **A done card** with what was saved, **Show in folder**, and **Open chat** for a chat saved as a folder; friendly error cards with Retry and Report; loading placeholders in the chat list.
- **Motion and access:** a sliding tab indicator, fading panels, counting numbers, button feedback, reduced-motion support, keyboard focus rings, and labels for screen readers.
- **README redesign** with a hero image, a popup demo and a feature tour.

### Added

- **A first-run welcome** that explains Kept in three lines.
- **The Export Center** (the sliders button in the popup): the export in progress, your last 200 exports with shortcuts to their files, settings (light, dark or system theme; saving and chat defaults; forget remembered downloads), and the Instagram check.
- **The website**, kept.thisissbk.com.
- Permission `downloads.open`, used only when you click **Open chat**.

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
