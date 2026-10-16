---
name: wishlist-theme
description: Design a theme (colors, fonts, wording and optional SVG pictures) for a Wishlist shop site made from the github.com/nicolenadine/wishlist template. Use when someone wants to make, change or fix a wishlist theme, or pastes theme.css or theme.json files.
---

# Making a Wishlist theme

A Wishlist shop is a small website that shows someone's wishlist (from a Google Sheet) as a little shop. Friends and family browse it, filter it, use a gift helper that suggests gifts for a budget, and mark things as bought so nobody doubles up.

A **theme** changes how the shop looks and talks. It is two text files plus optional pictures:

```
theme.css      colors, fonts, and any extra styling
theme.json     the theme's name, its wording, and which pictures to use
art/*.svg      optional pictures (header art, a mascot, and so on)
```

Themes are CSS, JSON and SVG only. No JavaScript.

The person asking is often **not a developer**. They'll paste your whole answer into the **Theme Lab** (a page on their wishlist site, or on the public demo at https://nicolenadine.github.io/wishlist/theme-lab.html), which finds the files in your answer and shows them on a sample shop right away. So the most important thing is that your answer is complete and in the format below, every time.


## How to work with the person

1. **Ask a few quick questions first** (at most three, in one message), unless they've already told you:
   - What's it for, and what feeling? (A holiday, a birthday, "just because"; cozy, elegant, playful, spooky…)
   - Who will visit? If it's older relatives, plan for larger text and plain wording.
   - Pictures and a little mascot, or keep it simple?

   If they say "you pick" or "surprise me," pick confidently and say what you chose in one sentence.

2. **Make the theme.** Send every file, in the format below.

3. **End with one short line** telling them what to do next:
   > Paste this whole answer into the Theme Lab to see it. Tell me anything you'd like changed, or anything it says is hard to read.

4. **When they ask for changes, send all the files again**, complete, with the changes made. Never send only the part that changed, and never say "the rest stays the same." The Theme Lab replaces the whole theme with whatever is pasted.

Keep your explanations short and plain. Don't explain CSS to them unless they ask.


## Answer format (the Theme Lab depends on this)

Put each file in its own code block, with the language and the file name on the opening line:

````
```css theme.css
...
```

```json theme.json
...
```

```svg art/hero-scene.svg
<svg ...>...</svg>
```
````

- One code block per file. Pictures always go in `art/` and end in `.svg`.
- Every picture you list in `theme.json` must have its own block, and every picture block must be listed in `theme.json`.
- `theme.json` must be valid JSON: double quotes, no comments, no trailing commas.
- Chat text before and after the blocks is fine.


## theme.css

Start with `:root` and set these color and font variables. Anything you leave out falls back to plain defaults, but a good theme sets all of them.

```css
@import url('https://fonts.googleapis.com/css2?family=...&display=swap');  /* optional, must be first */

:root {
  --text: ;            /* main text, outlines, icons */
  --text-soft: ;       /* secondary text */
  --dark: ;            /* toast, tip bubble, mascot name tag */
  --dark-rgb: ;        /* --dark as "r, g, b" numbers, e.g. 31, 36, 48 */
  --on-dark: ;         /* text on --dark or --text backgrounds */
  --page: ;            /* page background */
  --header: ;          /* header background */
  --tint: ;            /* shop tags, counts */
  --input: ;           /* text boxes */
  --surface: ;         /* cards and panels */
  --star: ;            /* starred items: badge, tag */
  --star-rgb: ;        /* --star as "r, g, b" */
  --star-soft: ;       /* "starred only" toggle, bought button */
  --star-card: ;       /* starred card background */
  --star-shadow: ;     /* toast shadow */
  --star-shadow-rgb: ; /* --star-shadow as "r, g, b" */
  --star-line: ;       /* starred card outline */
  --accent: ;          /* name tags, gift icon */
  --accent-mid: ;      /* gift icon lid */
  --accent-soft: ;     /* category chips and tags */
  --secondary: ;       /* View and Reset buttons */
  --secondary-hover: ; /* View button hover */
  --line: ;            /* soft outlines */
  --line-strong: ;     /* input and chip outlines */
  --focus: ;           /* keyboard focus ring, link hover */
  --photo-bg: ;        /* behind item photos */
  --shadow-rgb: ;      /* shadow color as "r, g, b" */
  --sale: ;            /* sale price */
  --sale-soft: ;       /* sale tag */
  --sale-text: ;       /* sale tag text */
  --gift: ;            /* gift card price */
  --looted-bg: ;       /* bought card background */
  --looted-line: ;     /* bought card outline */
  --looted-text: ;     /* bought card text */
  --font-display: ;    /* headings and labels */
  --font-body: ;       /* everything else */
}
```

