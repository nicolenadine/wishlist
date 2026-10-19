# Themes

A theme sets the look and the wording of your wishlist shop. Each theme is a folder in here.

| Theme | Folder | What it's like |
|---|---|---|
| RPG Item Shop | `rpg-shop` | A cozy pixel-game shop. Starred items are *Legendary*, gift-givers *Loot* what they buy, and Smudge the soot sprite picks gifts. |
| Hearthside | `hearthside` | A classic, elegant Christmas in evergreen, cranberry and gold. Large, easy-to-read text and plain wording: starred items are *Top Picks* and gift-givers press *I bought this*. |
| Winter Lights | `winter-lights` | Navy and silver with a strand of little lights, for any winter holiday. Same large text and plain wording as Hearthside. |
| Shiny & Bright | `shiny-bright` | Mid-century retro holiday: soft aqua, ornament pink and mint, tinsel trees and atomic starbursts. Large text and plain wording. |
| Krampusnacht | `krampusnacht` | The dark side of the holidays: near-black, deep oxblood and brass with an old-print title. Starred items are *Most Wanted*, gift-givers *Claim* what they buy, and a woodcut Krampus runs the gift helper. |
| Gingerbread | `gingerbread` | A kawaii bakery in cookie-brown, icing white, candy pink and mint, with piped-icing edges. Starred items are *Extra Sweet* (marked with a gumdrop), and Ginny the gingerbread cookie runs the gift helper. Works for the holidays or birthdays. |
| Neotropolis | `neotropolis` | A retro-future neon city at night: terminal green on black, an amber grid sun, and Volt the robot running the gift helper. Starred items are *Priority* and gift-givers mark what they've *Acquired*. |
| Starter | `starter` | Plain and simple, with everyday wording and no mascot. A blank slate to copy when making your own. |

## Picking a theme

In your sheet's **Settings** tab, pick a theme from the **Theme** dropdown. Your site switches within about 5 minutes.

The dropdown keeps itself up to date: when a new theme is added here, it shows up in everyone's dropdown automatically. If you pick one that's newer than your copy of the site, your site keeps its current look until you update your copy (**Sync fork → Update branch** on GitHub). Your site's [setup check](../docs/sheet-guide.md#checking-your-setup) will tell you when that's the case.

No Settings tab? Open `config.js`, find `theme:`, and put the folder name between the quotes:

```js
theme: 'rpg-shop',
```

**Try before you switch:** add `?theme=` and a folder name to the end of your site's address, like `https://you.github.io/wishlist/?theme=starter`. Only that page view changes; your site keeps its theme for everyone else.

## Making your own theme

