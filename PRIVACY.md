# Privacy

Kept (called IG Exporter until 4.0) runs entirely in your browser. There is no server, no account and no analytics.

## What it does with your data

- **Your Instagram session.** It uses the session you're already logged in with on instagram.com, the same way the Instagram website does. It never asks for, sees or stores your password.
- **What it reads.** Only what you ask it to export: the open chat, or the profile, post, reel, story or highlight you choose. It can only see what your account can already see.
- **Where it sends data.** Nowhere except Instagram and Instagram's own media servers (`instagram.com`, `cdninstagram.com`, `fbcdn.net`, `fbsbx.com`). Nothing is sent to the developer or to anyone else.
- **What it saves.** Your exports, as files on your computer, where you choose to save them. In the extension's own storage it keeps four things: the current ids of the Instagram queries it uses, read from instagram.com so it keeps working when Instagram changes them; your settings; for "Only what I haven't downloaded yet", the codes of the posts, reels and stories each export saved, per account; and the Export Center's history of your last 200 exports (file names, counts and dates). They never leave your computer, and the Export Center can clear the history and the saved codes. Clearing the extension's data or removing the extension deletes them.
- **Reporting a problem.** "Report a problem" opens a GitHub issue page in a new tab, filled in with the error, the extension version and the Instagram check results, with usernames removed. Nothing is posted until you review it and click submit yourself.

## Permissions, and why

| Permission | Why |
| --- | --- |
| Access to `instagram.com`, `cdninstagram.com`, `fbcdn.net` and `fbsbx.com` | To load what you export from Instagram and its media servers |
| `downloads` | To save the export files you ask for, and show them in their folder |
| `downloads.open` | To open a chat you saved as a folder, when you click **Open chat** |
| `offscreen` | To build ZIP files in the background, so closing the popup doesn't stop an export |
| `storage` | To remember Instagram's current query ids, your settings, which posts you've already saved, and your export history |
| `scripting`, `activeTab` | To reconnect to an instagram.com tab that was open before the extension was installed or reloaded |

## Promises

- No remote code: everything the extension runs is in this repository.
- No ads, no tracking, no analytics, no selling of data.
- Open source under the MIT license, so anyone can check all of the above.
- **Never for sale.** Kept won't be sold or handed to anyone who might change these rules. Browser extensions in this category have turned malicious after being sold; this one won't be.

## Not affiliated

Kept is an independent project. It is not affiliated with, endorsed by or sponsored by Instagram or Meta. "Instagram" is a trademark of Meta Platforms, Inc.

Questions: [open an issue](https://github.com/shakibbinkabir/kept/issues).
