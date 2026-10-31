# Roadmap

Where IG Exporter is going, release by release, from 3.3.0 (current) to 5.0. The order puts reliability first, then complete chat archives, then the new name and design in 4.0, then new features on top of it, then a public store launch in 5.0. Dates aren't fixed; each release ships when it's tested.

The extension gets a new name in 4.0 (another product already uses "IG Exporter"), and a website at `<new-name>.thisissbk.com`.

## 3.4: Never broken for long ✅ shipped in v3.4.0

- Query ids read automatically from Instagram's own page, with the built-in ones as fallback
- "Check Instagram" button that tests every feature against your account
- One-click "Report problem" that opens a prefilled GitHub issue
- Gentle pacing, with the wait shown on screen
- Privacy statement: local only, no remote code, minimal permissions, open source, never for sale
- "Not affiliated with Instagram" line, and no Meta logos
- README rewritten around what people search for, like "export Instagram DMs" and "save Instagram voice notes"
- Pick the new name and reserve `<new-name>.thisissbk.com`

## 3.5: Chats with their media ✅ shipped in v3.5.0

- Photos, videos and voice notes saved as files in chat exports
- Plain-text copy of each chat next to the JSON
- Optional "match Instagram's encoding" setting, for tools built for Instagram's own data download

## 3.6: Read your chats offline ✅ shipped in v3.6.0

- Offline chat page (`index.html`) in every chat export
- Search inside a chat
- Jump to a date
- Voice notes playable in the page

## 3.7: Choose your chats ✅ shipped in v3.7.0

- Export several chats, or the whole inbox including message requests
- Date range for chat exports
- Filter a chat by voice notes, photos, links or calls
- Media gallery for each chat

## 3.8: Big exports ✅ shipped in v3.8.0

- Download only what's new on repeat exports
- Resume interrupted exports
- Save straight to a folder sorted by account and type, with no 4 GB limit
- File dates set to the post date
- Usernames in file names, and file name patterns you can set

## 3.9: Design foundation ✅ shipped in v3.9.0

- New brand: logo, toolbar icon, colors
- Design system: color, type, spacing, corner radius, shadow and motion tokens
- Light and dark themes that follow the system setting
- One premium typeface, bundled with the extension (no outside font services)
- Custom SVG icon set
- Website built at `<new-name>.thisissbk.com`: home, install guide, feature status, changelog, privacy, FAQ

## 4.0: New name, new look

- The new name, everywhere
- Redesigned popup that detects the open page and offers one main action: export this chat, profile, post or highlight
- First-run welcome screen
- Full-page Export Center: job queue, history, settings and Instagram status
- Progress screen: progress ring, live counts, time left, how far back it has reached, pacing countdown
- Done screen with a summary, "Open folder" and "View chat"
- Friendly error screens with Retry and Report, and designed empty states
- Motion system: shared timings, spring transitions, sliding tab indicator, fading panels, counting numbers, button feedback, loading placeholders instead of spinners
- Respects "reduce motion"; full keyboard use, focus rings, strong contrast, screen-reader labels
- Popup opens instantly with no layout jumps; animated progress and success on the toolbar badge
- README redesign: hero image, GIF demos, feature tour
- Website launch at `<new-name>.thisissbk.com`

## 4.1: The chat page, polished

- Chat bubbles, sticky date headers, smooth scrolling through 100,000+ messages
- Full-screen photo and video viewer, and voice notes with a waveform
- Printable book layout: cover page, chapter-style dates, clean page breaks; save as PDF through the browser's print

## 4.2: Pick before you export

- Preview grid with checkboxes for posts and highlights
- Offline `index.html` gallery in profile exports
- Settings page in sections, with a live preview of file name patterns

## 4.3: Everything you saved

- Saved posts and collections, with media, captions, authors, links and dates
- Collection browser with search in the gallery page

## 4.4: Chat insights

- Chat statistics: messages per person, active hours, first message
- Statistics page with animated charts
- Markdown chat export
- Voice-note transcripts, where Instagram provides them

## 4.5: More from profiles

- Tagged posts
- Highlight cover images
- Date range for highlights
- Your own archived stories

## 4.6: Your audience

- Your own followers and following as CSV
- Snapshot comparison for your own account: new followers, unfollowers, who doesn't follow you back
- One-time follower/following export of a public account, capped and slowly paced

## 4.7: On Instagram itself

- Download buttons on instagram.com that match its theme and never cover its controls, including saving a single carousel image
- Best-quality video (Instagram's separate video and audio combined)
- "Save images as JPG" option

## 4.8: Evidence and comments

- Evidence mode: export fingerprint, usernames, timezone, export log
- Comments export

## 4.9: Ready for everyone

- Firefox build
- UI translations, with layouts that also work right to left
- Full accessibility pass

## 5.0: Public launch

- Chrome Web Store listing, described as "back up your Instagram data"
- Store artwork: screenshots, promo tiles, a short demo video
- Store listing written around what people search for
- Website updated with store links

## Every release

- Full end-to-end test against live Instagram
- Feature status table updated, in the README and on the website
- CHANGELOG entry and GitHub release

## Later

- Launch posts in r/chrome_extensions, r/firefox, r/SideProject and r/opensource
- Helpful answers to existing "how do I export…" threads, only where a subreddit's rules allow links

## Not planned

- Anonymous story viewing, or blocking "seen" receipts
- Tracking another person's follows over time
- Saving view-once photos and videos
- Recovering someone else's deleted messages
- Bulk archiving strangers' accounts, scraping follower lists or emails, DM bots
