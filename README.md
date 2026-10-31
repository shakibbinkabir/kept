<p align="center">
  <img src="icons/icon256.png" width="128" alt="IG Exporter" />
</p>

<h1 align="center">IG Exporter</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://github.com/shakibbinkabir/igexporter/releases"><img src="https://img.shields.io/github/v/release/shakibbinkabir/igexporter?label=version&color=blue" alt="Latest version" /></a>
  <a href="https://github.com/shakibbinkabir/igexporter/releases/latest"><img src="https://img.shields.io/github/release-date/shakibbinkabir/igexporter?label=released" alt="Latest release date" /></a>
  <a href="https://github.com/shakibbinkabir/igexporter/commits/main"><img src="https://img.shields.io/github/last-commit/shakibbinkabir/igexporter?label=last%20update" alt="Last update" /></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Manifest-V3-green.svg" alt="Manifest V3" /></a>
</p>

<p align="center"><b>Export Instagram DMs and download Instagram posts, reels, stories and highlights.</b><br />Free, open source, and it runs only in your browser.</p>

IG Exporter is a browser extension for Chrome, Brave, Edge and other Chromium browsers that:

1. **Exports Instagram chats** (DM conversations): one, several, or your whole inbox, with photos, videos and voice notes, in the same format as Instagram's own "Download Your Information" export, in minutes instead of days.
2. **Downloads Instagram posts, images, reels, stories, highlights and profile pictures** from any public account, or a private account you follow, as neatly foldered ZIP files.

> **No servers. No password. No tracking.** Everything runs in your browser using the Instagram session you're already logged in with. The only network traffic is to `instagram.com` and Instagram's media servers. See [PRIVACY.md](PRIVACY.md).

---

## Why

- **One chat, in minutes.** Instagram's own data download can take days, often fails, and only gives you your whole account as a pile of files. IG Exporter backs up just the conversation you want, right now.
- **Safe by design.** It never asks for your password, sends nothing anywhere except Instagram, and every line is open source. It paces its requests and backs off when Instagram asks it to slow down.
- **Free, with no limits.** No sign-up, no paywall, no daily cap, no watermark.
- **Keeps working.** Instagram changes its private API every few weeks. IG Exporter reads Instagram's current query ids from the page itself, and a built-in **Check Instagram** button tells you in seconds whether everything works.

Useful for backing up a conversation before it's deleted, keeping messages from a friendship or relationship, saving a chat as evidence, archiving your own posts before leaving Instagram, or importing one thread into tools that already understand Instagram's export format.

---

## Features

### Profile media export