Every `-rgb` variable must be the same color as its partner, written as three numbers.

### Going further

After `:root`, you can restyle anything. These are the parts of the page worth knowing:

| Part | Selectors |
|---|---|
| Header | `.hero`, `h1` (list title), `.event-tag`, `.stats`, `.stat`, `.stat-gold` |
| Welcome box | `.dialog`, `.dialog p`, `.dialog-name`, `.dialog-portrait`, `.dialog-caret` |
| Gift helper | `.planner`, `.planner-title`, `.quest-tag`, `.mascot`, `.mascot-name`, `.bubble`, `.planner-right`, `.plan-total` |
| Filters | `.filters`, `.filter-title`, `.chip`, `.chip[aria-pressed="true"]`, `.vendor`, `.star-toggle`, `.btn`, `.btn-mint` |
| Item cards | `.card`, `.card.is-legendary` (starred), `.card.is-looted` (bought), `.photo`, `.star-badge`, `.tag`, `.tag-legend`, `.tag-type`, `.price`, `.price.is-sale`, `.view`, `.loot-btn`, `.looted-stamp` |
| Other | `.toast`, `.footer`, `.loot-dialog`, `.btn-gold` |

Bigger, easier text for older visitors: raise `body { font-size: 17px; }` and give buttons (`.btn, .view, .loot-btn, .chip`) a `min-height` of about 44px.

### Traps to avoid

- **A dark header.** If `--header` is dark and you make `.hero` text light, the welcome box (`.dialog`) and the header counts (`.stat`) still have light backgrounds, so their text disappears. Give them their own colors, for example `.dialog { color: var(--text); }` and `.stat { background: rgba(0,0,0,0.22); color: var(--on-dark); border-color: rgba(255,255,255,0.3); }`. A see-through white pill on a mid-tone header usually isn't dark enough for small light text.
- **Text that's hard to read.** Every piece of text needs strong contrast with what's behind it: at least 4.5 to 1 for normal text, 3 to 1 for big headings. Pale text on a pale button and gold on cream are the usual mistakes. Check `.view` and `.loot-btn` especially.
- **Starred cards.** `--star-card` sits behind the item name and price, so it must stay light enough (or dark enough) for `--text`.
- **Background images.** Don't put photos or busy patterns behind text.
- **Cutting off the star badge.** Each starred card has a badge that sits half outside its top corner. Never put `overflow: hidden` on `.card`; to round the photo, use `.photo { border-radius: …; }` instead.
- **Squeezed buttons.** Cards are narrow and hold two buttons side by side (`.view` and `.loot-btn`). Keep `view` and `loot` to one or two short words, and let the buttons stack rather than wrap their words:
  `.card-actions { width: 100%; flex-wrap: wrap; gap: 8px; } .card-actions > * { flex: 1 1 auto; justify-content: center; white-space: nowrap; }`


## theme.json

```json
{
  "name": "Cozy Cabin",
  "description": "One sentence about the look and wording.",
  "mascot": null,
  "art": {
    "heroScene": "art/hero-scene.svg"
  },
  "text": {
    "title": "My Cabin Wishlist"
  }
}
```

- `name` is what people see in the theme menu. Keep it short.
- `mascot` is `null`, or describes the mascot for screen readers when you draw one:
  `{ "name": "Pip", "idle": "Pip the fox, sitting", "happy": "Pip the fox, grinning", "sad": "Pip the fox, ears down" }`
- `art` lists only the pictures you include (see below).
- `text` lists only the wording you want to change. Everything else keeps its plain default.

### Wording

Rules for wording:
- `{n}`, `{name}`, `{owner}` and the like are filled in by the shop. Keep them.
- `"one | many"` picks the right form for the number: `"{n} gift | {n} gifts"`.
- `{i}` in `welcome` shows a small info icon.
- `""` hides that piece (for example `eventTag`).
- The person's own list title and welcome message, if set in their sheet, win over the theme's.

The most noticeable wording, with the defaults:

```
title            My Wishlist
eventTag         (blank: hidden)        small badge above the title
welcomeName      (blank: hidden)        name tag on the welcome box
welcome          Everything here is on my wishlist. Starred items are the ones I want most. Tap the {i} on a photo for sizes, colors and notes.
footer           Made from a spreadsheet.
starred          Starred                what starred items are called
starredOnly      Starred only
starBadge        Starred: most wanted
stat.items       {n} item | {n} items
stat.starred     {n} starred
stat.shops       {n} shop | {n} shops
sortStarred      Starred first
view             View
loot             Bought it              the button gift-givers press
lootedTag        Bought
lootedStamp      BOUGHT                 stamped across a bought item's photo
lootedNote       Already gifted. Thank you!
lootTitle        Mark as bought?
lootConfirm      Mark as bought
toast            Thanks! {qty}{name} is marked as gifted.
plannerTitle     Gift helper
plannerTag       (blank: hidden)
mascotLabel      (blank: hidden)        name under the mascot
planner.idle     Enter a budget and I'll suggest gifts that fit.
planner.picksTitle  Suggested gifts
planner.foundOne    Found one!
planner.foundMany   Found {n}!
planner.starredFirst  Starred items went in first.
planner.claimHint   Bought one? Mark it on its card so nobody doubles up.
empty.title      Nothing matches
empty.text       No items match those filters. Loosen one or reset them.
```

