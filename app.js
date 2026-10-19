/* Wishlist Item Shop
 * Reads a published Google Sheet (CSV) and renders it as a filterable storefront.
 * Gift-givers can mark items as "looted" (purchased); those claims go to a Google Form
 * and are read back from that form's published response sheet.
 * No build step and no dependencies. Settings live in the sheet's Settings tab, with config.js as the fallback.
 *
 * URL switches
 *   ?shield        turn the spoiler shield ON in this browser (remembered). Claims are never loaded.
 *   ?shield=off    turn the spoiler shield off again in this browser.
 *   ?test-claims   use made-up claims and don't send anything (works even with the shield on).
 *   ?lab           used by theme-lab.html: sample items, nothing sent, theme supplied by the lab page.
 */
(() => {
  'use strict';

  const DEFAULTS = {
    sheetUrl: '',
    ownerName: '',
    imageFolder: 'wishlist-images/',
    taxShippingBuffer: 0.15,
    claims: { csvUrl: '', formUrl: '', itemField: '', qtyField: '', refField: '' },
    // Question ids of the template claims form. Copies of the form keep them, so people
    // who copy the template only need its two links. Override in config.js for your own form.
    templateClaimFields: { itemField: 'entry.913828344', qtyField: 'entry.1527095566', refField: 'entry.188142570' },
    imageExtensions: ['jpg', 'png', 'jpeg', 'webp'],
    maxPlannerBudget: 5000,
    maxPriceAgeDays: 3,
    groupSmallShops: 2,
    // The Settings tab's id (the gid= number) in the template sheet. Copies of the template keep it,
    // so the site can find the tab on its own. Only change it if you built your own sheet.
    settingsTabId: '1991352544',
    // Or paste the Settings tab's own published CSV link here instead.
    settingsUrl: '',
    // The claimed-items log tab's id in the template sheet (the claim form writes there). Copies keep
    // it, so turning on claiming in the Settings tab only needs the form link.
    claimsTabId: '496940596',
  };
  const USER = window.WISHLIST_CONFIG || {};
  const CONFIG = { ...DEFAULTS, ...USER, claims: { ...DEFAULTS.claims, ...(USER.claims || {}) } };
  if (!CONFIG.sheetUrl && USER.dataUrl) CONFIG.sheetUrl = USER.dataUrl; // older setting name
  if (CONFIG.imageFolder && !CONFIG.imageFolder.endsWith('/')) CONFIG.imageFolder += '/';
  CONFIG.pricesUrls = pricesUrls();

  // Daily prices are written to prices.json on the repo's "prices" branch by the GitHub Action
  // (scripts/update-prices.mjs). On GitHub Pages, read it from there; locally, try a prices.json next to the page.
  function pricesUrls() {
    const urls = [];
    const host = window.location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (host) {
      const first = window.location.pathname.split('/').filter(Boolean)[0];
      // A project site lives at owner.github.io/<repo>/; a user site's repo is named owner.github.io.
      const repo = first && first.toLowerCase() !== 'index.html' ? first : host[1] + '.github.io';
      urls.push('https://raw.githubusercontent.com/' + host[1] + '/' + repo + '/prices/prices.json');
    }
    urls.push('prices.json');
    return urls;
  }

  /* Sheet columns. Headers are matched loosely: case, spaces and punctuation are ignored,
   * so "Starred?", "STARRED" and "starred" all work. Older names stay supported. */
  const COLUMNS = {
    name: ['name', 'item_name', 'item', 'title'],
    price: ['price', 'cost'],
    size: ['size'],
    color: ['color', 'colour', 'color_or_pattern', 'pattern'],
    quantity: ['quantity', 'qty', 'how_many'],
    starred: ['starred', 'star', 'excite', 'really_want', 'favorite', 'favourite', 'must_have'],
    shop: ['shop', 'source', 'store', 'vendor', 'merchant'],
    category: ['category', 'categories', 'tags', 'tag', 'type'],
    image: ['image', 'image_name', 'photo', 'picture'],
    notes: ['notes', 'note', 'details'],
    link: ['link', 'url'],
  };
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

  // Returns { field: columnIndex }. Exact matches win; then a header that starts with
  // a known name ("Shop name", "Image file") fills any field still missing.
  function mapColumns(headerRow) {
    const header = headerRow.map(norm);
    const used = new Set();
    const map = {};
    for (const [field, names] of Object.entries(COLUMNS)) {
      for (const n of names.map(norm)) {
        const i = header.findIndex((h, j) => h === n && !used.has(j));
        if (i >= 0) { map[field] = i; used.add(i); break; }
      }
    }
    for (const [field, names] of Object.entries(COLUMNS)) {
      if (field in map) continue;
      for (const n of names.map(norm)) {
        const i = header.findIndex((h, j) => h && h.startsWith(n) && !used.has(j));
        if (i >= 0) { map[field] = i; used.add(i); break; }
      }
    }
    return map;
  }

  const PRICE_BANDS = [
    { id: 'all', label: 'Any', min: -Infinity, max: Infinity },
    { id: 'a', label: 'Under $25', min: 0, max: 25 },
    { id: 'b', label: '$25-50', min: 25, max: 50 },
    { id: 'c', label: '$50-100', min: 50, max: 100 },
    { id: 'd', label: '$100+', min: 100, max: Infinity },
  ];

  const GIFT_SVG = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M2 6h12v8H2z" style="fill:var(--accent)"/><path d="M1 4h14v3H1z" style="fill:var(--accent-mid)"/><path d="M7 4h2v10H7z" style="fill:var(--star)"/><path d="M1 4h14v1H1zM1 6h14v1H1zM1 4h1v3H1zM14 4h1v3h-1zM2 7h1v7H2zM13 7h1v7h-1zM2 13h12v1H2zM4 1h2v1H4zM10 1h2v1h-2zM3 2h1v2H3zM6 2h1v2H6zM9 2h1v2H9zM12 2h1v2h-1z" style="fill:var(--text)"/></svg>';
  const STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';
  const SHIELD_KEY = 'wishlist-spoiler-shield';
  const PENDING_KEY = 'wishlist-pending-claims';
  const PENDING_TTL = 10 * 60 * 1000; // a local claim counts for 10 min or until the sheet shows it

  /* ---------- theme: words and art ----------
   * Plain default wording. A theme's theme.json "text" can replace any of these.
   * {placeholders} are filled in; "one | many" picks a form by {n}; {i} becomes the little info icon. */
  const TEXT = {
    title: 'My Wishlist',
    eventTag: '',
    welcomeName: '',
    welcome: 'Everything here is on my wishlist. Starred items are the ones I want most. Tap the {i} on a photo for sizes, colors and notes.',
    footer: 'Made from a spreadsheet.',
    loading: 'loading…',
    'stat.items': '{n} item | {n} items',
    'stat.starred': '{n} starred',
    'stat.shops': '{n} shop | {n} shops',
    starred: 'Starred',
    starredOnly: 'Starred only',
    hideGiftCards: 'Hide gift cards',
    starBadge: 'Starred: most wanted',
    searchLabel: 'Search',
    searchPlaceholder: 'Search the list',
    typeFilter: 'Category',
    shopFilter: 'Shop',
    priceFilter: 'Price',
    reset: 'Reset filters',
    filtersLabel: 'Filters',
    resultsLabel: 'Wishlist items',
    sortLabel: 'Sort',
    sortStarred: 'Starred first',
    sortLow: 'Price: low to high',
    sortHigh: 'Price: high to low',
    sortName: 'Name A to Z',
    count: '{left} / {total} available',
    countLooted: ' · {n} bought',
    'empty.title': 'Nothing matches',
    'empty.text': 'No items match those filters. Loosen one or reset them.',
    detailsTitle: 'DETAILS',
    detailsAria: 'Details for {name}',
    'details.size': 'Size',
    'details.color': 'Color',
    'details.wanted': 'Wanted',
    'details.notes': 'Notes',
    'details.price': 'Price',
    'details.checked': 'Checked {date} on {shop}',
    hint: 'Sizes & notes in here',
    dismissTip: 'Dismiss tip',
    view: 'View',
    viewAria: 'View {name} on {shop} (opens in a new tab)',
    sale: 'Sale −{pct}%',
    wasAria: 'was {amount}',
    qtyWanted: 'Quantity wanted',
    qtyLeft: '{left} of {qty} left',
    qtyLeftTitle: '{left} of {qty} still needed',
    giftFrom: 'From {amount}',
    giftAny: 'Any amount',
    priceUnknown: 'price ?',
    loot: 'Bought it',
    lootAria: 'Mark {name} as bought',
    lootedTag: 'Bought',
    lootedStamp: 'BOUGHT',
    lootedNote: 'Already gifted. Thank you!',
    lootTitle: 'Mark as bought?',
    lootCopy: "This tells other gift-givers you bought it, so nobody doubles up. {owner} won't see it.",
    owner: 'The wishlist owner',
    lootQty: 'How many did you get?',
    lootLeft: '{left} of {qty} still needed.',
    lootError: "Couldn't save that. Check your connection and try again.",
    cancel: 'Cancel',
    lootConfirm: 'Mark as bought',
    toast: 'Thanks! {qty}{name} is marked as gifted.',
    undo: 'Undo',
    dismiss: 'Dismiss',
    'mode.test': 'Test mode: fake purchases, nothing is sent',
    'mode.shield': 'Spoiler shield on',
    'mode.shieldTitle': 'Purchases are hidden in this browser. Visit with ?shield=off to turn this off.',
    plannerTitle: 'Gift helper',
    plannerTag: '',
    mascotLabel: '',
    budgetLabel: 'Budget',
    countLabel: 'Number of gifts',
    optional: '(optional)',
    countPlaceholder: 'any',
    'planner.loading': 'Loading the list…',
    'planner.idle': "Enter a budget and I'll suggest gifts that fit.",
    'planner.emptyTitle': 'No picks yet',
    'planner.emptySub': 'Only items the filters are showing are considered.',
    'planner.emptySubClaims': 'Only items the filters are showing are considered, and anything already bought is skipped.',
    'planner.bufferNote': '{pct}% of your budget is saved for tax and shipping.',
    'planner.none': 'Nothing fits under {budget} once some is saved for tax and shipping. Try a bigger budget or fewer filters.',
    'planner.noneTitle': 'Nothing fits',
    'planner.noneSub': 'After setting aside {reserve} for tax and shipping, nothing still available fits in {budget}. Raise the budget or loosen the filters.',
    'planner.onlyCard': 'Nothing on the list fits, but a {amount} {name} does!',
    'planner.foundOne': 'Found one!',
    'planner.foundMany': 'Found {n}!',
    'planner.topUp': '…plus a {amount} {name} to use up the rest!',
    'planner.starredFirst': 'Starred items went in first.',
    'planner.squeezed': 'Used as much of the budget as possible.',
    'planner.picksTitle': 'Suggested gifts',
    'planner.gifts': '{n} gift | {n} gifts',
    'planner.plusCard': ' + gift card',
    'planner.giftCard': 'gift card',
    'planner.total': 'Gifts {amount}',
    'planner.reserve': '+ ~{amount} est. tax & shipping',
    'planner.spare': '{amount} spare',
    'planner.bufferHint': 'About {pct}% of the budget is set aside as a rough guess for tax and shipping. Real costs vary by shop and location, so check the total at checkout.',
    'planner.giftCardNoTax': 'Gift cards skip this, since they are usually tax-free and sent by email.',
    'planner.onlyFit': 'Only {n} of {want} gifts fit this budget with the current filters.',
    'planner.maxBudget': 'The planner can only count up to {amount} at a time.',
    'planner.claimHint': 'Bought one? Mark it on its card so nobody doubles up.',
    'planner.giftCardMeta': 'Gift card',
    'planner.giftCardMetaRest': 'Gift card · uses up the rest',
    'planner.undone': "Undone. It's back on the list.",
    'error.title': 'The list is unavailable',
    'error.text': 'The wishlist could not be loaded right now. Please refresh the page in a little while.',
    'error.line': "I couldn't reach the spreadsheet. Try refreshing in a minute?",
    'setup.title': 'No sheet connected yet',
    'setup.text': 'Paste your published Google Sheet link into sheetUrl in config.js. The README has step-by-step setup.',
    'setup.line': 'This list has no items yet. Someone needs to connect a spreadsheet.',
  };

  const THEME = { name: window.WISHLIST_THEME || 'rpg-shop', text: {}, mascot: null, art: {} };
  const SHEET_TEXT = {}; // wording set in the sheet's Settings tab (title, welcome), which wins over the theme's

  function t(key, vars) {
    let s = Object.prototype.hasOwnProperty.call(THEME.text, key) ? THEME.text[key] : TEXT[key];
    if (s == null) return key;
    s = String(s);
    const v = { mascot: (THEME.mascot && THEME.mascot.name) || 'The planner', ...vars };
    if (s.includes(' | ')) { const [one, many] = s.split(' | '); s = v.n === 1 ? one : many; }
    return s.replace(/\{(\w+)\}/g, (m, k) => (k !== 'i' && v[k] != null ? String(v[k]) : m));
  }

  // Sets an element's text, turning {i} into the little info icon.
  function fillText(node, s) {
    const parts = String(s).split('{i}');
    node.replaceChildren(...parts.flatMap((p, n) => (n ? [infoIcon(), p] : [p])));
  }
  const infoIcon = () => {
    const i = document.createElement('span');
    i.className = 'inline-i'; i.setAttribute('aria-label', 'info'); i.textContent = 'i';
    return i;
  };

  // Theme art is plain SVG. Anything script-like is stripped before it touches the page.
  function safeSvg(markup) {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
    root.querySelectorAll('script, foreignObject').forEach((n) => n.remove());
    [root, ...root.querySelectorAll('*')].forEach((n) => [...n.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
    }));
    return document.importNode(root, true);
  }

  async function loadTheme() {
    const base = 'themes/' + THEME.name + '/';
    let data = {};
    try {
      const res = await fetch(base + 'theme.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    } catch (err) {
      console.warn('[wishlist] could not load theme "' + THEME.name + '", using plain defaults:', err);
    }
    THEME.text = { ...((data && data.text) || {}), ...SHEET_TEXT };
    THEME.art = {};
    THEME.mascot = (data && data.mascot) || null;
    const art = (data && data.art) || {};
    await Promise.all(Object.entries(art).map(async ([slot, file]) => {
      if (!/^[\w./-]+\.svg$/i.test(String(file)) || String(file).includes('..')) return;
      try {
        const res = await fetch(base + file, { cache: 'no-cache' });
        const node = res.ok ? safeSvg(await res.text()) : null;
        if (node) THEME.art[slot] = node;
      } catch (err) { console.warn('[wishlist] could not load theme art', file, err); }
    }));
    applyTheme();
  }

  function applyTheme() {
    document.title = t('title');
    document.querySelectorAll('[data-t]').forEach((n) => fillText(n, t(n.dataset.t)));
    document.querySelectorAll('[data-t-placeholder]').forEach((n) => n.setAttribute('placeholder', t(n.dataset.tPlaceholder)));
    document.querySelectorAll('[data-t-aria]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.tAria)));
    document.querySelectorAll('[data-hide-if-empty]').forEach((n) => { n.hidden = !t(n.dataset.hideIfEmpty); });
    fillText($('#loot-copy'), t('lootCopy', { owner: String(CONFIG.ownerName || '').trim() || t('owner') }));
    document.querySelectorAll('[data-art]').forEach((slot) => {
      const art = THEME.art[slot.dataset.art];
      slot.replaceChildren(...(art ? [art.cloneNode(true)] : []));
    });
    const hasMascot = ['mascotIdle', 'mascotHappy', 'mascotSad'].some((k) => THEME.art[k]);
    if (THEME.mascot && THEME.mascot.idle) $('#mascot').setAttribute('aria-label', THEME.mascot.idle);
    $('.mascot-col').hidden = !hasMascot;
    $('.planner').classList.toggle('no-mascot', !hasMascot);
    document.documentElement.classList.remove('theme-loading');
  }


  /* ---------- settings from the sheet ----------
   * The template sheet has a Settings tab: setting names in column A, values in column B.
   * Anything filled in there wins over config.js; blank or missing settings fall back to it. */

  const THEME_KEY = 'wishlist-sheet-theme';
  // What happened while loading, for the ?check page.
  const CHECK = { settings: { status: 'none' }, settingRows: new Set(), theme: {}, sheet: {}, claims: {}, prices: {} };
  const SETTING_NAMES = {
    theme: ['theme', 'look'],
    ownerName: ['yourname', 'name', 'ownername', 'owner'],
    title: ['listtitle', 'title', 'pagetitle'],
    welcome: ['welcomemessage', 'welcome', 'message'],
    footer: ['footertext', 'footer', 'footermessage', 'pagefooter', 'bottomtext'],
    taxShippingBuffer: ['taxshippingbuffer', 'taxandshippingbuffer', 'taxshipping', 'buffer'],
    claimsOn: ['enableitemclaiming', 'enableclaiming', 'itemclaiming', 'claiming'],
    claimsForm: ['claimformlink', 'claimsformlink', 'formlink', 'claimform', 'claimsform'],
    claimsSheet: ['claimstablink', 'claimstab', 'claimedtablink', 'claimeditemstablink', 'claimeditemssheetpublishlink', 'claimeditemssheetlink', 'claimeditemslink', 'claimssheetlink',
      'claimssheetpublishlink', 'claimedsheetlink', 'claimssheet', 'claimedsheet'],
  };

  // The form's share link ("…/viewform") becomes the address answers are sent to ("…/formResponse").
  function formPostUrl(link) {
    const m = String(link).trim().match(/^(https:\/\/docs\.google\.com\/forms\/(?:u\/\d+\/)?d\/e\/[\w-]+)\//i);
    if (m) return m[1] + '/formResponse';
    if (/forms\.gle\//i.test(link)) console.warn('[wishlist] the claim form link is a short forms.gle link. In the form, click Send, then the link icon, and untick "Shorten URL".');
    return '';
  }
  // A published sheet link, made to return CSV.
  function csvLink(link) {
    const u = String(link).trim();
    if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[\w-]+\/pub/i.test(u)) return '';
    return u.replace(/\/pubhtml/i, '/pub').replace(/([?&])output=\w+/i, '$1output=csv') + (/output=/i.test(u) ? '' : (u.includes('?') ? '&' : '?') + 'output=csv');
  }

  // Another tab of the published sheet, as CSV, found by its tab id (gid).
  function tabUrl(gid) {
    gid = String(gid || '').trim();
    const m = String(CONFIG.sheetUrl).trim().match(/^(https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[\w-]+)\/pub/i);
    return gid && m ? m[1] + '/pub?gid=' + encodeURIComponent(gid) + '&single=true&output=csv' : '';
  }

  // Where to read claims from: a published CSV link, the browser address while the responses tab
  // is open (anything with gid=…), or just the tab's id number.
  function claimsTabLink(value) {
    const v = String(value).trim();
    const gid = (v.match(/[#?&]gid=(\d+)/) || v.match(/^(\d+)$/) || [])[1];
    return csvLink(v) || tabUrl(gid);
  }

  // The Settings tab's CSV link: set directly, or worked out from the published sheet link.
  function settingsUrl() {
    if (/^https?:\/\//i.test(String(CONFIG.settingsUrl).trim())) return String(CONFIG.settingsUrl).trim();
    return tabUrl(CONFIG.settingsTabId);
  }

  function readSettings(rows) {
    const out = {};
    rows.forEach((r) => {
      const name = norm(String(r[0] || '').replace(/\(.*?\)/g, '')); // "List title (optional)" -> "listtitle"
      const value = String(r[1] == null ? '' : r[1]).trim();
      const key = name && Object.keys(SETTING_NAMES).find((k) => SETTING_NAMES[k].includes(name));
      if (key) CHECK.settingRows.add(key);
      if (!name || !value) return;
      if (key && !(key in out)) out[key] = value;
    });
    return out;
  }

  // Gives up after a couple of seconds so a slow or missing tab never holds the page back.
  async function loadSettings() {
    const url = settingsUrl();
    if (!url) return {};
    CHECK.settings = { status: 'loading', url };
    try {
      const text = await Promise.race([
        fetchText(url),
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('timed out')), 2500)),
      ]);
      if (/^\s*</.test(text)) throw new Error('not published as CSV'); // Google sends a web page for unpublished tabs
      const found = readSettings(parseCSV(text));
      CHECK.settings = { status: 'ok', url, found };
      return found;
    } catch (err) {
      CHECK.settings = { status: 'error', url, reason: err.message || String(err) };
      console.warn('[wishlist] could not read the Settings tab, using config.js:', err.message || err);
      return { unreadable: true };
    }
  }

  // themes/themes.csv lists every theme: its name (what the sheet's dropdown shows) and its folder.
  // The template sheet's dropdown reads this same file, so new themes appear there automatically.
  let themeListCache = null;
  async function themeList() {
    if (!themeListCache) {
      themeListCache = fetchText('themes/themes.csv')
        .then((text) => parseCSV(text).slice(1).map((r) => ({ name: (r[0] || '').trim(), folder: (r[1] || '').trim() })))
        .catch(() => []);
    }
    return themeListCache;
  }

  // "Winter Lights", "winter-lights" and "WINTER LIGHTS" all find the winter-lights folder.
  async function themeFolder(value) {
    const want = norm(value);
    if (!want) return null;
    try {
      const list = (await themeList()).filter((th) => th.folder);
      const hit = list.find((th) => norm(th.folder) === want || norm(th.name) === want);
      if (hit) return String(hit.folder).toLowerCase().replace(/[^a-z0-9-]/g, '');
    } catch (err) { /* fall through to a best guess */ }
    const guess = String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' ').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return guess || null;
  }

  // Swaps the theme stylesheet and waits for it, so the page never shows the old look under the new words.
  // Whether the theme exists is checked on the file itself: a link's error event also fires when only a
  // Google Font it imports is blocked (ad blockers, school networks), and that shouldn't reject the theme.
  async function swapThemeCss(folder) {
    const href = 'themes/' + folder + '/theme.css?v=20261015e';
    try {
      const res = await fetch(href, { method: 'HEAD', cache: 'no-cache' });
      if (!res.ok) return false;
    } catch (err) { return false; }
    return new Promise((resolve) => {
      const old = document.getElementById('theme-css');
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'theme-css';
      link.href = href;
      let finished = false;
      const done = () => { if (finished) return; finished = true; if (old) old.remove(); resolve(true); };
      link.onload = done;
      link.onerror = done;
      setTimeout(done, 3000);
      document.head.appendChild(link);
    });
  }

  async function applySettings(settings) {
    if (settings.ownerName) CONFIG.ownerName = settings.ownerName;
    if (settings.title) SHEET_TEXT.title = settings.title;
    if (settings.welcome) SHEET_TEXT.welcome = settings.welcome;
    if (settings.footer) SHEET_TEXT.footer = settings.footer;
    if (settings.taxShippingBuffer) {
      const n = parseFloat(String(settings.taxShippingBuffer).replace(/[^\d.]/g, ''));
      if (Number.isFinite(n)) CONFIG.taxShippingBuffer = /%/.test(settings.taxShippingBuffer) || n > 1 ? n / 100 : n;
    }
    // Item claiming: the checkbox turns it on or off; the two links say where claims go and are read from.
    if (settings.claimsForm) {
      c.formUrl = formPostUrl(settings.claimsForm) || c.formUrl;
      // A pre-filled link carries the question ids (entry.123…) in question order: item, quantity, ref.
      const ids = [...String(settings.claimsForm).matchAll(/[?&](entry\.\d+)=/g)].map((m) => m[1]);
      if (ids.length >= 2) { [c.itemField, c.qtyField] = ids; c.refField = ids[2] || ''; }
    }
    if (settings.claimsSheet) c.csvUrl = claimsTabLink(settings.claimsSheet) || c.csvUrl;
    // Sheets copied from the template have the claimed-items log built in, so no link is needed.
    if (settings.claimsForm && !c.csvUrl) c.csvUrl = tabUrl(CONFIG.claimsTabId);
    if (settings.claimsOn != null && !truthy(settings.claimsOn)) { c.formUrl = ''; c.csvUrl = ''; }
    refreshClaims();
    CHECK.claims = {
      sheetSays: settings.claimsOn == null ? null : truthy(settings.claimsOn),
      formLink: settings.claimsForm || '',
      formOk: Boolean(c.formUrl),
      ids: Boolean(c.itemField && c.qtyField),
    };
    CHECK.theme = { requested: settings.theme || '', preview: Boolean(window.WISHLIST_THEME_PREVIEW) };
    if (window.WISHLIST_THEME_PREVIEW) return; // ?theme= previews win over the sheet
    const fromConfig = String(CONFIG.theme || 'rpg-shop').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'rpg-shop';
    let wanted = settings.theme ? await themeFolder(settings.theme) : null;
    CHECK.theme.folder = wanted;
    if (wanted && wanted !== THEME.name && !(await swapThemeCss(wanted))) {
      CHECK.theme.missing = true;
      console.warn('[wishlist] the Settings tab asks for a theme called "' + settings.theme + '", but there is no themes/' + wanted + ' folder. Using config.js instead.');
      wanted = null;
    }
    if (wanted) {
      THEME.name = wanted;
      store.set(THEME_KEY, wanted); // so the next visit starts with this theme
      return;
    }
    // If the tab couldn't be reached, keep the theme it picked last time. Otherwise fall back to config.js.
    if (settings.unreadable) return;
    store.del(THEME_KEY);
    if (THEME.name !== fromConfig && (await swapThemeCss(fromConfig))) THEME.name = fromConfig;
  }

  /* ---------- mode ---------- */

  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { window.localStorage.removeItem(k); } catch (e) { /* private mode */ } },
  };

  const params = new URLSearchParams(window.location.search);
  if (params.has('shield')) {
    if (params.get('shield') === 'off') store.del(SHIELD_KEY);
    else store.set(SHIELD_KEY, 'on');
  }
  const SHIELD = store.get(SHIELD_KEY) === 'on';
  // ?lab: the theme lab (theme-lab.html) shows this page in a frame, with sample items and a pasted theme.
  const LAB = params.has('lab') && window.parent !== window;
  const TEST = params.has('test-claims') || LAB;
  const c = CONFIG.claims;
  ['itemField', 'qtyField', 'refField'].forEach((k) => { if (!c[k]) c[k] = CONFIG.templateClaimFields[k] || ''; });
  let CLAIMS_CONFIGURED = Boolean(c.csvUrl && c.formUrl && c.itemField && c.qtyField);
  // Test mode only ever uses fake claims, so it's allowed even behind the spoiler shield.
  let CLAIMS_ON = TEST || (!SHIELD && CLAIMS_CONFIGURED);
  const refreshClaims = () => {
    CLAIMS_CONFIGURED = Boolean(c.csvUrl && c.formUrl && c.itemField && c.qtyField);
    CLAIMS_ON = TEST || (!SHIELD && CLAIMS_CONFIGURED);
  };
  const pendingKey = LAB ? PENDING_KEY + '-lab' : TEST ? PENDING_KEY + '-test' : PENDING_KEY;

  const state = {
    items: [],
    sheetClaims: new Map(), // key -> qty claimed according to the sheet
    sheetRefs: new Set(),   // refs already in the sheet
    q: '',
    starOnly: false,
    hideGiftCards: false,
    vendorsOff: new Set(),
    types: new Set(),
    band: 'all',
    sort: 'wanted',
    budget: '',
    count: '',
  };

  /* ---------- helpers ---------- */

  const $ = (sel) => document.querySelector(sel);

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const ch of [].concat(children || [])) {
      if (ch == null || ch === false) continue;
      node.append(ch.nodeType ? ch : document.createTextNode(String(ch)));
    }
    return node;
  }

  function svg(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstChild;
  }

  const starSvg = (size) =>
    svg(`<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${STAR_PATH}" style="fill:var(--text)"/></svg>`);
  const chestSvg = () =>
    svg('<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges"><path d="M2 5h12v9H2z" style="fill:var(--star)"/><path d="M2 5h12v1H2zM2 13h12v1H2zM1 5h1v9H1zM14 5h1v9h-1zM2 8h12v1H2zM3 3h10v2H3zM2 4h1v1H2zM13 4h1v1h-1zM4 2h8v1H4z" fill="currentColor"/><path d="M7 7h2v3H7z" fill="currentColor"/></svg>');

  const fmt = (v) => '$' + (Math.round(v * 100) % 100 === 0 ? String(Math.round(v)) : v.toFixed(2));
  const titleCase = (s) => s.toLowerCase().replace(/(^|[\s/-])(\w)/g, (m, a, b) => a + b.toUpperCase());
  const truthy = (v) => /^(true|yes|y|1|x|✓)$/i.test(String(v).trim());
  const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : null);
  const keyOf = (name) => String(name).trim().toLowerCase().replace(/\s+/g, ' ');

  /* ---------- CSV ---------- */

  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  }

  function toItems(rows) {
    if (!rows.length) return [];
    const cols = mapColumns(rows[0]);
    const missing = ['name', 'price'].filter((f) => !(f in cols));
    if (missing.length) console.warn('[wishlist] could not find these columns in the sheet:', missing.join(', '));
    const get = (r, field) => {
      const i = cols[field];
      return i != null && r[i] != null ? r[i].trim() : '';
    };
    return rows.slice(1).map((r, n) => {
      const priceNum = get(r, 'price').replace(/,/g, '').match(/\d+(?:\.\d+)?/); // "$12.99", "From $25", "Any amount"
      const price = priceNum ? parseFloat(priceNum[0]) : NaN;
      let tags = get(r, 'category').split(/[:;,]/).map((t) => t.trim()).filter(Boolean).map(titleCase);
      tags = [...new Set(tags)];
      tags = [...new Set(tags.map((t) => (/^gift ?cards?$/i.test(t) ? 'Gift Cards' : t)))];
      if (!tags.length) tags = ['Other'];
      const name = get(r, 'name');
      return {
        id: n,
        key: keyOf(name),
        name,
        price: Number.isFinite(price) ? price : NaN,
        giftCard: tags.includes('Gift Cards'),
        giftMin: Number.isFinite(price) && price > 0 ? price : 0,
        size: get(r, 'size'),
        color: get(r, 'color'),
        qty: Math.max(1, parseInt(get(r, 'quantity'), 10) || 1),
        starred: truthy(get(r, 'starred')),
        vendor: get(r, 'shop') || 'Other',
        tags,
        image: get(r, 'image'),
        notes: get(r, 'notes'),
        link: safeUrl(get(r, 'link')),
      };
    }).filter((it) => it.name);
  }

  // Shops with only a few items fold into "Other" in the shop filter so the list stays short.
  // Cards still show each item's real shop.
  function groupShops(items) {
    const min = Math.max(0, parseInt(CONFIG.groupSmallShops, 10) || 0);
    const counts = new Map();
    items.forEach((it) => counts.set(it.vendor, (counts.get(it.vendor) || 0) + 1));
    items.forEach((it) => { it.shopGroup = counts.get(it.vendor) < min ? 'Other' : it.vendor; });
  }

  /* ---------- claims ---------- */

  // Reads the form's response sheet: columns are Timestamp plus the form questions.
  function readClaims(rows) {
    const totals = new Map();
    const refs = new Set();
    if (!rows.length) return { totals, refs };
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const find = (word) => header.findIndex((h) => h.includes(word));
    const iItem = find('item');
    const iQty = find('quant');
    const iRef = find('ref');
    if (iItem < 0 || iQty < 0) return { totals, refs };
    rows.slice(1).forEach((r) => {
      const key = keyOf(r[iItem] || '');
      const qty = parseInt(r[iQty], 10);
      if (!key || !Number.isFinite(qty)) return;
      totals.set(key, (totals.get(key) || 0) + qty);
      if (iRef >= 0 && r[iRef]) refs.add(r[iRef].trim());
    });
    return { totals, refs };
  }

  function testClaimsRows(items) {
    // Made-up claims so the looted styling can be worked on without real data.
    const pick = (i, q) => (items[i] ? [items[i].name, String(q)] : null);
    const rows = [['Timestamp', 'item', 'quantity', 'ref']];
    [pick(3, 1), pick(14, 1), pick(1, 1), pick(items.length - 1, 3)].filter(Boolean)
      .forEach(([name, q], n) => rows.push(['', name, q, 'test-' + n]));
    return rows;
  }

  function loadPending() {
    try {
      const list = JSON.parse(store.get(pendingKey) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function savePending(list) { store.set(pendingKey, JSON.stringify(list)); }

  // Local claims this browser made that the published sheet hasn't caught up with yet.
  function livePending() {
    const now = Date.now();
    const list = loadPending().filter((p) => now - p.at < PENDING_TTL && !state.sheetRefs.has(p.ref));
    savePending(list);
    return list;
  }

  function applyClaims() {
    const totals = new Map(state.sheetClaims);
    livePending().forEach((p) => totals.set(p.key, (totals.get(p.key) || 0) + p.qty));
    state.items.forEach((it) => {
      const claimed = CLAIMS_ON ? Math.max(0, totals.get(it.key) || 0) : 0;
      it.remaining = Math.max(0, it.qty - claimed);
      if (it.giftCard) { it.remaining = it.qty; it.looted = false; return; } // never "used up"
      it.looted = CLAIMS_ON && it.remaining === 0;
    });
  }

  async function sendClaim(item, qty) {
    const ref = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    if (!TEST) {
      const body = new URLSearchParams();
      body.set(c.itemField, item.name);
      body.set(c.qtyField, String(qty));
      if (c.refField) body.set(c.refField, ref);
      // Google Forms doesn't allow reading the reply cross-origin; a network error still throws.
      await fetch(c.formUrl, { method: 'POST', mode: 'no-cors', body });
    }
    const list = loadPending();
    list.push({ key: item.key, qty, ref, at: Date.now() });
    savePending(list);
    return ref;
  }

  /* ---------- filtering ---------- */

  // keepGiftCards ignores the "Hide gift cards" box, so the gift helper can still fill leftovers with one.
  function filtered({ keepGiftCards = false } = {}) {
    const band = PRICE_BANDS.find((b) => b.id === state.band) || PRICE_BANDS[0];
    const q = state.q.trim().toLowerCase();
    return state.items.filter((it) => {
      if (it.giftCard && state.hideGiftCards && !keepGiftCards) return false;
      if (state.vendorsOff.has(it.shopGroup)) return false;
      if (state.starOnly && !it.starred) return false;
      if (state.types.size && !it.tags.some((t) => state.types.has(t))) return false;
      if (band.id !== 'all' && !it.giftCard && !(it.price >= band.min && it.price < band.max)) return false;
      if (q) {
        const hay = [it.name, it.vendor, it.tags.join(' '), it.color, it.notes].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  const priceKey = (it, dir) => (Number.isNaN(it.price) ? Infinity : dir * it.price);
  const SORTS = {
    wanted: (a, b) => (b.starred - a.starred) || (priceKey(a, 1) - priceKey(b, 1)),
    low: (a, b) => priceKey(a, 1) - priceKey(b, 1),
    high: (a, b) => priceKey(a, -1) - priceKey(b, -1),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  // Claimed items always sink to the end. Gift cards follow the regular items, except that under
  // "Most Wanted first" a starred gift card stays up with the other Most Wanted items.
  const sinksAsGiftCard = (it) => it.giftCard && !(state.sort === 'wanted' && it.starred);
  const sortWith = (fn) => (a, b) => (a.looted - b.looted) || (sinksAsGiftCard(a) - sinksAsGiftCard(b)) || fn(a, b);

  /* ---------- filter controls ---------- */

  function buildFilters() {
    $('#gift-toggle').hidden = !state.items.some((it) => it.giftCard);
    const types = [...new Set(state.items.flatMap((it) => it.tags))].filter((t) => t !== 'Other').sort();
    types.push('Other');
    $('#type-chips').replaceChildren(...types.map((t) => el('button', {
      type: 'button', class: 'chip chip-pill', 'aria-pressed': 'false', 'data-type': t, text: t,
      onclick: (e) => {
        state.types.has(t) ? state.types.delete(t) : state.types.add(t);
        e.currentTarget.setAttribute('aria-pressed', String(state.types.has(t)));
        render();
      },
    })));

    const vendors = [...new Set(state.items.map((it) => it.shopGroup))]
      .sort((a, b) => (a === 'Other') - (b === 'Other') || a.localeCompare(b));
    $('#vendor-list').replaceChildren(...vendors.map((v) => {
      const inGroup = state.items.filter((it) => it.shopGroup === v);
      const shops = [...new Set(inGroup.map((it) => it.vendor))].sort();
      const input = el('input', {
        type: 'checkbox', checked: true, 'data-vendor': v,
        onchange: (e) => { e.target.checked ? state.vendorsOff.delete(v) : state.vendorsOff.add(v); render(); },
      });
      // "Other" lists the shops it holds, so a gift-giver can still see what's in there.
      const named = shops.filter((sh) => sh !== 'Other');
      const title = v === 'Other' && named.length ? 'Includes ' + named.join(', ') : null;
      return el('label', { class: 'vendor', title }, [
        input,
        el('span', { class: 'vendor-name', text: v }),
        el('span', { class: 'vendor-count', text: inGroup.length }),
      ]);
    }));

    $('#price-chips').replaceChildren(...PRICE_BANDS.map((b) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(b.id === state.band), 'data-band': b.id, text: b.label,
      onclick: () => {
        state.band = b.id;
        document.querySelectorAll('#price-chips .chip').forEach((ch) => ch.setAttribute('aria-pressed', String(ch.dataset.band === b.id)));
        render();
      },
    })));
  }

  function resetFilters() {
    state.q = ''; state.starOnly = false; state.hideGiftCards = false; state.vendorsOff.clear(); state.types.clear(); state.band = 'all';
    $('#q').value = '';
    $('#star-only').checked = false;
    $('#hide-gift').checked = false;
    document.querySelectorAll('#vendor-list input').forEach((i) => { i.checked = true; });
    document.querySelectorAll('#type-chips .chip').forEach((ch) => ch.setAttribute('aria-pressed', 'false'));
    document.querySelectorAll('#price-chips .chip').forEach((ch) => ch.setAttribute('aria-pressed', String(ch.dataset.band === 'all')));
    render();
  }

  /* ---------- cards ---------- */

  // The image column holds either a pasted image link or a file name in the photo folder.
  function imageCandidates(value) {
    const v = value.trim();
    if (/^https?:\/\//i.test(v)) {
      // A Google Drive share link points at a viewer page, not the image itself.
      const drive = v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/i);
      return [drive ? 'https://drive.google.com/thumbnail?id=' + drive[1] + '&sz=w1000' : v];
    }
    const base = CONFIG.imageFolder + encodeURIComponent(v);
    return /\.[a-z0-9]{2,5}$/i.test(v) ? [base] : CONFIG.imageExtensions.map((ext) => base + '.' + ext);
  }

  function photo(it) {
    const box = el('div', { class: 'photo' });
    const placeholder = () => el('div', { class: 'photo-empty' }, [
      svg('<svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/></svg>'),
      'no photo yet',
    ]);
    if (it.image) {
      const candidates = imageCandidates(it.image);
      let i = 0;
      // no-referrer: some shops refuse images requested from other sites.
      const img = el('img', { alt: it.name, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', src: candidates[0] });
      img.addEventListener('error', () => {
        i += 1;
        if (i < candidates.length) img.src = candidates[i];
        else img.replaceWith(placeholder());
      });
      box.append(img);
    } else {
      box.append(placeholder());
    }
    if (it.looted) box.append(el('div', { class: 'looted-stamp', 'aria-hidden': 'true', text: t('lootedStamp') }));
    return box;
  }

  function details(it) {
    const rows = [];
    if (it.size) rows.push([t('details.size'), it.size]);
    if (it.color) rows.push([t('details.color'), it.color]);
    if (it.qty > 1) rows.push([t('details.wanted'), '×' + it.qty]);
    if (it.notes) rows.push([t('details.notes'), it.notes]);
    if (it.checked) rows.push([t('details.price'), t('details.checked', { date: it.checked.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), shop: it.vendor })]);
    if (!rows.length) return null;

    const id = 'details-' + it.id;
    const wrap = el('div', { class: 'info' });
    const btn = el('button', {
      type: 'button', class: 'info-btn', 'aria-expanded': 'false', 'aria-controls': id,
      'aria-label': t('detailsAria', { name: it.name }),
      onclick: (e) => {
        e.stopPropagation();
        dismissHint();
        const open = !wrap.classList.contains('is-open');
        closeAllDetails();
        wrap.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      },
    }, svg('<svg aria-hidden="true" width="20" height="20" viewBox="0 0 8 8" shape-rendering="crispEdges"><path d="M3 1h2v1h-2zM3 3h2v4h-2z" fill="currentColor"/></svg>'));
    const panel = el('div', { class: 'details', id, role: 'note' }, [
      el('div', { class: 'details-title', text: t('detailsTitle') }),
      el('dl', null, rows.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })])),
    ]);
    wrap.append(btn, panel);
    return wrap;
  }

  function closeAllDetails() {
    document.querySelectorAll('.info.is-open').forEach((w) => {
      w.classList.remove('is-open');
      w.querySelector('.info-btn').setAttribute('aria-expanded', 'false');
    });
  }

  function qtyTag(it) {
    if (it.looted) return el('span', { class: 'tag tag-looted', text: t('lootedTag') });
    if (CLAIMS_ON && it.qty > 1) {
      return el('span', { class: 'tag tag-qty', title: t('qtyLeftTitle', { left: it.remaining, qty: it.qty }), text: t('qtyLeft', { left: it.remaining, qty: it.qty }) });
    }
    if (it.qty > 1) return el('span', { class: 'tag tag-qty', title: t('qtyWanted'), text: '×' + it.qty });
    return null;
  }

  function card(it) {
    const legendary = it.starred;
    const tags = [
      legendary && el('span', { class: 'tag tag-legend', text: t('starred') }),
      el('span', { class: 'tag' + (legendary ? ' tag-vendor-on-gold' : ''), text: it.vendor }),
      el('span', { class: 'tag tag-type', text: it.tags.join(' + ') }),
      it.wasPrice && el('span', { class: 'tag tag-sale', text: t('sale', { pct: it.salePct }) }),
      qtyTag(it),
    ];
    const view = it.link
      ? el('a', {
          class: 'view', href: it.link, target: '_blank', rel: 'noopener noreferrer',
          'aria-label': t('viewAria', { name: it.name, shop: it.vendor }),
        }, [
          el('span', { text: t('view') }),
          svg('<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>'),
        ])
      : null;
    const loot = CLAIMS_ON && !it.looted && !it.giftCard
      ? el('button', {
          type: 'button', class: 'loot-btn', 'aria-label': t('lootAria', { name: it.name }),
          onclick: () => openLootDialog(it),
        }, [chestSvg(), el('span', { text: t('loot') })])
      : null;

    let cls = 'card';
    if (legendary) cls += ' is-legendary';
    if (it.looted) cls += ' is-looted';

    return el('article', { class: cls, 'data-item': it.id }, [
      legendary && el('div', { class: 'star-badge', role: 'img', 'aria-label': t('starBadge') }, starSvg(26)),
      photo(it),
      details(it),
      el('div', { class: 'card-body' }, [
        el('div', { class: 'tags' }, tags),
        el('h2', { text: it.name }),
        el('div', { class: 'card-foot' }, [
          it.giftCard ? el('span', { class: 'price is-giftcard' }, [
            svg(GIFT_SVG),
            it.giftMin ? t('giftFrom', { amount: fmt(it.giftMin) }) : t('giftAny'),
          ]) : el('span', { class: 'price' + (it.wasPrice ? ' is-sale' : '') }, [
            Number.isNaN(it.price) ? t('priceUnknown') : fmt(it.price),
            it.wasPrice && el('s', { class: 'was-price', 'aria-label': t('wasAria', { amount: fmt(it.wasPrice) }), text: fmt(it.wasPrice) }),
          ]),
          el('div', { class: 'card-actions' }, [loot, view]),
        ]),
        it.looted && el('p', { class: 'looted-note', text: t('lootedNote') }),
      ]),
    ]);
  }

  /* ---------- loot dialog + toast ---------- */

  let lootTarget = null;

  function openLootDialog(it) {
    lootTarget = it;
    const dlg = $('#loot-dialog');
    $('#loot-name').textContent = it.name;
    const qty = $('#loot-qty');
    qty.max = String(it.remaining);
    qty.value = '1';
    $('#loot-qty-row').hidden = it.remaining <= 1;
    $('#loot-left').textContent = it.qty > 1 ? t('lootLeft', { left: it.remaining, qty: it.qty }) : '';
    $('#loot-error').hidden = true;
    $('#loot-confirm').disabled = false;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    (it.remaining > 1 ? qty : $('#loot-confirm')).focus();
  }

  function closeLootDialog() {
    const dlg = $('#loot-dialog');
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  async function confirmLoot(e) {
    e.preventDefault();
    const it = lootTarget;
    if (!it) return;
    const n = Math.min(it.remaining, Math.max(1, parseInt($('#loot-qty').value, 10) || 1));
    const btn = $('#loot-confirm');
    btn.disabled = true;
    try {
      await sendClaim(it, n);
    } catch (err) {
      console.error('[wishlist] claim failed:', err);
      $('#loot-error').hidden = false;
      btn.disabled = false;
      return;
    }
    closeLootDialog();
    await lootAnimation(document.querySelector('.card[data-item="' + it.id + '"]'), n);
    applyClaims();
    render();
    showToast(it, n);
  }

  /* Card lifts forward, grows, then shrinks into a pixel loot bag that pops up at the bottom. */

  function lootAnimation(cardEl, n) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!cardEl || reduce || typeof cardEl.animate !== 'function') return Promise.resolve();
    return new Promise((resolve) => {
      const r = cardEl.getBoundingClientRect();
      const ghost = cardEl.cloneNode(true);
      ghost.classList.add('loot-ghost');
      Object.assign(ghost.style, {
        position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px',
        margin: '0', zIndex: '60', pointerEvents: 'none', transition: 'none', transformOrigin: 'center center',
      });
      const bag = el('div', { class: 'loot-bag', 'aria-hidden': 'true' }, THEME.art.lootBag ? THEME.art.lootBag.cloneNode(true) : null);
      document.body.append(bag, ghost);
      cardEl.style.visibility = 'hidden';

      const b = bag.getBoundingClientRect();
      const dx = (b.left + b.width / 2) - (r.left + r.width / 2);
      const dy = (b.top + b.height * 0.55) - (r.top + r.height / 2);
      const done = () => { ghost.remove(); bag.remove(); cardEl.style.visibility = ''; resolve(); };

      bag.animate(
        [{ transform: 'translateY(160%)' }, { transform: 'translateY(-8%)', offset: 0.7 }, { transform: 'translateY(0)' }],
        { duration: 420, delay: 250, easing: 'ease-out', fill: 'both' },
      );
      const fly = ghost.animate([
        { transform: 'translate(0, 0) scale(1)', boxShadow: '0 4px 14px rgba(43,42,92,0.07)', offset: 0 },
        { transform: 'translate(0, -14px) scale(1.12)', boxShadow: '0 26px 50px rgba(43,42,92,0.30)', offset: 0.28 },
        { transform: 'translate(0, -14px) scale(1.12)', boxShadow: '0 26px 50px rgba(43,42,92,0.30)', offset: 0.46 },
        { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(0.06) rotate(-10deg)', boxShadow: '0 0 0 rgba(43,42,92,0)', opacity: 0.7, offset: 1 },
      ], { duration: 1250, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });

      fly.onfinish = () => {
        ghost.remove();
        const plus = el('div', { class: 'loot-plus', text: '+' + n });
        bag.append(plus);
        plus.animate([{ transform: 'translate(-50%, 0)', opacity: 1 }, { transform: 'translate(-50%, -46px)', opacity: 0 }],
          { duration: 700, easing: 'ease-out', fill: 'forwards' });
        const gulp = bag.animate([
          { transform: 'scale(1)' }, { transform: 'scale(1.25, 0.85)' }, { transform: 'scale(0.92, 1.12)' }, { transform: 'scale(1)' },
        ], { duration: 380, easing: 'ease-out' });
        gulp.onfinish = () => {
          const out = bag.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(160%)', opacity: 0 }],
            { duration: 320, delay: 260, easing: 'ease-in', fill: 'forwards' });
          out.onfinish = done;
        };
      };
      setTimeout(() => { if (document.body.contains(bag)) done(); }, 4000); // safety net
    });
  }

  let toastTimer = null;
  function showToast(it, n) {
    const toast = $('#toast');
    const undo = el('button', {
      type: 'button', class: 'toast-undo', text: t('undo'),
      onclick: async () => {
        undo.disabled = true;
        try { await sendClaim(it, -n); } catch (err) { console.error(err); undo.disabled = false; return; }
        applyClaims();
        render();
        hideToast();
        setMascot($('#mascot').dataset.mood, t('planner.undone'));
      },
    });
    toast.replaceChildren(
      el('span', { class: 'toast-text', text: t('toast', { qty: n > 1 ? n + ' × ' : '', name: it.name }) }),
      undo,
      el('button', { type: 'button', class: 'toast-close', 'aria-label': t('dismiss'), text: '×', onclick: hideToast }),
    );
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 20000);
  }
  function hideToast() { $('#toast').hidden = true; clearTimeout(toastTimer); }

  /* ---------- gift planner ---------- */

  // Chooses units (an item still needed ×3 can be picked up to 3 times) so that:
  // legendary units come first, then as much of the budget as possible is used.
  // 0/1 knapsack on whole dollars (prices rounded up, so the real total never exceeds the budget).
  function planGifts(list, budget, want) {
    if (!(budget > 0)) return { state: 'idle' };
    const B = Math.min(Math.floor(budget + 1e-9), CONFIG.maxPlannerBudget);
    const W = B + 1;
    const pool = [];
    list.forEach((it) => {
      if (it.looted || it.giftCard || Number.isNaN(it.price) || Math.ceil(it.price) > B) return;
      for (let k = 0; k < it.remaining; k++) pool.push(it);
    });
    const n = pool.length;
    if (!n) return { state: 'none' };
    const cost = pool.map((it) => Math.max(0, Math.ceil(it.price)));
    const val = pool.map((it, i) => (it.starred ? W : 0) + cost[i] + 1e-3);
    const chosen = [];

    if (want > 0) {
      const K = Math.min(want, n);
      const dp = [];
      for (let k = 0; k <= K; k++) { const row = new Float64Array(W); row.fill(k === 0 ? 0 : -1); dp.push(row); }
      const keep = new Uint8Array(n * (K + 1) * W);
      for (let i = 0; i < n; i++) {
        for (let k = K; k >= 1; k--) {
          const prev = dp[k - 1], cur = dp[k];
          for (let w = B; w >= cost[i]; w--) {
            const p = prev[w - cost[i]];
            if (p >= 0 && p + val[i] > cur[w]) { cur[w] = p + val[i]; keep[(i * (K + 1) + k) * W + w] = 1; }
          }
        }
      }
      let k = K;
      while (k > 0 && dp[k][B] < 0) k--;
      let w = B;
      for (let i = n - 1; i >= 0 && k > 0; i--) {
        if (keep[(i * (K + 1) + k) * W + w]) { chosen.push(i); k--; w -= cost[i]; }
      }
    } else {
      const dp = new Float64Array(W);
      const keep = new Uint8Array(n * W);
      for (let i = 0; i < n; i++) {
        for (let w = B; w >= cost[i]; w--) {
          const cand = dp[w - cost[i]] + val[i];
          if (cand > dp[w]) { dp[w] = cand; keep[i * W + w] = 1; }
        }
      }
      let w = B;
      for (let i = n - 1; i >= 0; i--) {
        if (keep[i * W + w]) { chosen.push(i); w -= cost[i]; }
      }
    }
    if (!chosen.length) return { state: 'none' };

    const grouped = new Map();
    chosen.forEach((i) => {
      const it = pool[i];
      const g = grouped.get(it.id) || { item: it, n: 0 };
      g.n += 1;
      grouped.set(it.id, g);
    });
    const picks = [...grouped.values()].sort((a, b) => (b.item.starred - a.item.starred) || (b.item.price - a.item.price));
    const units = chosen.length;
    const total = picks.reduce((s, g) => s + g.item.price * g.n, 0);
    return { state: 'show', picks, units, total };
  }

  function setMascot(mood, line) {
    const m = $('#mascot');
    m.dataset.mood = mood;
    const label = THEME.mascot && THEME.mascot[mood];
    if (label) m.setAttribute('aria-label', label); else m.removeAttribute('aria-label');
    $('#mascot-line').textContent = line;
  }

  // Pick a gift card to fill leftover budget: legendary first, then sheet order. Blank minimum counts as $5.
  function pickGiftCard(list, spare) {
    const fits = list.filter((it) => it.giftCard && (it.giftMin || 5) <= spare);
    return fits.find((it) => it.starred) || fits[0] || null;
  }

  function renderPlanner(list) {
    const box = $('#gp-result');
    const budget = parseFloat(state.budget);
    const want = parseInt(state.count, 10);
    const buffer = Math.min(0.9, Math.max(0, CONFIG.taxShippingBuffer || 0));
    // Items are planned within budget minus the buffer. Tax & shipping is then estimated on the items
    // actually picked, at the same rate, so a gift card (tax-free, sent by email) gets the rest untouched.
    const reserve = budget > 0 ? Math.round(budget * buffer * 100) / 100 : 0;
    const giftBudget = budget > 0 ? budget - reserve : budget;
    const plan = planGifts(list, giftBudget, want > 0 ? want : 0);
    const itemReserveFor = (total) => (buffer > 0 && total > 0 ? Math.ceil(total * buffer / (1 - buffer) * 100) / 100 : 0);

    if (plan.state === 'idle') {
      setMascot('idle', t('planner.idle'));
      box.replaceChildren(el('div', { class: 'plan-empty' }, [
        svg('<svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.8" stroke-linejoin="round" style="fill:var(--surface);stroke:var(--text)"><path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z"/><path d="M12 7 L17.5 16 H6.5 Z" style="fill:var(--star)"/><path d="M12 2 V7 M3 7 L6.5 16 M21 7 L17.5 16 M12 22 L6.5 16 M12 22 L17.5 16" fill="none"/></svg>'),
        el('div', { class: 'plan-empty-title', text: t('planner.emptyTitle') }),
        el('p', { class: 'plan-empty-sub', text: t(CLAIMS_ON ? 'planner.emptySubClaims' : 'planner.emptySub') +
          (buffer > 0 ? ' ' + t('planner.bufferNote', { pct: Math.round(buffer * 100) }) : '') }),
      ]));
      return;
    }

    const itemsTotal = plan.state === 'show' ? plan.total : 0;
    const itemReserve = itemReserveFor(itemsTotal);
    const spareWhole = Math.floor(budget - itemsTotal - itemReserve + 1e-9);
    // With gift cards hidden, a card can still use up what's left after real gifts, but never stands in for them.
    const cardPool = state.hideGiftCards ? (itemsTotal > 0 ? filtered({ keepGiftCards: true }) : []) : list;
    const topCard = pickGiftCard(cardPool, spareWhole);
    const topUp = topCard ? { item: topCard, amount: spareWhole } : null;

    if (plan.state === 'none' && topUp) {
      plan.state = 'show'; plan.picks = []; plan.units = 0; plan.total = 0;
    }

    if (plan.state === 'none') {
      setMascot('sad', t('planner.none', { budget: fmt(giftBudget) }));
      box.replaceChildren(el('div', { class: 'plan-empty' }, [
        el('div', { class: 'plan-empty-title', text: t('planner.noneTitle') }),
        el('p', { class: 'plan-empty-sub', text: t('planner.noneSub', { reserve: fmt(reserve), budget: fmt(giftBudget) }) }),
      ]));
      return;
    }

    const anyGold = plan.picks.some((g) => g.item.starred);
    if (!plan.units) {
      setMascot('happy', t('planner.onlyCard', { amount: fmt(topUp.amount), name: topUp.item.name }));
    } else {
      setMascot('happy', (plan.units === 1 ? t('planner.foundOne') : t('planner.foundMany', { n: plan.units })) + ' ' +
        (topUp ? t('planner.topUp', { amount: fmt(topUp.amount), name: topUp.item.name })
          : t(anyGold ? 'planner.starredFirst' : 'planner.squeezed')));
    }

    const rows = plan.picks.map(({ item, n }) => el('li', { class: 'plan-row' }, [
      el('span', item.starred
        ? { class: 'plan-dot is-gold', role: 'img', 'aria-label': t('starred') }
        : { class: 'plan-dot', 'aria-hidden': 'true' }, item.starred ? starSvg(15) : null),
      el('span', { class: 'plan-name' }, [
        item.link
          ? el('a', { href: item.link, target: '_blank', rel: 'noopener noreferrer', text: item.name })
          : el('span', { text: item.name }),
        el('span', { class: 'plan-meta', text: item.vendor + (n > 1 ? ' · ×' + n : '') }),
      ]),
      el('span', { class: 'plan-price', text: fmt(item.price * n) }),
    ]));
    if (topUp) {
      const gc = topUp.item;
      rows.push(el('li', { class: 'plan-row is-giftcard' }, [
        el('span', { class: 'plan-dot is-gift', 'aria-hidden': 'true' }, svg(GIFT_SVG)),
        el('span', { class: 'plan-name' }, [
          gc.link
            ? el('a', { href: gc.link, target: '_blank', rel: 'noopener noreferrer', text: gc.name })
            : el('span', { text: gc.name }),
          el('span', { class: 'plan-meta', text: t(plan.units ? 'planner.giftCardMetaRest' : 'planner.giftCardMeta') }),
        ]),
        el('span', { class: 'plan-price', text: fmt(topUp.amount) }),
      ]));
    }
    const grand = plan.total + (topUp ? topUp.amount : 0);

    const children = [
      el('div', { class: 'plan-head' }, [el('strong', { text: t('planner.picksTitle') }), el('span', {
        text: (plan.units ? t('planner.gifts', { n: plan.units }) : '') + (topUp ? t(plan.units ? 'planner.plusCard' : 'planner.giftCard') : ''),
      })]),
      el('ul', { class: 'plan-list' }, rows),
      el('div', { class: 'plan-totals' }, [
        el('span', { class: 'plan-total', text: t('planner.total', { amount: fmt(grand) }) }),
        itemReserve > 0 && el('span', { class: 'plan-left', text: t('planner.reserve', { amount: fmt(itemReserve) }) }),
        el('span', { class: 'plan-left', text: t('planner.spare', { amount: fmt(Math.max(0, budget - grand - itemReserve)) }) }),
      ]),
    ];
    if (itemReserve > 0) {
      children.push(el('p', { class: 'plan-hint', text: t('planner.bufferHint', { pct: Math.round(buffer * 100) }) +
        (topUp ? ' ' + t('planner.giftCardNoTax') : '') }));
    }
    if (want > 0 && plan.units < want) {
      children.push(el('p', { class: 'plan-note', text: t('planner.onlyFit', { n: plan.units, want }) }));
    }
    if (giftBudget > CONFIG.maxPlannerBudget) {
      children.push(el('p', { class: 'plan-note', text: t('planner.maxBudget', { amount: fmt(CONFIG.maxPlannerBudget) }) }));
    }
    if (CLAIMS_ON && plan.units) {
      children.push(el('p', { class: 'plan-hint', text: t('planner.claimHint') }));
    }
    box.replaceChildren(...children);
  }

  /* ---------- render ---------- */

  function render() {
    const list = filtered();
    const sorted = list.slice().sort(sortWith(SORTS[state.sort] || SORTS.wanted));
    $('#grid').replaceChildren(...sorted.map(card));
    const looted = list.filter((it) => it.looted).length;
    $('#count').textContent = t('count', { left: list.length - looted, total: state.items.length }) + (looted ? t('countLooted', { n: looted }) : '');

    const status = $('#status');
    if (!list.length) {
      status.hidden = false;
      status.replaceChildren(
        el('div', { class: 'status-title', text: t('empty.title') }),
        el('p', { text: t('empty.text') }),
      );
    } else {
      status.hidden = true;
    }
    renderPlanner(list);
    applyHint();
  }

  /* One-time tip pointing at the first info button. Gone for good once any info button is tapped or the tip is closed. */
  const HINT_KEY = LAB ? 'wishlist-lab-hint-seen' : 'wishlist-info-hint-seen';
  function dismissHint() {
    store.set(HINT_KEY, '1');
    document.querySelectorAll('.info.has-hint').forEach((w) => {
      w.classList.remove('has-hint');
      w.closest('.card').classList.remove('has-hint-card');
      const tag = w.querySelector('.info-hint');
      if (tag) tag.remove();
    });
  }
  function applyHint() {
    if (store.get(HINT_KEY)) return;
    const wrap = document.querySelector('#grid .card:not(.is-looted) .info') || document.querySelector('#grid .info');
    if (!wrap || wrap.classList.contains('has-hint')) return;
    wrap.classList.add('has-hint');
    wrap.closest('.card').classList.add('has-hint-card');
    wrap.append(el('div', { class: 'info-hint', role: 'note' }, [
      el('span', { text: t('hint') }),
      el('button', {
        type: 'button', 'aria-label': t('dismissTip'), text: '×',
        onclick: (e) => { e.stopPropagation(); dismissHint(); },
      }),
    ]));
  }

  function renderStats() {
    const items = state.items;
    $('#stat-items').textContent = t('stat.items', { n: items.length });
    $('#stat-starred').textContent = t('stat.starred', { n: items.filter((it) => it.starred).length });
    $('#stat-shops').textContent = t('stat.shops', { n: new Set(items.map((it) => it.vendor)).size });
  }

  function renderModeBadge() {
    if (LAB) return;
    const badge = $('#mode-badge');
    if (TEST) {
      badge.hidden = false;
      badge.className = 'mode-badge is-test';
      badge.replaceChildren(el('span', { text: t('mode.test') }));
    } else if (SHIELD) {
      badge.hidden = false;
      badge.className = 'mode-badge is-shield';
      badge.replaceChildren(
        svg('<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z"/></svg>'),
        el('span', { text: t('mode.shield') }),
      );
      badge.title = t('mode.shieldTitle');
    }
  }

  function showError(setup) {
    setMascot('sad', t(setup ? 'setup.line' : 'error.line'));
    $('#gp-result').replaceChildren();
    $('#count').textContent = '';
    $('#stat-items').textContent = t('stat.items', { n: '?' });
    const status = $('#status');
    status.hidden = false;
    status.replaceChildren(
      el('div', { class: 'status-title', text: t(setup ? 'setup.title' : 'error.title') }),
      el('p', { text: setup && CHECK.config && CHECK.config.broken
        ? 'There\'s a typo in config.js' + (CHECK.config.line ? ' around line ' + CHECK.config.line : '') + ', usually a missing comma or quote at the end of a line. Add ?check to this page\'s address for help fixing it.'
        : t(setup ? 'setup.text' : 'error.text') }),
    );
  }


  /* ---------- setup check (?check) ----------
   * A plain-language report for the list owner: is the sheet connected, which settings were found,
   * which theme loaded, and is claiming working. Never shows what anyone bought. */

  const SETTING_LABELS = {
    theme: 'Theme', ownerName: 'Your name', title: 'List title', welcome: 'Welcome message',
    footer: 'Footer text', taxShippingBuffer: 'Tax & shipping buffer',
    claimsOn: 'Enable item claiming', claimsForm: 'Claim form link',
  };

  async function renderCheck() {
    const items = [];
    const add = (state, title, detail, fix) => items.push({ state, title, detail, fix });
    const sh = CHECK.sheet;

    // 0. A typo in config.js
    const cf = CHECK.config;
    if (cf && cf.broken) {
      const where = cf.line ? 'around line ' + cf.line : 'somewhere in the file';
      add(cf.rescued ? 'warn' : 'bad', 'config.js has a typo ' + where,
        cf.rescued ? 'Your sheet link was still found, so your site works. Anything else you changed in config.js is being ignored until the typo is fixed.' : 'Because of it, your site can\'t read your sheet link.',
        (cf.missingComma ? 'Line ' + cf.line + ' is probably missing a comma at the very end. ' : '') + 'On GitHub, open config.js and click the pencil. Look at that line and the one just above it. Every setting line ends with a comma, like  sheetUrl: \'https://…/pub?output=csv\',  and every link has a quote mark on both sides. Fix it and click Commit changes.');
    }

    // 1. The sheet
    if (!sh.set) add('bad', 'No sheet connected yet', 'config.js has no sheet link.', 'Publish your sheet (File → Share → Publish to web → Entire document → Comma-separated values) and paste the link after sheetUrl: in config.js.');
    else if (sh.html) add('bad', 'Your sheet link opens a web page, not data', 'The link in config.js is the "Web page" version.', 'In Publish to web, change "Web page" to "Comma-separated values (.csv)" and paste the new link into config.js.');
    else if (sh.error) add('bad', "Couldn't load your sheet", sh.error, 'Check that the sheet is still published (File → Share → Publish to web) and that the link in config.js is complete, inside the quotes.');
    else {
      add('ok', 'Sheet connected', sh.items + (sh.items === 1 ? ' item' : ' items') + ' found on the Items tab.');
      if (sh.missing && sh.missing.length) add('warn', 'Some columns are missing', 'Couldn\'t find: ' + sh.missing.join(', ') + '.', 'Keep the header row (row 1) on the Items tab, and keep Items as the first tab.');
    }

    // 2. The Settings tab
    const st = CHECK.settings;
    if (st.status === 'ok') {
      const found = Object.entries(st.found || {}).filter(([k]) => SETTING_LABELS[k] && k !== 'claimsForm')
        .map(([k, v]) => SETTING_LABELS[k] + ': ' + (k === 'claimsOn' ? (truthy(v) ? 'on' : 'off') : v));
      add('ok', 'Settings tab found', found.length ? found.join(' · ') : 'It\'s there, but everything is blank, so the theme\'s defaults are used.');
      const missing = Object.keys(SETTING_LABELS).filter((k) => !CHECK.settingRows.has(k));
      if (missing.length) add('info', 'Optional settings you can add', 'Your Settings tab doesn\'t have these rows yet. Add any you want: type the name in column A and the value in column B.', missing.map((k) => SETTING_LABELS[k]).join(', '));
    } else if (st.status === 'error') {
      add('warn', 'Couldn\'t find or read a Settings tab', 'Using the settings in config.js instead. (' + st.reason + ')', 'If your sheet has a Settings tab, publish the "Entire document" (not just Items) in Publish to web, then wait a few minutes. Sheets copied before the Settings tab existed don\'t have one, and that\'s fine.');
    } else {
      add('info', 'No Settings tab', 'Your settings come from config.js. Sheets copied from the template have a Settings tab for theme, name and more.');
    }

    // 3. Theme
    const list = await themeList();
    const nameOf = (folder) => (list.find((t) => t.folder === folder) || {}).name || folder;
    const th = CHECK.theme;
    if (th.preview) add('info', 'Previewing a theme', 'Showing ' + nameOf(THEME.name) + ' because the address has ?theme=. Your sheet says: ' + (th.requested || 'nothing') + '.');
    else if (th.missing) add('warn', 'Theme "' + th.requested + '" isn\'t in your copy', 'Using ' + nameOf(THEME.name) + ' for now.', 'If it\'s a new theme, update your copy: on GitHub click Sync fork → Update branch. Otherwise check the spelling in the Settings tab.');
    else if (th.requested) add('ok', 'Theme: ' + nameOf(THEME.name), 'Picked in your Settings tab.');
    else add('info', 'Theme: ' + nameOf(THEME.name), 'From config.js. Pick one in the Settings tab to change it.');

    // 4. Gift claiming
    const cl = CHECK.claims;
    if (SHIELD) add('info', 'Spoiler shield is on in this browser', 'Purchases are hidden here, so claiming can\'t be checked from this browser. Add ?shield=off to the address to turn it off.');
    else if (cl.sheetSays === false || (cl.sheetSays == null && !CLAIMS_CONFIGURED)) add('info', 'Gift claiming is off', 'Optional. See the gift claiming guide to turn it on.');
    else if (cl.sheetSays && !cl.formLink && !CLAIMS_CONFIGURED) add('warn', 'Claiming is ticked, but there\'s no claim form link', null, 'In your sheet, use Wishlist → Set up gift claiming. Or paste your form\'s pre-filled link into Claim form link on the Settings tab.');
    else if (cl.formLink && !cl.formOk) add('warn', 'The claim form link doesn\'t look right', /forms\.gle/i.test(cl.formLink) ? 'It\'s a short forms.gle link.' : null, 'Easiest: Wishlist → Set up gift claiming in your sheet. By hand: open your claim form, click ⋮ → Pre-fill form, type anything, click Get link, then COPY LINK, and paste that.');
    else if (cl.formLink && !cl.ids) add('warn', 'The claim form link is missing its questions', 'Paste the pre-filled link, not the regular share link.', 'In the form editor: ⋮ → Pre-fill form, type anything in the three boxes, then Get link → COPY LINK.');
    else if (cl.log === 'error' || cl.log === 'html') add('warn', 'Claims are sent, but the log can\'t be read', 'Gift-givers can mark items, but they won\'t see each other\'s purchases.', 'In Publish to web, choose "Entire document", then wait a few minutes. If your sheet has no hidden "Claimed items" tab, open your Form Responses tab, copy the address from your browser, and paste it into a Settings row named "Claims tab link".');
    else if (cl.log === 'ref') add('warn', 'The claims log can\'t find your form\'s responses', 'The hidden "Claimed items" tab looks for a tab called "Form Responses 1", and that tab isn\'t there.', 'Easiest: Wishlist → Set up gift claiming in your sheet connects everything. If you made the form by hand and its tab has a different number (like Form Responses 3), open that tab, copy the address from your browser, and paste it into a Settings row named "Claims tab link".');
    else if (cl.log === 'headers') add('warn', 'The claims log looks different than expected', 'It needs columns named item and quantity.', 'Don\'t rename or reorder the claim form\'s questions (item, quantity, ref). If you added a "Claims tab link" row, check it points at your Form Responses tab.');
    else if (CLAIMS_ON) add('ok', 'Gift claiming is on', 'The claim form and log are connected. (This page never shows what was bought.)');

    // 5. Price checks
    const pr = CHECK.prices;
    if (pr.found && pr.newest) {
      const days = Math.floor((Date.now() - pr.newest) / 864e5);
      add(days > CONFIG.maxPriceAgeDays ? 'warn' : 'ok', 'Daily price checks', 'Last run ' + pr.newest.toLocaleDateString() + (days > CONFIG.maxPriceAgeDays ? '. That\'s a while ago, so sheet prices are used.' : '.'),
        days > CONFIG.maxPriceAgeDays ? 'On GitHub, open Actions → Update prices and check that it\'s enabled.' : null);
    } else add('info', 'Daily price checks are off', 'Optional. See the price checks guide to show sales on your cards.');

    const icon = { ok: '✓', warn: '!', bad: '✕', info: 'i' };
    const panel = el('section', { class: 'wrap check-wrap', 'aria-labelledby': 'check-title' }, el('div', { class: 'panel check' }, [
      el('div', { class: 'check-head' }, [
        el('h2', { id: 'check-title', class: 'check-title', text: 'Setup check' }),
        el('p', { text: 'Only you need this page. Remove ?check from the address to see your shop as guests do.' }),
      ]),
      el('ul', { class: 'check-list' }, items.map((it) => el('li', { class: 'check-item is-' + it.state }, [
        el('span', { class: 'check-icon', 'aria-hidden': 'true', text: icon[it.state] }),
        el('div', { class: 'check-body' }, [
          el('strong', { text: it.title }),
          it.detail && el('p', { text: it.detail }),
          it.fix && el('p', { class: 'check-fix', text: it.fix }),
        ]),
      ]))),
      el('p', { class: 'check-foot' }, [
        'Still stuck? See the ',
        el('a', { href: 'https://github.com/nicolenadine/wishlist#questions', target: '_blank', rel: 'noopener', text: 'questions and answers' }),
        '.',
      ]),
    ]));
    document.querySelector('.planner-wrap').before(panel);
  }

  /* ---------- wiring ---------- */

  function wire() {
    $('#q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
    $('#star-only').addEventListener('change', (e) => { state.starOnly = e.target.checked; render(); });
    $('#hide-gift').addEventListener('change', (e) => { state.hideGiftCards = e.target.checked; render(); });
    $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
    $('#reset').addEventListener('click', resetFilters);
    $('#gp-budget').addEventListener('input', (e) => { state.budget = e.target.value; renderPlanner(filtered()); });
    $('#gp-count').addEventListener('input', (e) => { state.count = e.target.value; renderPlanner(filtered()); });
    $('#loot-form').addEventListener('submit', confirmLoot);
    $('#loot-cancel').addEventListener('click', closeLootDialog);
    $('#loot-dialog').addEventListener('click', (e) => { if (e.target.id === 'loot-dialog') closeLootDialog(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.info')) closeAllDetails(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllDetails(); });
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  }

  /* ---------- current prices ---------- */

  async function loadPrices() {
    for (const url of CONFIG.pricesUrls) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const prices = (await res.json()).prices || {};
          const dates = Object.values(prices).map((p) => new Date(p.checked)).filter((d) => !isNaN(d));
          CHECK.prices = { found: true, newest: dates.length ? new Date(Math.max(...dates)) : null };
          return prices;
        }
      } catch (e) { /* try the next one */ }
    }
    return {};
  }

  // Swap in recent checked prices; mark a sale when the store price is below its regular price or the sheet price.
  function applyPrices(prices) {
    const maxAge = CONFIG.maxPriceAgeDays * 864e5;
    state.items.forEach((it, i) => {
      let p = it.link && prices[it.link];
      if (TEST && !p && i === 2 && it.price > 0) {
        p = { price: Math.round(it.price * 75) / 100, regular: it.price, checked: new Date().toISOString() }; // fake sale to preview
      }
      if (it.giftCard || !p || !(p.price >= 0)) return;
      const checked = new Date(p.checked);
      if (!(Date.now() - checked < maxAge)) return;
      const sheet = it.price;
      const was = Math.max(p.regular || 0, Number.isFinite(sheet) ? sheet : 0);
      it.sheetPrice = sheet;
      it.price = p.price;
      it.checked = checked;
      if (was - p.price >= 0.01) {
        it.wasPrice = was;
        it.salePct = Math.max(1, Math.round((was - p.price) / was * 100));
      }
    });
  }

  // A typo in config.js (usually a missing comma) stops the whole file from running. Rescue the
  // sheet link from its text so the site still works, and let ?check point at the line.
  async function rescueConfig() {
    if (window.WISHLIST_CONFIG) return;
    const err = window.WISHLIST_CONFIG_ERROR;
    CHECK.config = { broken: Boolean(err), line: err && err.line };
    try {
      const text = await fetchText('config.js?t=' + Date.now());
      const m = text.match(/^\s*sheetUrl\s*:\s*['"`](https?:\/\/[^'"`\s]+)/m);
      if (m) { CONFIG.sheetUrl = m[1]; CHECK.config.rescued = true; }
      // The browser reports where it got confused, often several lines late. A setting line
      // that doesn't end with a comma is almost always the real culprit.
      const lines = text.split('\n');
      const i = lines.findIndex((l) => /^\s*[A-Za-z]\w*\s*:\s*\S/.test(l) && !/[,{[(]\s*(\/\/.*)?$/.test(l));
      if (i >= 0) { CHECK.config.line = i + 1; CHECK.config.missingComma = true; }
      if (!err && !/WISHLIST_CONFIG/.test(text)) CHECK.config.broken = false;
    } catch (e) { /* the setup message explains */ }
    if (CHECK.config.broken) console.warn('[wishlist] config.js has a typo near line ' + CHECK.config.line + (CHECK.config.rescued ? '; using the sheet link from it anyway.' : '.'));
  }

  /* ---------- theme lab ----------
   * theme-lab.html shows this page in a frame with ?lab. It uses the made-up items below instead of a
   * sheet, never sends anything, and takes its theme from the lab page instead of a theme folder.
   * The items are picked to show every kind of card: starred, on sale, bought, partly bought,
   * gift cards, a very long name and a missing photo. */
  const LAB_SHEET = [
    'name,price,size,color,quantity,starred,shop,category,image,notes,link',
    'Hand-thrown ceramic mug,34,12 oz,Speckled oat,1,TRUE,Etsy,Kitchen,mug.svg,"The bigger one, not the espresso cup.",https://www.etsy.com/',
    'Cable-knit scarf,48,One size,Forest green,1,TRUE,Etsy,Clothing,scarf.svg,,https://www.etsy.com/',
    'Wireless headphones,129.99,,Matte black,1,FALSE,Amazon,Tech,headphones.svg,Over-ear please,https://www.amazon.com/',
    '"The Complete Illustrated Field Guide to Mushrooms, Mosses and Lichens of the Pacific Northwest",42,,,1,FALSE,Bookshop,Books,book.svg,Hardcover,https://bookshop.org/',
    'Little potted succulent,16,,,2,FALSE,Local nursery,Home,plant.svg,,',
    'Beeswax candle set,24,,Honey,1,FALSE,Etsy,Home,candle.svg,,https://www.etsy.com/',
    'Cooperative board game,59.99,,,1,TRUE,Target,Games,game.svg,For 2 to 4 players,https://www.target.com/',
    'Wool hiking socks,22,M,Heather gray,3,FALSE,REI,Clothing,socks.svg,,https://www.rei.com/',
    'Brass reading lamp,85,,Brass,1,FALSE,Amazon,Home,,,https://www.amazon.com/',
    'Pour-over coffee kettle,45,,Matte white,1,FALSE,Amazon,Kitchen,kettle.svg,,https://www.amazon.com/',
    'Bookshop gift card,From $25,,,1,TRUE,Bookshop,Gift Cards,giftcard.svg,,https://bookshop.org/',
    'Corner cafe gift card,Any amount,,,1,FALSE,Corner cafe,Gift Cards,,,',
  ].join('\n');
  const LAB_CLAIMS = 'Timestamp,item,quantity,ref\n,Beeswax candle set,1,lab-1\n,Little potted succulent,1,lab-2';

  function loadLab() {
    CONFIG.ownerName = 'Sam';
    CONFIG.imageFolder = 'theme-lab/samples/';
    state.items = toItems(parseCSV(LAB_SHEET));
    groupShops(state.items);
    const { totals, refs } = readClaims(parseCSV(LAB_CLAIMS));
    state.sheetClaims = totals;
    state.sheetRefs = refs;
    applyPrices({}); // test mode puts a made-up sale on the third item
    applyClaims();
    wire();
    buildFilters();
    state.budget = '80';
    $('#gp-budget').value = '80';
    window.addEventListener('message', (e) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const type = e.data && e.data.type;
      if (type === 'wishlist-lab:theme') applyLabTheme(e.data.theme || {});
      else if (type === 'wishlist-lab:hello') window.parent.postMessage({ type: 'wishlist-lab:ready' }, window.location.origin);
    });
    window.parent.postMessage({ type: 'wishlist-lab:ready' }, window.location.origin);
  }

  // A theme from the lab: { css: '…', json: {…}, art: { 'art/hero-scene.svg': '<svg…' } }.
  // Art goes through the same cleaning as theme folders do.
  function applyLabTheme(theme) {
    let style = document.getElementById('theme-css');
    if (!style || style.tagName !== 'STYLE') {
      const fresh = document.createElement('style');
      fresh.id = 'theme-css';
      if (style) style.replaceWith(fresh); else document.head.append(fresh);
      style = fresh;
    }
    style.textContent = String(theme.css || '');
    const data = theme.json && typeof theme.json === 'object' ? theme.json : {};
    THEME.text = data.text && typeof data.text === 'object' ? { ...data.text } : {};
    THEME.mascot = data.mascot && typeof data.mascot === 'object' ? data.mascot : null;
    THEME.art = {};
    const files = theme.art || {};
    Object.entries(data.art && typeof data.art === 'object' ? data.art : {}).forEach(([slot, file]) => {
      const markup = files[String(file).replace(/^\.?\//, '')];
      const node = markup ? safeSvg(markup) : null;
      if (node) THEME.art[slot] = node;
    });
    applyTheme();
    renderStats();
    render();
    window.parent.postMessage({ type: 'wishlist-lab:applied' }, window.location.origin);
  }

  async function init() {
    if (LAB) { loadLab(); return; }
    await rescueConfig();
    try { await load(); } catch (err) { console.error('[wishlist]', err); }
    if (params.has('check')) renderCheck();
  }

  async function load() {
    // Start every download at once; the theme's words are needed before anything is drawn.
    const sheetSet = /^https?:\/\//i.test(String(CONFIG.sheetUrl).trim());
    const settingsReady = sheetSet ? loadSettings() : Promise.resolve({});
    const settingsApplied = settingsReady.then(applySettings);
    const themeReady = settingsApplied.then(loadTheme);
    const dataPromise = sheetSet ? fetchText(CONFIG.sheetUrl).catch((err) => err) : null;
    const claimsPromise = settingsApplied.then(() => (sheetSet && CLAIMS_ON && !TEST ? fetchText(c.csvUrl).catch((err) => err) : null));
    const pricesPromise = sheetSet ? loadPrices() : null;
    await themeReady;
    wire();
    renderModeBadge();
    CHECK.sheet = { set: sheetSet };
    if (!sheetSet) {
      showError(true);
      return;
    }
    try {
      const data = await dataPromise;
      if (data instanceof Error) throw data;
      if (/^\s*</.test(data)) { CHECK.sheet.html = true; throw new Error('The sheet link returned a web page, not CSV'); }
      const rows = parseCSV(data);
      const cols = rows.length ? mapColumns(rows[0]) : {};
      CHECK.sheet.missing = ['name', 'price'].filter((f) => !(f in cols));
      state.items = toItems(rows);
      CHECK.sheet.items = state.items.length;
      if (!state.items.length) throw new Error('No rows');
      groupShops(state.items);
    } catch (err) {
      console.error('[wishlist] could not load data:', err);
      CHECK.sheet.error = err.message || String(err);
      showError();
      return;
    }
    if (CLAIMS_ON) {
      let rows = [];
      if (TEST) rows = testClaimsRows(state.items);
      else {
        const res = await claimsPromise;
        if (res instanceof Error) { console.error('[wishlist] could not load claims:', res); CHECK.claims.log = 'error'; }
        else if (/^\s*</.test(res)) CHECK.claims.log = 'html';
        else if (/#REF!/.test(res)) CHECK.claims.log = 'ref';
        else {
          rows = parseCSV(res);
          const head = (rows[0] || []).map((h) => h.toLowerCase());
          CHECK.claims.log = head.some((h) => h.includes('item')) && head.some((h) => h.includes('quant')) ? 'ok' : 'headers';
        }
      }
      const { totals, refs } = readClaims(rows);
      state.sheetClaims = totals;
      state.sheetRefs = refs;
    }
    applyPrices(await pricesPromise);
    applyClaims();
    renderStats();
    buildFilters();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