**The easy way: ask an AI.** Describe the look you want to Claude, ChatGPT or another AI, and preview its answer in the [Theme Lab](https://nicolenadine.github.io/wishlist/theme-lab.html). No code needed. See [Make a theme with AI](../docs/make-a-theme-with-ai.md).

**By hand:**

1. Copy the `starter` folder and rename the copy, using lowercase letters, numbers and dashes (for example `cozy-cabin`).
2. In `theme.css`, change the colors and fonts. Every one has a comment saying where it shows up.
3. In `theme.json`, give it a name and change any wording you like (see the list below).
4. Optionally add art and a mascot (see below).
5. Preview it with `?theme=your-folder-name`, or paste the files into the [Theme Lab](../theme-lab.html) to check them before you commit.
6. Type its name into the **Theme** cell in your sheet's Settings tab, like `Cozy Cabin`. The site finds the `cozy-cabin` folder from the name, so there's nothing else to register. (Don't add it to `themes.csv`: that file lists shared themes, and editing it in your copy can make **Sync fork** stop with a conflict.)

## Share your theme with everyone

Made something you like? Contribute it, and it will appear in every wishlist's Theme dropdown. 🎁

1. Make your theme in your own copy of the repo, following the steps above, and check it with `?theme=your-folder-name`.
2. Make sure it's all yours to share: your own art, and fonts from [Google Fonts](https://fonts.google.com) (they're free to use). No characters, logos or artwork from other people's work.
3. On your copy's GitHub page, click **Contribute → Open pull request**. Give it a short title like "Add the Cozy Cabin theme", describe the look in a sentence or two, and attach a screenshot.
4. A pull request is a suggestion, not a change: nothing happens to the main project until it's reviewed. You might get a question or two before it's added. When it's added, it also gets a line in `themes.csv` so it shows up in everyone's dropdown; you don't need to add that yourself.

New to pull requests? GitHub has a friendly [guide to your first pull request](https://docs.github.com/en/get-started/start-your-journey/hello-world). Themes are the easiest kind of contribution, because they're only CSS, JSON and SVG and can't break anyone's shop.

By contributing, you agree to share your theme under the project's [GPLv3 license](../LICENSE).

### What goes in a theme folder

```
your-theme/
  theme.css     colors, fonts, and any extra styling
  theme.json    name, wording, mascot, and which art files to use
  art/          optional SVG pictures
```

Themes are CSS, JSON and SVG only. No JavaScript, so a theme can't break the shop or do anything sneaky.

### Wording (`theme.json` → `"text"`)

List only the words you want to change; everything else uses the default.

- `{name}`-style placeholders get filled in. `{mascot}` is your mascot's name, and `{owner}` is the owner name from `config.js`.
- `"one | many"` picks the right form for the number: `"{n} item | {n} items"`.
- `{i}` (in `welcome`) shows the little info icon.
- A blank `""` hides that piece (for example the `eventTag` badge).

| Key | Default |
|---|---|
| `title` | My Wishlist |
| `eventTag` | *(blank: hidden)* |
| `welcomeName` | *(blank: hidden)* |
| `welcome` | Everything here is on my wishlist. Starred items are the ones I want most. Tap the {i} on a photo for sizes, colors and notes. |
| `footer` | Made from a spreadsheet. |
| `loading` | loading… |
| `stat.items` | {n} item \| {n} items |
| `stat.starred` | {n} starred |
| `stat.shops` | {n} shop \| {n} shops |
| `starred` | Starred |
| `starredOnly` | Starred only |
| `hideGiftCards` | Hide gift cards |
| `starBadge` | Starred: most wanted |
| `searchLabel` | Search |
| `searchPlaceholder` | Search the list |
| `typeFilter` | Category |
| `shopFilter` | Shop |
| `priceFilter` | Price |
| `reset` | Reset filters |
| `filtersLabel` | Filters |
| `resultsLabel` | Wishlist items |
| `sortLabel` | Sort |
| `sortStarred` | Starred first |
| `sortLow` | Price: low to high |
| `sortHigh` | Price: high to low |
| `sortName` | Name A to Z |
| `count` | {left} / {total} available |
| `countLooted` |  · {n} bought |
| `empty.title` | Nothing matches |
| `empty.text` | No items match those filters. Loosen one or reset them. |
| `detailsTitle` | DETAILS |
| `detailsAria` | Details for {name} |
| `details.size` | Size |
| `details.color` | Color |
| `details.wanted` | Wanted |
| `details.notes` | Notes |
| `details.price` | Price |
| `details.checked` | Checked {date} on {shop} |
| `hint` | Sizes & notes in here |
| `dismissTip` | Dismiss tip |
| `view` | View |
| `viewAria` | View {name} on {shop} (opens in a new tab) |
| `sale` | Sale −{pct}% |
| `wasAria` | was {amount} |
| `qtyWanted` | Quantity wanted |
| `qtyLeft` | {left} of {qty} left |
| `qtyLeftTitle` | {left} of {qty} still needed |
| `giftFrom` | From {amount} |
| `giftAny` | Any amount |
| `priceUnknown` | price ? |
| `loot` | Bought it |
| `lootAria` | Mark {name} as bought |
| `lootedTag` | Bought |
| `lootedStamp` | BOUGHT |
| `lootedNote` | Already gifted. Thank you! |
| `lootTitle` | Mark as bought? |
| `lootCopy` | This tells other gift-givers you bought it, so nobody doubles up. {owner} won't see it. |
| `owner` | The wishlist owner |
| `lootQty` | How many did you get? |
| `lootLeft` | {left} of {qty} still needed. |
| `lootError` | Couldn't save that. Check your connection and try again. |
| `cancel` | Cancel |
| `lootConfirm` | Mark as bought |
| `toast` | Thanks! {qty}{name} is marked as gifted. |
| `undo` | Undo |
| `dismiss` | Dismiss |
| `mode.test` | Test mode: fake purchases, nothing is sent |
| `mode.shield` | Spoiler shield on |
| `mode.shieldTitle` | Purchases are hidden in this browser. Visit with ?shield=off to turn this off. |
| `plannerTitle` | Gift helper |
| `plannerTag` | *(blank: hidden)* |
| `mascotLabel` | *(blank: hidden)* |
| `budgetLabel` | Budget |
| `countLabel` | Number of gifts |
| `optional` | (optional) |
| `countPlaceholder` | any |
| `planner.loading` | Loading the list… |
| `planner.idle` | Enter a budget and I'll suggest gifts that fit. |
| `planner.emptyTitle` | No picks yet |
| `planner.emptySub` | Only items the filters are showing are considered. |
| `planner.emptySubClaims` | Only items the filters are showing are considered, and anything already bought is skipped. |
| `planner.bufferNote` | {pct}% of your budget is saved for tax and shipping. |
| `planner.none` | Nothing fits under {budget} once some is saved for tax and shipping. Try a bigger budget or fewer filters. |
| `planner.noneTitle` | Nothing fits |
| `planner.noneSub` | After setting aside {reserve} for tax and shipping, nothing still available fits in {budget}. Raise the budget or loosen the filters. |
| `planner.onlyCard` | Nothing on the list fits, but a {amount} {name} does! |
| `planner.foundOne` | Found one! |
| `planner.foundMany` | Found {n}! |
| `planner.topUp` | …plus a {amount} {name} to use up the rest! |
| `planner.starredFirst` | Starred items went in first. |
| `planner.squeezed` | Used as much of the budget as possible. |
| `planner.picksTitle` | Suggested gifts |
| `planner.gifts` | {n} gift \| {n} gifts |
| `planner.plusCard` |  + gift card |
| `planner.giftCard` | gift card |
| `planner.total` | Gifts {amount} |
| `planner.reserve` | + ~{amount} est. tax & shipping |
| `planner.spare` | {amount} spare |
| `planner.bufferHint` | About {pct}% of the budget is set aside as a rough guess for tax and shipping. Real costs vary by shop and location, so check the total at checkout. |
| `planner.giftCardNoTax` | Gift cards skip this, since they are usually tax-free and sent by email. |
| `planner.onlyFit` | Only {n} of {want} gifts fit this budget with the current filters. |
| `planner.maxBudget` | The planner can only count up to {amount} at a time. |
| `planner.claimHint` | Bought one? Mark it on its card so nobody doubles up. |
| `planner.giftCardMeta` | Gift card |
| `planner.giftCardMetaRest` | Gift card · uses up the rest |
| `planner.undone` | Undone. It's back on the list. |
| `error.title` | The list is unavailable |
| `error.text` | The wishlist could not be loaded right now. Please refresh the page in a little while. |
| `error.line` | I couldn't reach the spreadsheet. Try refreshing in a minute? |
| `setup.title` | No sheet connected yet |
| `setup.text` | Paste your published Google Sheet link into sheetUrl in config.js. The README has step-by-step setup. |
| `setup.line` | This list has no items yet. Someone needs to connect a spreadsheet. |

### Art (`theme.json` → `"art"`)

Each slot takes the path of an SVG file inside your theme folder. Leave a slot out and that spot is simply empty.

| Slot | Where it shows | Size |
|---|---|---|
| `heroSky` | Top-right corner of the header (clouds, stars) | 420 × 170 |
| `heroScene` | Strip along the bottom of the header (hills, a little house) | wide: 1200 × 178, cropped on phones |
| `portrait` | Small picture beside the welcome message | 46 × 46 |
| `mascotIdle`, `mascotHappy`, `mascotSad` | The gift planner's helper, waiting / found gifts / nothing fits | 64 × 64 |
| `lootBag` | Pops up when a gift-giver marks something as bought | 96 × 96 |

The mascot shows only if at least one mascot slot is filled. Describe each mood for screen readers in `"mascot"`:

```json
"mascot": {
  "name": "Smudge",
  "idle": "Smudge, a fuzzy little soot sprite, looking up",
  "happy": "Smudge, beaming",
  "sad": "Smudge, sweating nervously"
}
```

Tips for art: set a `viewBox` on the `<svg>`, keep files small, and use plain shapes. Scripts, event handlers and embedded HTML are stripped out when the art loads.
