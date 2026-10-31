# Store listing

What the Firefox Add-ons listing says, kept here so the Chrome Web Store listing can reuse it later.

- **Listing:** https://addons.mozilla.org/firefox/addon/kept-instagram-backup/
- **Name:** Kept: Instagram chat & post backup (from `_locales/en/messages.json`)
- **Summary:** Keep Instagram chats with their photos and voice notes, and posts, reels, stories and highlights, on your own computer.
- **Categories:** Social & Communication; Download Management
- **Tags:** instagram, backup, export, download, messages
- **Homepage:** https://kept.thisissbk.com
- **Support:** https://github.com/shakibbinkabir/kept/issues
- **Licence:** MIT
- **Privacy policy:** [PRIVACY.md](../PRIVACY.md)
- **Screenshots (1280×800):** the offline chat archive with Instagram's cards, the popup (capturing a chat; a profile with the date picker), the Export Center's settings

## Description

Kept saves your Instagram on your own computer: chats with their photos, videos and voice notes, and posts, reels, stories and highlights. Nothing leaves your browser.

**Chats**

- Save one chat, several, or your whole inbox, in minutes instead of waiting days for Instagram's data download.
- Photos, videos and voice notes are saved as real files, next to the messages.
- Open index.html to read the chat offline, the way Instagram shows it: bubbles, shared posts and reels as cards, voice notes that play, search, jump to a date, a gallery and insights.
- Keep just a date range, or print the chat as a book or a PDF.
- The format matches Instagram's own export (message_1.json), with chat.txt and chat.md too.

**Profiles**

- Posts, images, reels, stories, highlights and profile pictures from any public account, or a private one you follow.
- Your own saved posts, by collection.
- Everything, the latest few, or a date range; pick posts from a grid; download only what's new.
- Best-quality video (up to 1080p with sound), and a save button on photos and videos on instagram.com.
- Followers and following as a spreadsheet, with who unfollowed since last time.
- Evidence mode: a SHA-256 for every file and one fingerprint for the whole export.

**Private by design**

- No account, no password, no server: Kept uses the Instagram session you're already logged in with.
- It talks only to Instagram and Instagram's media servers. No analytics, no ads, no tracking.
- Free and open source under the MIT licence. Every line is on GitHub.

In English, Bangla, Arabic and Spanish.

Kept is an independent project, not affiliated with Instagram or Meta.

## Notes for reviewers

Kept is open source: https://github.com/shakibbinkabir/kept (tag v5.0.0). The package is the repository's files as they are, with no minification, bundling or transpiling. `firefox/build.mjs` only copies them and adjusts `manifest.json`: a background page in place of the service worker and offscreen document, the gecko id, and `data_collection_permissions`.

How it works: a content script on instagram.com (`src/bridge.js`) calls Instagram's own web API (`/api/graphql`) with the user's existing session, the same requests instagram.com makes, paced about a second apart. Media is downloaded from Instagram's servers (cdninstagram.com, fbcdn.net, fbsbx.com). ZIP files are built in the background page (`offscreen.js`, `src/zip.js`) and saved with the downloads API. Nothing is sent anywhere else; there is no server.

Linter warnings: `offscreen.*` and `downloads.onDeterminingFilename` are Chrome-only and skipped when Firefox doesn't have them. The two `import()` calls in `src/bridge.js` load the extension's own files (`src/normalizer.js` and `src/schema.js`, via `runtime.getURL`) into the content script.

To test: log in to instagram.com and open a direct message thread, click the Kept toolbar button, allow access to instagram.com when asked, then click Start capture and Export chat. Or open a public profile (for example instagram.com/nasa), switch to Profiles, and export the profile picture or the most recent 3 posts.
