# Sheet guide

[← Back to the README](../README.md)

Your wishlist lives on the **Items** tab of your Google Sheet. Each row is one thing you'd like, and each column fills in part of its card.

Only `name` is required. Leave anything else blank, put the columns in any order, and add your own columns if you like: the site ignores ones it doesn't know.

## The columns

| Column | What to put there | Where it shows up |
|---|---|---|
| `name` | What the item is called | The card's title |
| `price` | A number. A `$` is fine | The card, the price filter, sorting and the gift helper |
| `starred` | Tick the box (or type `TRUE`) for the things you want most | They're marked as favorites and listed first. Each theme has its own marker: a gold star, a gumdrop, a brass bell |
| `shop` | Where it's sold: Etsy, Amazon, a local shop… | The card and the store filter |
| `category` | What kind of thing it is. Separate several with `:`, like `art: craft` | The category filter. Blank counts as **Other** |
| `quantity` | How many you'd like. Blank means 1 | A "2 of 2 left" tag. The gift helper can suggest it more than once |
| `size`, `color`, `notes` | Anything a gift-giver should know | The ⓘ details on the photo (hover on a computer, tap on a phone) |
| `image` | A link to a photo of it | The card's picture. See [Adding photos](#adding-photos) |
| `link` | The full address of the product page | The **View** button, which opens it in a new tab |

New categories and stores appear as filters on their own. Stores with only one item are grouped under **Other** in the filter so the list stays short, but each card still shows its real store.

> [!TIP]
> Headers are matched loosely, so `Starred?`, `Shop name` or `IMAGE` all work.

## Adding photos

**The easy way.** On the product page, right-click the photo and choose **Copy image address** (on a phone, press and hold the photo). Paste that into the `image` column.

**From Google Drive.** Paste the photo's share link. Set its sharing to **Anyone with the link** first.

**If a store's photos won't show.** Some stores block their images from appearing on other websites. Save the photo instead, upload it to the `wishlist-images` folder of your copy on GitHub, and put its file name in the `image` column (`dice` or `dice.jpg` both work). File names are case-sensitive, and photos around 900px wide keep the page quick.

If a photo can't load, the card shows a friendly placeholder instead.

## Gift cards

Set the row's `category` to `gift card` and put the smallest amount in `price` (like `From $25`), or leave it blank for any amount.

Gift cards show "From $25" or "Any amount", have no "bought it" button (several people can give one), always pass the price filter, and are listed after regular items. Tick `starred` on one and it's listed with your other favorites instead. The gift helper uses one to fill leftover budget after picking items. Gift cards don't get the tax & shipping buffer, since they're usually tax-free and sent by email, so the card gets everything left over.

Gift-givers who'd rather not give a gift card can tick **Hide gift cards** in the filters (it only shows up when your list has gift cards). That takes them off the shelves, but the gift helper may still suggest one to use up the last few dollars after real gifts.

## The Settings tab

| Setting | What it does |
|---|---|
| **Theme** | The look and wording of your shop. Pick one from the dropdown. New themes appear in it automatically. |
| **Your name** | Shown to gift-givers, e.g. "Sam won't see it" when they mark something as bought. |
| **List title** | Replaces the theme's title, like "Sam's Birthday List". Optional. |
| **Welcome message** | Replaces the theme's welcome note. Type `{i}` where you want the little ⓘ icon. Optional. |
| **Footer text** | Replaces the line of text at the very bottom of the page, like "Thanks for looking, see you at the party!" Optional. |
| **Tax & shipping buffer** | How much of a gift-giver's budget the gift helper holds back, like `15%`. Use `0%` to turn it off. |
| **Enable item claiming** | Lets gift-givers mark what they bought. **Wishlist → Set up gift claiming** fills in this row and the next for you. See [Gift claiming](claiming.md). |
| **Claim form link** | Your claim form's pre-filled link. See [Gift claiming](claiming.md). |
| **Claims tab link** | Usually not needed. Tells your site which tab holds the claims when it isn't the usual one. The Wishlist menu adds it for you when it's needed, and the [gift claiming guide](claiming.md#by-hand) says when to add it by hand. |

Leave a setting blank to use the theme's own wording. Changes show up on your site within about 5 minutes.

> [!IMPORTANT]
> Keep **Items** as the first tab of the sheet. Your published link opens the first tab, so moving it breaks the list.

The template also has two hidden tabs. Leave them as they are:

- **Themes** fetches the current list of themes, so your dropdown stays up to date.
- **Claimed items (Warning Spoilers!)** is where your site reads purchases once gift claiming is on. Don't open it unless you want spoilers.

If your Theme dropdown is empty, look for a yellow bar at the top of the sheet that says formulas are trying to reach external parties, and click **Allow access**. It only downloads the list of theme names ([more about this warning](about-the-warnings.md)). You can also just type a theme's name into the cell: the site understands it either way.

## Checking your setup

Add `?check` to the end of your site's address:

```
https://your-username.github.io/wishlist/?check
```

<img src="media/setup/check.webp" alt="The setup check: green ticks for sheet connected, Settings tab found, theme and gift claiming, and an info note listing optional settings rows to add" width="680">

You'll see a short checklist above your shop: whether your sheet and Settings tab were found, which theme loaded, whether gift claiming is connected, and when prices were last checked. Anything that needs attention comes with a fix in plain words. It never shows what anyone bought.

It also lists any settings rows your sheet doesn't have yet, which is handy after an update adds a new option. You never need to start a new sheet: click **Wishlist → Check for updates** to add them, or add the rows by hand from [Sheet changes](sheet-changes.md).