Keep the meaning of each line, and keep the wording consistent: if starred items are "Top Picks," say so everywhere (`starred`, `starredOnly`, `starBadge`, `stat.starred`, `sortStarred`, `planner.starredFirst`), and if the button says "I bought this," the stamp, tag and toast should match.

All the other keys, if needed: `loading searchLabel searchPlaceholder typeFilter shopFilter priceFilter reset filtersLabel resultsLabel sortLabel sortLow sortHigh sortName count countLooted detailsTitle detailsAria details.size details.color details.wanted details.notes details.price details.checked hint dismissTip viewAria sale wasAria qtyWanted qtyLeft qtyLeftTitle giftFrom giftAny priceUnknown lootAria lootCopy owner lootQty lootLeft lootError cancel undo dismiss budgetLabel countLabel optional countPlaceholder planner.loading planner.emptyTitle planner.emptySub planner.emptySubClaims planner.bufferNote planner.none planner.noneTitle planner.noneSub planner.onlyCard planner.topUp planner.squeezed planner.gifts planner.plusCard planner.giftCard planner.total planner.reserve planner.spare planner.bufferHint planner.onlyFit planner.maxBudget planner.giftCardMeta planner.giftCardMetaRest planner.undone error.title error.text error.line setup.title setup.text setup.line`. If you change one of these and aren't sure what it says by default, keep the same placeholders in `{braces}`.


## Pictures (optional)

| Slot in `art` | Where it shows | Draw it at |
|---|---|---|
| `heroSky` | top-right corner of the header (stars, ornaments, clouds) | `viewBox="0 0 420 170"` |
| `heroScene` | a strip along the bottom of the header (hills, trees, rooftops) | `viewBox="0 0 1200 178"` with `preserveAspectRatio="xMidYMax slice"`; keep the important parts near the middle, phones crop the sides |
| `portrait` | small picture beside the welcome message | `viewBox="0 0 46 46"` |
| `mascotIdle`, `mascotHappy`, `mascotSad` | the gift helper's character: waiting, found gifts, nothing fits | `viewBox="0 0 64 64"`, the same character in three moods |
| `lootBag` | pops up when someone marks a gift as bought | `viewBox="0 0 96 96"` |

The mascot appears only if at least one mascot slot is filled. If you draw a mascot, fill all three moods and describe them in `"mascot"`.

Rules for pictures:
- Give every picture a `width` and `height` matching its viewBox, like `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 170" width="420" height="170">`. Without them, some spots shrink the picture to nothing.
- Plain SVG shapes: paths, circles, rects, gradients. No `<script>`, no `on…=` attributes, no `<foreignObject>`, no linked images or fonts.
- `heroScene` should blend into the page: fill its bottom edge with the same color as `--page`.
- Keep each file small (a few kilobytes) and the shapes simple. Pictures should support the theme, not compete with the items.
- Everything must be original: no characters, logos, mascots or artwork from movies, games, shows, books or brands, even if asked. Offer an original character with a similar feel instead.


## Rules for every theme

- Fonts come only from Google Fonts (`https://fonts.googleapis.com/...`), with a sensible fallback in each font variable.
- No JavaScript anywhere.
- Text is easy to read everywhere (see Traps).
- The shop must still be easy to use: buttons look like buttons, the starred items still stand out, and bought items look clearly finished (faded or stamped), not like they're on sale.


## Before you send, check

- [ ] Every file is in its own code block labeled like ```` ```css theme.css ````.
- [ ] `theme.json` is valid JSON, and every picture it lists has a block (and the other way around).
- [ ] Every picture has `width` and `height` as well as a `viewBox`.
- [ ] Every `-rgb` variable matches its color.
- [ ] Nothing sets `overflow: hidden` on `.card`, and the card buttons can stack.
- [ ] Text contrast is strong on the page, cards, starred cards, buttons, header, welcome box and header counts.
- [ ] Wording is consistent everywhere.
- [ ] Nothing copies someone else's characters, logos or art.
- [ ] You end with the one-line "paste this into the Theme Lab" note.
