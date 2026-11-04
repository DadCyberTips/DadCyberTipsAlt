# Snack desktop (source)

Source for the Dad Cyber Tips x SnackSpaceCon CTF: a fake Windows desktop in the browser
(Flag.txt behind a rigged Windows Update, fake ransomware / blue screen, File Explorer,
Command Prompt / PowerShell, Task Manager, Minesweeper and the Snack Cyber pinball table).

This branch holds the readable code. The published site is built from it and contains
only `index.html`, one minified `app.js`, one `app.css`, `img/`, `video/` and `robots.txt`,
with every flag string encoded so the files can't be searched for `{CTF}`.

## Build

    npm install
    npm run build        # writes dist/, and fails if any flag text is still readable in it

Publish the contents of `dist/` (for GitHub Pages: the root of the branch Pages serves).

## Where things are

| What | File |
|---|---|
| Flag.txt text and lock rules | `js/document.js` |
| Update timer (unlock at 45-75 s, shows 23%) | `js/update.js` |
| Crash 20-40 s after the unlock (75% ransom, 25% blue screen) | `js/bsod.js`, `js/ransom.js` |
| Fake file system, hidden files, decoy puzzles, placeholder flags | `js/filesystem.js` |
| todo.txt acrostic flag (first letter of each item: CTF 5N4CK 4774CK ...) | `todoList()` in `js/filesystem.js` |
| Pinball flag (shown at 31,337 points) | `FLAG` at the top of `js/pinball.js` |
| Light anti-inspection (right-click, F12, view-source) | `js/guard.js` |
| Mail app: two phishing emails + fake sign-in (locks Flag.txt) | `js/mail.js` |
| Double-extension trap `Invoice_Oct.pdf.exe` (starts the ransomware) | `js/filesystem.js`, `js/explorer.js` |
| SnackSync story: webcam light, whispers (10 min), ghost cursor (13 min); ending snacksync.exe stops it | `js/snacksync.js` |
| Honeypot flags: console, `robots.txt` -> `/flag-backup/`, HTML comment | `js/guard.js`, `flag-backup/`, `index.html`, `HONEYPOTS` in `tools/build.mjs` |

Flags use the format `{CTF}[...]`. Put them in plain quoted strings (not template
literals) so the build can find and encode them.

## Limits

The encoding and `robots.txt` stop casual reading, searching and well-behaved crawlers.
They do not stop someone who runs the page and inspects it: the browser must decode a
flag to show it. Keep this source (and its git history) in a private repository; only
the built `dist/` should be public.
