# Privacy

Kept (called IG Exporter until 4.0) runs entirely in your browser. There is no server, no account and no analytics.

## What it does with your data

- **Your Instagram session.** It uses the session you're already logged in with on instagram.com, the same way the Instagram website does. It never asks for, sees or stores your password.
- **What it reads.** Only what you ask it to export: the open chat, the profile, post, reel, story or highlight you choose, or your own saved posts and collections. It can only see what your account can already see.
- **On instagram.com.** Besides the queries above, Kept adds a small save button that appears over photos and videos when you hover them. It reads only which post you're pointing at, changes nothing on the page, and can be turned off in the Export Center.
- **Evidence mode.** If you turn it on, the export's `evidence/export.json` names the account that made it (its id and username), your timezone and your browser, so the record is complete. That stays in the export on your computer like everything else.
- **Where it sends data.** Nowhere except Instagram and Instagram's own media servers (`instagram.com`, `cdninstagram.com`, `fbcdn.net`, `fbsbx.com`). Nothing is sent to the developer or to anyone else.
- **What it saves.** Your exports, as files on your computer, where you choose to save them. In the extension's own storage it keeps five things: the current ids of the Instagram queries it uses, read from instagram.com so it keeps working when Instagram changes them; your settings; for "Only what I haven't downloaded yet", the codes of the posts, reels and stories each export saved, per account; the Export Center's history of your last 200 exports (file names, counts and dates); and, if you export your own followers and following, the latest list of who they are (ids and usernames), so the next export can show who followed or unfollowed you. They never leave your computer, and the Export Center can clear the history, the saved codes and the follower snapshot. Clearing the extension's data or removing the extension deletes them.
- **Reporting a problem.** "Report a problem" opens a GitHub issue page in a new tab, filled in with the error, the extension version and the Instagram check results, with usernames removed. Nothing is posted until you review it and click submit yourself.

## Permissions, and why

| Permission | Why |
| --- | --- |
| Access to `instagram.com`, `cdninstagram.com`, `fbcdn.net` and `fbsbx.com` | To load what you export from Instagram and its media servers |
| `downloads` | To save the export files you ask for, and show them in their folder |
| `downloads.open` | To open a chat you saved as a folder, when you click **Open chat** |
| `offscreen` (Chrome only) | To build ZIP files in the background, so closing the popup doesn't stop an export. Firefox runs the same code in the extension's background page instead |
| `storage` | To remember Instagram's current query ids, your settings, which posts you've already saved, and your export history |
| `scripting`, `activeTab` | To reconnect to an instagram.com tab that was open before the extension was installed or reloaded |

## Promises

- No remote code: everything the extension runs is in this repository.
- No ads, no tracking, no analytics, no selling of data. On Firefox Add-ons, Kept declares that it collects no data.
- Open source under the MIT license, so anyone can check all of the above.
- **Never for sale.** Kept won't be sold or handed to anyone who might change these rules. Browser extensions in this category have turned malicious after being sold; this one won't be.

## Not affiliated

Kept is an independent project. It is not affiliated with, endorsed by or sponsored by Instagram or Meta. "Instagram" is a trademark of Meta Platforms, Inc.

Questions: [open an issue](https://github.com/shakibbinkabir/kept/issues).