- **All posts** — every post (images, carousels, videos, reels) as one ZIP, one folder per post, with each post's `caption.txt` and a top-level `index.json` manifest.
- **All images** — images only, post-wise foldered (carousels keep their images; pure-video posts are skipped, and don't count towards *most recent N*).
- **All reels** — every reel from the profile's Reels tab, including reels hidden from the posts grid, as a flat set of `.mp4`s plus an `index.json`.
- **Current stories** — all currently-active (24h) stories as a ZIP.
- **Story highlights** — every highlight, one folder per highlight (named by its title), in one ZIP. Open a specific highlight first to grab just that one — no username needed.
- **Profile picture** — the full-resolution DP, downloaded directly (an account with no photo says so instead of saving Instagram's grey placeholder).
- **A single post / reel** — open it on instagram.com (including private accounts you follow, and reels from the Reels feed) and grab just that post's media.
- **Filtering** — export *everything*, the *most recent N*, the *oldest N*, or a *date range*. Pinned posts are sorted into their real date, so they never skew a range or a count.
- **Big exports** — save as files straight into `Downloads/Instagram/<account>/<type>/` instead of one ZIP: no 4 GB limit, and a repeat export updates the same folder.
- **Only what's new** — skip everything an earlier export already saved, per account and type. It also resumes an export that stopped halfway.
- **Your file names** — a pattern like `{username}_{date}_{code}` (tokens: `{username}` `{date}` `{time}` `{code}` `{index}`). Files in ZIPs carry the date they were posted.
- **Real file types** — images keep Instagram's own format (mostly WebP, sometimes JPEG) and are named accordingly; names in any script (Bengali, Arabic, …) are kept readable.
- Runs in the background, so closing the popup mid-download is safe; progress shows on the toolbar badge.

### Chat export

- **A complete chat archive** — a ZIP laid out like Instagram's own data download: `message_1.json` in the same format, the chat's **photos, videos and voice notes** as real files (the JSON points at them), and a readable **`chat.txt`** transcript. Drop it into any tool that already understands Instagram's export.
- **Read it offline** — every archive opens with an `index.html` that shows the chat like a messaging app: bubbles, day headings, inline photos, videos and playable voice notes, **search** (Enter / Shift+Enter steps through matches) and **jump to a date**. No internet needed; nothing loads from outside.
- **Several chats, or the whole inbox** — pick chats from your list (Inbox and Message requests) or tick **Every chat in these folders**; they're fetched for you, no scrolling, and land in one ZIP with an inbox page linking to each chat.
- **Date range** — export only the messages between two dates, for one chat or many.
- **Filters and a gallery** — in the offline page, show only photos, videos, voice notes, links or calls, or browse every photo and video in a grid.
- **Optional Instagram encoding** — Instagram's own export stores emoji and accents as garbled bytes, and some tools expect that. One checkbox reproduces it exactly; by default text is clean UTF-8.
- **Manifest V3** — no remote code, no `<all_urls>`, scoped to `instagram.com` only.
- **Zero backend** — no analytics, no telemetry, no network calls beyond what Instagram itself makes.
- **Captures everything** — text, reactions, photos, videos, audio messages, shares, and call events, fetched from Instagram's own API as you scroll (or auto-scroll) the thread.
- **Newest-first ordering** matching DYI conventions.
- **Real display names** — `sender_name` is always the actual name, never `"You"`.
- **Schema validation** before download — invalid exports surface the exact problem rather than silently producing garbage.
- **Multi-thread aware** — switch to another conversation while capturing and capture follows you: the previous thread's messages are dropped and the new thread starts loading, so an export never mixes conversations.

---

## Status & maintenance

IG Exporter runs on Instagram's private web API, which Instagram changes without notice, so a feature can break overnight. Each break is fixed in a new release; since v3.0 (June 2026) that has meant a release every 3–6 weeks. The badges above show the latest release and the last change; [CHANGELOG.md](CHANGELOG.md) says what each release fixed.

Every release is tested end to end in a real browser against live Instagram:

| Feature | Status | Last verified |
| --- | --- | --- |
| Posts, images, reels (everything / most recent / oldest / date range) | ✅ Working | 2026-10-31 · v3.8.0 |
| Current stories | ✅ Working | 2026-10-31 · v3.8.0 |
| Story highlights (all, or the open one) | ✅ Working | 2026-10-31 · v3.8.0 |
| Profile picture | ✅ Working | 2026-10-31 · v3.8.0 |
| Single post / reel | ✅ Working | 2026-10-31 · v3.8.0 |
| DM capture, scroll / auto-scroll, chat archive with media | ✅ Working | 2026-10-31 · v3.8.0 |
| Several chats / whole inbox, date range | ✅ Working | 2026-10-31 · v3.8.0 |
| Folder saves, only new, resume, file name patterns | ✅ Working | 2026-10-31 · v3.8.0 |

To check your own setup right now, click **Check Instagram** at the bottom of the popup: it tests every feature against Instagram in about ten seconds.

What's coming next, release by release up to 5.0, is in [ROADMAP.md](ROADMAP.md).

Something broken that this table says works? Click **Report a problem** in the popup (or **Report** on an error). It opens a GitHub issue filled in with the error and the check results, usernames removed, for you to review and post.

---

## Installation

This extension is distributed as an unpacked Chrome Extension. It is **not** on the Chrome Web Store.

1. Download or clone this repository:
   ```bash
   git clone https://github.com/shakibbinkabir/igexporter.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the cloned `igexporter` folder.
5. Pin the extension to your toolbar for easy access.

Works in any Chromium-based browser (Chrome, Edge, Brave, Arc, Vivaldi).

---

## Usage — Profile media export

1. Make sure you're **logged in** to Instagram in this browser and have an instagram.com tab open (any page). Instagram only answers its GraphQL API from its own pages, so the exporter runs its queries through that tab.
2. (Optional) Open the profile, post, reel, or highlight you care about — the popup auto-fills the username and detects an open post or highlight.
3. Click the **IG Exporter** icon and switch to the **Profile** tab.
4. Type/confirm the `@username`, pick **What to export** (All posts / All images / All reels / Current stories / Story highlights / Profile picture / This post-reel). For the feed modes, choose a **Range** (Everything, Most recent N, Oldest N, or a Date range).
5. Click **Export**. The toolbar badge shows progress; when it finishes, Chrome prompts you to save the ZIP (or image).

Options under the Range (for everything except a single post and the profile picture):

- **Save as files in a folder, not a ZIP** — files go straight into `Downloads/Instagram/<username>/<posts|images|reels|stories|highlights>/` as they download, with no 4 GB limit. Each run adds an `index_<time>.json`.
- **Only what I haven't downloaded yet** — skips what earlier exports of this account and type saved. If an export in folder mode stops halfway, run it again with this ticked (or click **Resume**) and it carries on.
- **File names** — leave empty for the defaults (`001_2024-05-01_Cabc123` in a ZIP, `2024-05-01_Cabc123` in a folder), or type a pattern with `{username}` `{date}` `{time}` `{code}` `{index}`.

> You can only export from **public accounts** or **private accounts you follow** — same as what your session can already see. Requests are paced a little under a second apart, and if Instagram asks the exporter to slow down, it waits (30 s, then 60 s, then 120 s) with a countdown in the popup.

ZIP layout for **All posts**:

```
username_posts_2026-06-06.zip
├── index.json
├── 001_2024-05-01_Cabc123/
│   ├── 01.webp
│   ├── 02.mp4
│   ├── 02_thumb.jpg
│   └── caption.txt
├── 002_2024-04-18_Cxyz789/
│   └── 01.webp
└── …
```

---

## Usage — Chat export

1. Go to <https://www.instagram.com/> and open a DM thread.
2. Click the **IG Exporter** icon in your toolbar and click **Start Capture**. The most recent messages load right away.
3. **Scroll up** inside the thread to pull in older history — each scroll fetches the next page from Instagram and the count climbs. Or click **Auto-scroll** to load the rest of the thread automatically; it stops when it reaches the beginning (or click it again to stop early).
4. When you've loaded as much as you want, click **Export chat**. Leave **Include photos, videos and voice notes** ticked to download them into the archive (they're fetched right away, because Instagram's links expire).
5. The exporter validates the structure, downloads the media, then prompts you to save `instagram_<title>_<timestamp>.zip`:

```
instagram_ana_2026-10-31T15-05-35Z.zip
├── index.html           # open this: the chat, offline, with search and jump-to-date
└── your_instagram_activity/messages/inbox/ana_1784…/
    ├── message_1.json   # Instagram's export format, media uris point at the files below
    ├── chat.txt         # readable transcript, oldest first, one heading per day
    ├── photos/
    ├── videos/
    └── audio/           # voice notes
```

> You control how much gets exported: stop scrolling (or stop auto-scroll) whenever you have enough, and Export packages exactly what's loaded so far.

### Only some dates

In the Chat tab, set **From** and/or **To** before exporting. Only messages in that range are saved (To includes the whole day).

### Several chats, or your whole inbox

1. With instagram.com open, click the **IG Exporter** icon, then **Export several chats or the whole inbox…** (in the Chat tab).
2. Your chats load newest first. Tick the ones you want (**Load more** for older ones), or pick **Inbox** and/or **Message requests** and tick **Every chat in these folders**.
3. Click **Export N chats**. Each chat is fetched in full (or just the date range, if set) and packed into one ZIP:

```
instagram_2_chats_2026-10-31T15-05-35Z.zip
├── index.html           # open this: every chat in the archive, with search
├── chats/001.html       # one offline page per chat
├── chats/002.html
└── your_instagram_activity/messages/inbox/<chat>/…   # same layout as above, one folder per chat
```

Exporting a whole inbox takes time: the extension paces its requests so Instagram doesn't block you, and waits it out if Instagram asks it to slow down.

---

## FAQ

**How do I export one Instagram chat?**
Open the conversation on instagram.com in Chrome (or another Chromium browser), click IG Exporter, then **Start Capture**, **Auto-scroll**, and **Export chat**. See [Usage — Chat export](#usage--chat-export).

**Can I download all my Instagram messages at once?**
Yes. Click **Export several chats or the whole inbox…** in the Chat tab, pick **Inbox** (and **Message requests** if you want those), tick **Every chat in these folders**, and click **Export**. See [Several chats, or your whole inbox](#several-chats-or-your-whole-inbox).

**Can I export only messages from certain dates?**
Yes. Set **From** and **To** in the Chat tab before exporting.

**Can I download only new posts since my last export?**
Yes. Tick **Only what I haven't downloaded yet** in the Profile tab. The extension remembers what each export saved (per account and type) and skips it.

**My export is huge or stopped halfway. What do I do?**
Tick **Save as files in a folder, not a ZIP**: files are saved one by one with no size limit. If it stops, run it again with **Only what I haven't downloaded yet** ticked, or click **Resume**, and it continues where it stopped.

**How do I read an exported chat?**
Unzip it and open `index.html` in any browser. It works offline: search the whole chat, jump to a date, view photos and play voice notes.

**Does it save the photos, videos and voice messages from a chat?**
Yes. The export is a ZIP with every photo, video and voice note from the loaded part of the chat saved as a file, plus a readable `chat.txt`. Untick **Include photos, videos and voice notes** for a quick text-only export.

**Is it safe? Does it need my Instagram password?**
It never asks for your password. It works with the session you're already logged in with, talks only to Instagram, and is open source. See [PRIVACY.md](PRIVACY.md).

**Can my Instagram account get banned for using it?**
It only loads what your account can already see, paces its requests and backs off when Instagram says "slow down". Very large bulk downloads always carry some risk of a temporary block, so prefer *Most recent N* or a date range on huge accounts.

**Does it work with private accounts?**
Yes, for private accounts you follow, and always for your own.

**How do I download Instagram stories, highlights or reels?**
Open the profile, click IG Exporter, switch to **Profile**, pick *Current stories*, *Story highlights* or *All reels*, and click **Export**. Opening a single highlight first exports just that one.

**It stopped working. What now?**
Click **Check Instagram** in the popup to see what's broken, then **Report a problem**. Instagram changes things often; fixes usually ship in a new release.

**Why isn't it on the Chrome Web Store?**
It will be (see the [roadmap](ROADMAP.md)). For now, install it from this repository as shown below.

---

## Output Schema

The output mirrors Instagram's official DYI export at the top level:

```json
{
  "participants": [{ "name": "Alice" }, { "name": "Bob" }],
  "title": "Alice",
  "is_still_participant": true,
  "thread_path": "inbox/alice_17841400000000000",
  "magic_words": [],
  "messages": [
    {
      "sender_name": "Alice",
      "timestamp_ms": 1715000000000,
      "content": "hey",
      "is_geoblocked_for_viewer": false,
      "is_unsent_image_by_messenger_kid_parent": false
    }
  ]
}
```

Each message may additionally include any of: `photos`, `videos`, `audio_files`, `share`, `reactions`, `call_duration`. Shared posts, reels, stories, profiles, and links all become a `share` with a `link` to the original.

---

## Architecture

The two capabilities use two independent pipelines.

**Chat export** (active, session-authenticated):

```
popup.js (Chat tab) ──▶ src/bridge.js (content script on instagram.com)
                                  │  fetches the open thread via persisted GraphQL queries
                                  ▼
                         instagram.com /api/graphql  (thread metadata + paged thread history)
                                  │
                                  ▼
                       src/normalizer.js → src/schema.js
                                  │
                                  ▼
             offscreen.js: media + chat.txt + offline pages → ZIP
```

Several chats skip the scrolling: bridge.js lists the chats (`IGDThreadListOffMsysPaginationQuery`), pages through each one itself, and hands every finished chat straight to the offscreen document, which builds one archive.

**Profile media export** (active, session-authenticated):

```
popup.js (Profile tab) ──job──▶ background.js (service worker)
                                       │  creates offscreen, mirrors progress → badge, runs chrome.downloads
                                       ▼
                                 offscreen.js (offscreen document)
                                       │  uses src/igapi.js + src/zip.js
              ┌────────────────────────┼─────────────────────────┐
              ▼                        ▼                          ▼
     instagram.com web API     *.cdninstagram.com /        builds ZIP in memory,
     (GraphQL relayed through   *.fbcdn.net (media bytes)  createObjectURL → SW download
      bridge.js in an open
      instagram.com tab)
```

- **`bridge.js`** — content script on instagram.com. On **Start Capture** it loads the open `/direct/t/<id>/` thread's metadata and newest page through the same persisted GraphQL queries Instagram's web client runs (`POST /api/graphql` with your session cookie and the page's `fb_dtsg` token); scrolling the thread (or **Auto-scroll**) pages older history, streaming the live count to the popup. It also runs the profile exporter's GraphQL queries, relayed by `background.js`, since `/api/graphql` rejects requests from the extension's own origin. Every query uses the id the page currently uses, read by **`pageids.js`** (which runs in instagram.com's own JavaScript world) and remembered in extension storage; if Instagram rejects that id, the built-in one is tried. All requests are paced and back off on `429`.
- **`normalizer.js` / `schema.js`** — map each `SlideMessage` node (text, images, videos, view-once media, voice messages, GIFs/stickers, shared reels/posts/links, call notices, …) to the DYI shape and validate it. If Instagram changes the DM API, these two plus `bridge.js` are where the fix goes.
- **`background.js`** — MV3 service worker; the stable hub for profile exports. Spins up the offscreen document, relays its GraphQL queries to an open instagram.com tab (injecting `bridge.js` if that tab predates the extension), mirrors progress onto the toolbar badge, and performs every `chrome.downloads.download` (chat JSON included), re-asserting the filename so download-manager extensions like IDM can't rename it.
- **`offscreen.js` / `offscreen.html`** — a headless offscreen document (the only context that can both fetch with host permissions *and* `URL.createObjectURL` a blob). Runs the chosen export pipeline, fetches CDN bytes with bounded concurrency, and assembles the ZIP.
- **`src/igapi.js`** — thin client over the endpoints instagram.com itself uses: the GraphQL queries behind its search box (username → id), profile page (posts grid, Reels tab, profile info, highlights tray) and story viewer (stories and highlights), plus media info (single posts and each reel's details). The one file to patch if Instagram changes its endpoints.
- **`src/zip.js`** — dependency-free, store-only ZIP writer with CRC32. No compression because media is already compressed.

Nothing is sent off-device. The only network traffic is to Instagram and its media CDNs, using your existing session.

---

## Limitations

**Profile media export:**

- **Login required.** You can only export public accounts or private ones you follow — exactly what your session can already see.
- **Unofficial endpoints.** It uses Instagram's own web API, which is undocumented and changes periodically. Query ids are read from the open instagram.com page automatically (falling back to the ids built into `src/igapi.js` and `src/bridge.js`), so most id rotations need no update. If a query is renamed or its shape changes, an update is still needed; **Check Instagram** shows which feature broke.
- **ZIPs are built in memory**, up to 4 GB. For big accounts, tick **Save as files in a folder, not a ZIP**: files are saved one by one, with no size limit.
- **File dates in folder mode.** Browsers can't set a downloaded file's date, so files saved to a folder are dated when they were downloaded; their names start with the post date. Files inside ZIPs carry the post date.
- **Only new** remembers what this browser saved. Deleting files doesn't make them "new" again; untick the option to download everything.
- **Reels take one request each.** The Reels tab lists only reel ids, so *All reels* fetches every reel's details separately. *Everything* on an account with thousands of reels is slow; use *Most recent N* or a date range.
- **Rate limits.** Requests are paced a little under a second apart, which makes very large exports slower but safer. If Instagram still answers `429`, the exporter waits 30 s, 60 s, then 120 s with a countdown, and stops with a clear message if that isn't enough.
- **Media URLs expire**, so files are fetched immediately during the run rather than listed for later.

**Chat export** — these are intentional non-goals, because the web client doesn't expose the equivalent data:

- **Media is fetched at export time.** Instagram's media links expire, so a file that can no longer be downloaded keeps its original link in `message_1.json` and is counted as failed in the popup.
- **`thread_path`** is a best-effort slug; the inner DYI folder IDs are private to the mobile/desktop DYI pipeline.
- **`creation_timestamp`** on media is derived from the message timestamp when Instagram doesn't expose a separate one.
- **Call events** are collapsed to one message per call (Instagram sends a "started" notice, then an "ended" or "missed" one), with the "started" text as `content`. Instagram's web API no longer exposes a duration, so `call_duration` is the gap between the two notices in seconds: it includes the time the call rang before it was answered, so it can read up to about a minute over the real talk time. Missed calls get `0`. The pairing matches Instagram's English notice text; in another UI language calls export as two plain text rows without a duration.
- **Emojis are preserved natively** rather than mimicking the DYI export's well-known mojibake (`ð`) encoding.
- **Unsupported/expired rows are skipped.** "Message unavailable" placeholders and view-once media whose URL has already expired carry no content, so they're dropped rather than exported as empty messages.

---

## Privacy & Security

- **Only Instagram endpoints.** Inspect `manifest.json`: host permissions are limited to `instagram.com` and Instagram's media CDNs (`*.cdninstagram.com`, `*.fbcdn.net`, and `*.fbsbx.com` for voice notes). Profile export calls Instagram's own web API with *your* logged-in session — never a third party.
- **No remote code.** All scripts ship in this repo — Manifest V3 forbids loading anything else, and the ZIP writer is hand-rolled rather than a bundled library you can't read.
- **No analytics.** No pings, no error reporting, no usage stats.
- **You control the file.** Every export uses `chrome.downloads.download` with `saveAs: true` — Chrome shows the save dialog every time.
- **Reports are drafts.** "Report a problem" only opens a prefilled GitHub issue page, with usernames removed. Nothing is posted unless you submit it.
- **Never for sale.** Extensions like this one have turned malicious after being sold. This one won't be sold.

The full statement, including why each permission is needed, is in [PRIVACY.md](PRIVACY.md). If you don't trust a binary you didn't build, you shouldn't — every file here is plain readable JavaScript. Read it.

---

## Development

The project is intentionally toolchain-free. There is **no build step, no bundler, no `npm install`**. Edit a `.js` file, hit reload on the extension card in `chrome://extensions/`, and you're done.

Layout:

```
igexporter/
├── manifest.json          # MV3 manifest
├── popup.html / popup.js  # toolbar UI (Chat + Profile tabs)
├── background.js          # service worker — profile export orchestrator
├── offscreen.html         # headless offscreen document host
├── offscreen.js           # profile export engine (fetch → zip → download)
├── src/
│   ├── bridge.js          # content script — all GraphQL (chat paging + relayed profile queries), pacing
│   ├── queryvars.js       # content script helper — merges the page's current query variables
│   ├── pageids.js         # runs in instagram.com's page — reads current query ids
│   ├── normalizer.js      # chat: raw SlideMessage nodes → DYI shape
│   ├── chatarchive.js     # chat: media plan, chat.txt transcript, optional Instagram encoding
│   ├── chatpage.js        # chat: the offline index.html viewer (search, jump to date, media)
│   ├── names.js           # file names: patterns, dates, safe characters
│   ├── schema.js          # chat: output validator
│   ├── igapi.js           # profile: Instagram web API client
│   └── zip.js             # profile: store-only ZIP writer
├── test/                  # self-checks: node test/<name>.test.mjs
└── icons/
```

Self-checks run with plain Node, no install: `node test/normalizer.test.mjs`, `node test/chatarchive.test.mjs`, `node test/chatpage.test.mjs`, `node test/names.test.mjs`, `node test/queryvars.test.mjs`, `node test/pacing.test.mjs`.

### Contributing

Issues and PRs welcome. Good first contributions:

- More content types in `normalizer.js` (stickers, polls, story replies)
- Tighter validation in `schema.js`
- Better thread-title fallbacks for group chats
- A Firefox port (the codebase is already MV3-compatible)

Please keep the project dependency-free. The whole point is that a privacy-sensitive user can read every line before installing.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

---

## License

[MIT](LICENSE) © Shakib Bin Kabir

---

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or Instagram. "Instagram" is a trademark of its respective owner. Use of this extension is subject to Instagram's Terms of Service. You are responsible for the content you export and how you use it.
