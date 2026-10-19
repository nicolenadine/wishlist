# Setup guide

[← Back to the README](../README.md)

This takes about 10 minutes, and you don't need to know any code. By the end you'll have your own wishlist site at an address like `https://your-username.github.io/wishlist/`.

**You'll need:** a Google account and a free [GitHub account](https://github.com/signup). GitHub is where your site lives. You'll visit it twice during setup and then hardly ever again.

| | Step | Where | Time |
|:-:|---|---|---|
| 1 | [Copy the spreadsheet](#1-copy-the-spreadsheet) | Google Sheets | 1 min |
| 2 | [Publish it](#2-publish-it) | Google Sheets | 1 min |
| 3 | [Copy the site](#3-copy-the-site) | GitHub | 1 min |
| 4 | [Connect the two](#4-connect-the-two) | GitHub | 2 min |
| 5 | [Turn on the website](#5-turn-on-the-website) | GitHub | 2 min |
| 6 | [Make it yours](#6-make-it-yours) | Google Sheets | as long as you like |

> [!TIP]
> **Keep this guide open as you go.** GitHub can't open links in a new tab for you, so open the buttons below with **Ctrl-click** (**⌘-click** on a Mac, or press and hold on a phone and choose **Open in New Tab**). Then you can switch back here instead of retracing your steps.

---

## 1. Copy the spreadsheet

[![Copy the sheet template](https://img.shields.io/badge/Copy_the_sheet_template-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)](https://docs.google.com/spreadsheets/d/1xcYWpix2X1ZDpUfDu7IXhiKeWtpUENBPletfdRZQ8g8/copy)

Click **Make a copy**. A copy opens in your own Google Drive with three tabs at the bottom (plus a couple of hidden ones it uses behind the scenes):

- **Items:** your wishlist, one row per thing. It starts with a few examples.
- **Settings:** your theme, your name and a few other choices.
- **How to use:** a cheat sheet for the columns.

A few seconds after it opens, a **Wishlist** menu appears at the top, next to **Help**. You don't need it for setup. Later it adds new sheet options and sets up gift claiming for you ([more about it](sheet-menu.md)).

> [!NOTE]
> Your copy may show a yellow bar: *"Some formulas are trying to send and receive data from external parties."* Click **Allow access**. It's the Theme dropdown fetching the list of available themes, so new ones show up for you automatically. Nothing from your sheet is sent anywhere. ([Why Google asks, and how to check](about-the-warnings.md).)

<img src="media/setup/01-copy-sheet.webp" alt="The Copy document dialog, with the Make a copy button highlighted" width="360">

## 2. Publish it

This lets your website read the sheet. It doesn't make the sheet editable by anyone else.

1. In your copy, open **File → Share → Publish to web**.
2. Change **Entire document** if needed, and change **Web page** to **Comma-separated values (.csv)**.
3. Click **Publish**, then **OK**.
4. Copy the link it shows. You'll paste it in step 4.

<img src="media/setup/02-publish-menu.webp" alt="The File menu open at Share, then Publish to web" width="520">

<img src="media/setup/03-publish-dialog.webp" alt="The Publish to web dialog: Entire document, changed to Comma-separated values, Publish, then copy the link" width="520">

> [!IMPORTANT]
> Choose **Entire document**, not just the Items tab, so the site can read your Settings tab too.

## 3. Copy the site

[![Fork this repo](https://img.shields.io/badge/Fork_this_repo-24292F?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nicolenadine/wishlist/fork)

Sign in to GitHub if it asks, then click **Create fork**. "Fork" is GitHub's word for your own copy. You'll land on it at `github.com/your-username/wishlist`.

<img src="media/setup/04-fork.webp" alt="The Fork button at the top right of the repo page" width="420">

## 4. Connect the two

1. On your copy's page, click the name **config.js** in the list of files. Click the name itself, on the left: the grey text beside it opens a different page (if you land there, just go back).
2. Click the **pencil icon** (top right of the file) to edit it.
3. Find the line that starts with `sheetUrl:`. Replace the link between the quotes with the one you copied in step 2. Keep the quote marks on both sides and the **comma at the very end** of the line.
4. Click **Commit changes…**, then **Commit changes** again.

<img src="media/setup/05-open-config.webp" alt="The file list on your copy of the repo, with config.js highlighted" width="620">

<img src="media/setup/06-edit-config.webp" alt="config.js open, with the pencil (edit) icon and the sheetUrl line highlighted" width="760">

It should look like this, with your own link. Note the comma at the end:

```js
sheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-…/pub?output=csv',
```

> [!TIP]
> That's the only file you ever need to change. Everything else is set in your sheet.

## 5. Turn on the website

1. On your copy's page, click **Settings** (the gear tab along the top), then **Pages** in the left sidebar.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `main` and the folder to `/ (root)`, then click **Save**.

<img src="media/setup/07-pages.webp" alt="GitHub Pages settings: Settings tab, Pages, Source set to Deploy from a branch, branch main and folder root, Save, and the live site address" width="760">

Wait a minute or two, then refresh the page. A box at the top shows your site's address. Click **Visit site** and you'll see the example items in your new shop. 🎉

## 6. Make it yours

Back in your sheet:

- **Items tab:** replace the examples with things you'd like. The [sheet guide](sheet-guide.md) explains every column and how to add photos.
- **Settings tab:** pick a **Theme**, type **Your name**, and give your list a title.

Changes show up on your site within about 5 minutes. Just refresh.

> [!TIP]
> Want to make sure everything's connected? Open your site with `?check` on the end, like `https://your-username.github.io/wishlist/?check`, for a quick checklist.

When you're happy with it, share your site's address with family and friends.

> [!TIP]
> Before you share, open your site once on each of your own devices with `?shield` on the end, like `https://your-username.github.io/wishlist/?shield`. That hides purchases in that browser, so you won't see spoilers.

---

## Optional extras

- **[Gift claiming](claiming.md):** let gift-givers mark what they bought so nobody doubles up. One click with **Wishlist → Set up gift claiming**.
- **[Daily price checks](price-checks.md):** show sales on the cards. One click to turn on.
- **Get new features later:** on your copy's GitHub page, click **Sync fork → Update branch**. Your settings are kept. Now and then an update also adds something to the sheet: click **Wishlist → Check for updates** in your sheet to get it.

> [!CAUTION]
> If **Sync fork** ever says it can't update automatically, or offers to **Discard commits**, don't click Discard. It would erase your own changes: your sheet link in `config.js`, any photos you uploaded, and any themes you made. Close the box instead (nothing has changed yet) and [open an issue](https://github.com/nicolenadine/wishlist/issues/new) with a link to your copy. It's fixable.
