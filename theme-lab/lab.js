/* Theme lab
 * Paste an AI's answer, pick out the theme files, and show them on the sample shop
 * (index.html?lab, in the frame). Everything happens in this browser; nothing is sent anywhere.
 *
 * The AI is asked (docs/make-a-theme-with-ai.md, theme-lab/SKILL.md) to label each file:
 *   ```css theme.css   ```json theme.json   ```svg art/hero-scene.svg
 * Unlabeled blocks are recognized by what's in them.
 */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const frame = $('#preview');
  const paste = $('#paste');
  const DRAFT_KEY = 'wishlist-lab-draft';
  const ART_SLOTS = ['heroSky', 'heroScene', 'portrait', 'lootBag', 'mascotIdle', 'mascotHappy', 'mascotSad'];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } },
  };

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    for (const ch of [].concat(children || [])) {
      if (ch == null || ch === false) continue;
      node.append(ch.nodeType ? ch : document.createTextNode(String(ch)));
    }
    return node;
  }
  const code = (s) => el('code', { text: s });

  const slug = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);


  /* ---------- splitting a pasted answer into files ---------- */

  const FILE_RE = /(?:^|[\s"'`(\[:/])((?:[\w.-]+\/)*[\w.-]+\.(?:css|json|svg))\b/i;

  // Where a file goes inside the theme folder: theme.css, theme.json, or art/<name>.svg.
  function cleanPath(name) {
    let p = String(name).trim().replace(/\\/g, '/').replace(/^\.?\//, '');
    const lower = p.toLowerCase();
    if (lower.endsWith('theme.css')) return 'theme.css';
    if (lower.endsWith('theme.json')) return 'theme.json';
    if (lower.endsWith('.svg')) {
      const i = lower.lastIndexOf('art/');
      p = i >= 0 ? p.slice(i) : 'art/' + p.split('/').pop();
      return p.replace(/[^\w./-]/g, '-');
    }
    if (lower.endsWith('.css')) return 'theme.css';
    if (lower.endsWith('.json')) return 'theme.json';
    return null;
  }

  function guessKind(body) {
    const s = body.trim();
    if (/^<\?xml|^<svg[\s>]/i.test(s) || (/<svg[\s>]/i.test(s) && /<\/svg>\s*$/i.test(s))) return 'svg';
    if (/^\{[\s\S]*\}$/.test(s) && /"(name|text|art|mascot)"\s*:/.test(s)) return 'json';
    if (/(:root|@import|[.#\w-]+\s*\{)[\s\S]*:[\s\S]*\}/.test(s)) return 'css';
    return null;
  }

  // A file's name in a comment on its own first line: /* theme.css */ or <!-- art/portrait.svg -->.
  // The skill asks for this because copying one code block at a time loses everything around it.
  const nameComment = (body) => (body.match(/^\s*(?:\/\*|<!--)\s*((?:[\w.-]+\/)*[\w.-]+\.(?:css|json|svg))\s*(?:\*\/|-->)/i) || [])[1] || null;

  // Returns { blocks: [{ path, body, labeled }], unlabeledSvgs: [...] }
  function splitAnswer(text) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
    const blocks = [];
    let open = null;
    let lastProse = '';
    for (const line of lines) {
      if (!open) {
        const m = line.match(/^\s*(`{3,}|~{3,})\s*(.*)$/);
        if (m) { open = { fence: m[1], info: m[2], lines: [], before: lastProse }; continue; }
        if (line.trim()) lastProse = line;
      } else {
        const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
        if (close && close[1][0] === open.fence[0] && close[1].length >= open.fence.length) {
          blocks.push(open); open = null; lastProse = ''; continue;
        }
        open.lines.push(line);
      }
    }
    if (open) blocks.push(open); // an unclosed last block still counts
    // No code blocks: the answer was probably copied by selecting it, which drops the ``` markers.
    if (!blocks.length && text.trim()) return splitLoose(String(text).replace(/\r\n?/g, '\n'));

    const out = [];
    for (const b of blocks) {
      const body = b.lines.join('\n').trim();
      if (!body) continue;
      const kind = guessKind(body);
      // A file name in the block's label, or on the line just above it ("**theme.css**", "File: art/x.svg").
      const named = (b.info.match(FILE_RE) || [])[1] || nameComment(body) || (b.before.match(FILE_RE) || [])[1];
      let path = named ? cleanPath(named) : null;
      if (!path && kind) path = kind === 'css' ? 'theme.css' : kind === 'json' ? 'theme.json' : null;
      if (kind === 'svg' && path && !path.endsWith('.svg')) path = null;
      out.push({ path, body, kind, labeled: Boolean(named) });
    }
    return out;
  }


  // Finds the files in an answer with no ``` markers: pictures by their <svg> tags, theme.json by its
  // balanced braces, and theme.css as the style rules left over. File names come from the line or two
  // just above each one, where AI chats show them.
  function splitLoose(text) {
    const taken = []; // [start, end) ranges already used
    const out = [];
    const nameBefore = (start) => {
      const before = text.slice(Math.max(0, start - 160), start).split('\n').slice(-4).reverse();
      for (const line of before) { const m = line.match(FILE_RE); if (m) return m[1]; }
      return null;
    };
    for (const m of text.matchAll(/(?:<\?xml[^>]*>\s*)?<svg[\s>][\s\S]*?<\/svg>/gi)) {
      taken.push([m.index, m.index + m[0].length]);
      const named = nameBefore(m.index);
      const path = named && cleanPath(named);
      out.push({ path: path && path.endsWith('.svg') ? path : null, body: m[0].trim(), kind: 'svg', labeled: Boolean(named) });
    }
    const free = (i) => !taken.some(([a, b]) => i >= a && i < b);
    // theme.json: a { at the start of a line, followed by a "key":, closed by its matching }.
    const jsonStart = /(^|\n)[ \t]*\{\s*"[\w.-]+"\s*:/g;
    let jm;
    while ((jm = jsonStart.exec(text))) {
      const start = text.indexOf('{', jm.index);
      if (!free(start)) continue;
      let depth = 0, inStr = false, end = -1;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inStr) { if (ch === '\\') i++; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) { end = i + 1; break; }
      }
      if (end < 0) continue;
      const body = text.slice(start, end);
      if (!/"(name|text|art|mascot)"\s*:/.test(body)) continue;
      taken.push([start, end]);
      out.push({ path: 'theme.json', body, kind: 'json', labeled: false });
      jsonStart.lastIndex = end;
    }
    // theme.css: in each stretch of text that's left, from the first rule-like line to the last }.
    taken.sort((a, b) => a[0] - b[0]);
    const css = [];
    let pos = 0;
    for (const [a, b] of taken.concat([[text.length, text.length]])) {
      const piece = text.slice(pos, a);
      pos = Math.max(pos, b);
      const startM = piece.match(/(^|\n)[ \t]*(@import\b|:root\b|\/\*|[.#*\[\w][^\n{};]*\{)/);
      const end = piece.lastIndexOf('}');
      if (!startM || end < startM.index) continue;
      const chunk = piece.slice(startM.index, end + 1).trim();
      if (/:\s*[^;{}]+;?/.test(chunk)) css.push(chunk);
    }
    if (css.length) out.unshift({ path: 'theme.css', body: css.join('\n\n'), kind: 'css', labeled: false });
    return out;
  }


  /* ---------- turning the files into a theme, with notes for the person ---------- */

  // theme.json written slightly loosely (comments, trailing commas) is still read.
  function readJson(text) {
    try { return { data: JSON.parse(text) }; } catch (first) {
      const loose = text
        .replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str || '')
        .replace(/,(\s*[}\]])/g, '$1');
      try { return { data: JSON.parse(loose), loose: true }; } catch (e) {
        const pos = Number((String(first.message).match(/position (\d+)/) || [])[1]);
        const line = Number.isFinite(pos) ? text.slice(0, pos).split('\n').length : null;
        return { error: line ? 'near line ' + line : '' };
      }
    }
  }

  function svgProblem(markup) {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    if (doc.getElementsByTagName('parsererror').length || doc.documentElement.nodeName.toLowerCase() !== 'svg') return 'bad';
    if (doc.querySelector('script, foreignObject') || /\son\w+\s*=|javascript:/i.test(markup)) return 'cleaned';
    return '';
  }

  // The same cleaning the shop does when it loads art, so the downloaded file is clean too.
  function cleanSvg(markup) {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const root = doc.documentElement;
    root.querySelectorAll('script, foreignObject').forEach((n) => n.remove());
    [root, ...root.querySelectorAll('*')].forEach((n) => [...n.attributes].forEach((a) => {
      if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
    }));
    return new XMLSerializer().serializeToString(root);
  }

  // A picture with a viewBox but no width or height gets them from the viewBox.
  function withSize(markup) {
    const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const root = doc.documentElement;
    if (root.hasAttribute('width') && root.hasAttribute('height')) return markup;
    const vb = String(root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || !(vb[2] > 0 && vb[3] > 0)) return markup;
    if (!root.hasAttribute('width')) root.setAttribute('width', String(vb[2]));
    if (!root.hasAttribute('height')) root.setAttribute('height', String(vb[3]));
    return new XMLSerializer().serializeToString(root);
  }

  // Pictures pasted without file names go to the spots that fit their size: three 64×64 pictures are
  // the mascot, a 1200-wide one is the header scene, and so on. First exact sizes, then the closest shape.
  const SLOT_SIZE = { heroSky: [420, 170], heroScene: [1200, 178], portrait: [46, 46], mascotIdle: [64, 64], mascotHappy: [64, 64], mascotSad: [64, 64], lootBag: [96, 96] };
  function svgSize(markup) {
    const head = (markup.match(/<svg\b[^>]*>/i) || [''])[0];
    const num = (name) => parseFloat((head.match(new RegExp('\\s' + name + '\\s*=\\s*["\']?([\\d.]+)', 'i')) || [])[1]);
    let w = num('width'), h = num('height');
    if (!(w > 0 && h > 0)) {
      const vb = (head.match(/viewBox\s*=\s*["']([^"']+)["']/i) || [])[1];
      const parts = vb ? vb.trim().split(/[\s,]+/).map(Number) : [];
      if (parts.length === 4) { w = parts[2]; h = parts[3]; }
    }
    return w > 0 && h > 0 ? [w, h] : null;
  }
  function matchStrays(wanted, files, strays) {
    const open = Object.entries(wanted).filter(([slot, file]) => SLOT_SIZE[slot] && !files[cleanPath(file || '')]).map(([slot]) => slot);
    const left = strays.map((markup) => ({ markup, size: svgSize(markup) }));
    const out = {};
    const take = (slot, test) => {
      const i = left.findIndex((st) => st.size && test(st.size, SLOT_SIZE[slot]));
      if (i >= 0) { out[slot] = left[i].markup; left.splice(i, 1); }
    };
    open.forEach((slot) => take(slot, (a, b) => Math.abs(a[0] - b[0]) <= 2 && Math.abs(a[1] - b[1]) <= 2));
    open.filter((slot) => !out[slot]).forEach((slot) => take(slot, (a, b) => Math.abs(a[0] / a[1] - b[0] / b[1]) / (b[0] / b[1]) < 0.25));
    open.filter((slot) => !out[slot]).forEach((slot) => { const i = left.findIndex((st) => !st.size); if (i >= 0) { out[slot] = left[i].markup; left.splice(i, 1); } });
    return out;
  }

  function buildTheme(text) {
    const notes = [];
    const note = (level, ...parts) => notes.push({ level, parts });
    const files = {};
    const strays = []; // pictures with no file name
    for (const b of splitAnswer(text)) {
      if (b.kind === 'svg' && !b.path) { strays.push(b.body); continue; }
      if (!b.path) continue;
      if (files[b.path] != null) note('info', 'Found ', code(b.path), ' twice, so the last one is used.');
      files[b.path] = b.body;
    }

    const css = files['theme.css'] || '';

    if (css) {
      note('ok', code('theme.css'), ' colors and fonts');
      if (!/:root\s*\{/.test(css)) note('warn', code('theme.css'), " doesn't set the main colors (the :root part), so the defaults are used.");
      const fonts = [...css.matchAll(/@import\s+url\(\s*['"]?([^'")\s]+)/gi)].map((m) => m[1]);
      if (fonts.some((u) => !/^https:\/\/fonts\.googleapis\.com\//i.test(u))) {
        note('warn', 'Fonts load from somewhere other than Google Fonts.', el('small', { text: 'Themes shared with everyone should use Google Fonts, which are free to use.' }));
      }
    } else if (text.trim()) {
      note('bad', 'No ', code('theme.css'), ' found.', el('small', { text: "That's the file with the colors. Ask the AI to send all the files again." }));
    }

    let json = null;
    let blocked = false;
    if (files['theme.json'] != null) {
      const r = readJson(files['theme.json']);
      blocked = r.error != null || !r.data || typeof r.data !== 'object' || Array.isArray(r.data);
      if (r.error != null) note('bad', code('theme.json'), ' has a typo ' + r.error + '.',
        el('small', { text: 'Ask the AI: "theme.json has a mistake, please send all the files again."' }));
      else if (!r.data || typeof r.data !== 'object' || Array.isArray(r.data)) note('bad', code('theme.json'), " isn't laid out like a theme.");
      else {
        json = r.data;
        note('ok', code('theme.json'), json.name ? ' for "' + json.name + '"' : ' wording');
        if (r.loose) note('info', code('theme.json'), ' had small slips (comments or extra commas). The lab read past them, and the download has them fixed.');
      }
    } else if (text.trim() && files['theme.json'] == null) note('warn', 'No ', code('theme.json'), ' found, so the shop uses the plain default wording.');

    // Pictures: the ones theme.json asks for, matched to what was pasted.
    const art = {};
    const wanted = json && json.art && typeof json.art === 'object' ? json.art : {};
    const used = new Set();
    let found = 0;
    const strayFor = matchStrays(wanted, files, strays);
    for (const [slot, file] of Object.entries(wanted)) {
      if (!ART_SLOTS.includes(slot)) { note('warn', code('theme.json'), ' names a picture spot called "' + slot + '", which the shop doesn\'t have.'); continue; }
      const path = cleanPath(file || '');
      let markup = path && files[path];
      if (!markup && strayFor[slot]) { markup = strayFor[slot]; note('info', 'A picture without a file name was matched to ', code(path || slot), ' by its size.'); }
      if (!markup) { note('warn', 'Picture ', code(path || String(file)), " is listed but wasn't pasted, so that spot stays empty."); continue; }
      used.add(path);
      const problem = svgProblem(markup);
      if (problem === 'bad') { note('bad', 'Picture ', code(path), " isn't a valid picture, so it's skipped."); continue; }
      if (problem === 'cleaned') { note('info', 'Picture ', code(path), ' had code in it, which was removed.'); markup = cleanSvg(markup); }
      markup = withSize(markup); // some spots need a size on the picture itself, or it shrinks to nothing
      art[path] = markup;
      found += 1;
    }
    if (found) note('ok', found === 1 ? '1 picture' : found + ' pictures');
    const extra = Object.keys(files).filter((p) => p.endsWith('.svg') && !used.has(p));
    if (extra.length) note('info', extra.length === 1 ? 'One picture isn\'t used by theme.json: ' : 'Some pictures aren\'t used by theme.json: ', code(extra.join(', ')));

    const name = (json && typeof json.name === 'string' && json.name.trim()) || 'My Theme';
    const folder = slug(name) || 'my-theme';
    return { ok: Boolean(css || json) && !blocked, blocked, theme: { css, json: json || {}, art }, notes, name, folder };
  }


  /* ---------- talking to the preview ---------- */

  let frameReady = false;
  let pending = null;
  let current = null; // what's in the preview: { source: 'paste' | 'builtin', name, ... }

  function send(theme) {
    pending = theme;
    if (frameReady) frame.contentWindow.postMessage({ type: 'wishlist-lab:theme', theme }, location.origin);
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    const type = e.data && e.data.type;
    if (type === 'wishlist-lab:ready') {
      if (frameReady) return;
      frameReady = true;
      if (pending) send(pending);
    } else if (type === 'wishlist-lab:applied') {
      const doc = frame.contentDocument;
      const settle = () => requestAnimationFrame(() => requestAnimationFrame(checkColors));
      (doc && doc.fonts ? Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve()).then(settle);
    }
  });

  function showing(label, mine) {
    const s = $('#showing');
    s.replaceChildren(mine ? 'Showing your theme, ' : 'Showing ', el('em', { text: label }));
  }


  /* ---------- colors: swatches and "easy to read?" ---------- */

  function parseColor(str) {
    const m = String(str).match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
    if (!m) return null;
    let a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [Number(m[1]), Number(m[2]), Number(m[3]), a];
  }
  const over = (top, under) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1);
  };
  function lum(c) {
    const ch = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

  // The color actually behind an element: its own background, blended over its parents'.
  // Gradients count too: each solid-enough color in a gradient is a possible backdrop, and the
  // check uses whichever is hardest to read against.
  function backdrops(win, node) {
    const layers = [];
    let bases = [[255, 255, 255, 1]];
    for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
      const cs = win.getComputedStyle(n);
      const stops = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(parseColor).filter((c) => c && c[3] >= 0.6);
      const c = parseColor(cs.backgroundColor);
      if (stops.length) { bases = stops.map((st) => (c && c[3] > 0 ? over(st, over(c, [255, 255, 255, 1])) : over(st, [255, 255, 255, 1]))); break; }
      if (c && c[3] > 0) { if (c[3] >= 1) { bases = [c]; break; } layers.push(c); }
    }
    return bases.map((base) => layers.reduceRight((under, top) => over(top, under), base));
  }

  const READ_SPOTS = [
    ['body', 'Main text'],
    ['.dialog p', 'Welcome message'],
    ['h1', 'List title', true],
    ['.stat', 'Header counts'],
    ['.card:not(.is-looted) h2', 'Item names'],
    ['.card:not(.is-looted) .price:not(.is-sale)', 'Prices'],
    ['.price.is-sale', 'Sale prices'],
    ['.tag-legend', 'Starred tag'],
    ['.card:not(.is-looted) .tag:not(.tag-legend)', 'Shop and category tags'],
    ['.view', '"View" buttons'],
    ['.loot-btn', '"Bought it" buttons'],
    ['.chip', 'Filter buttons'],
    ['.filter-title', 'Filter headings'],
    ['.bubble p', 'Gift helper messages'],
    ['.planner-title', 'Gift helper title', true],
    ['.count', 'Item count'],
    ['.footer', 'Footer'],
  ];

  function checkColors() {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;
    const root = win.getComputedStyle(doc.documentElement);
    const sw = $('#swatches');
    sw.replaceChildren(...[['--page', 'Page'], ['--surface', 'Cards'], ['--text', 'Text'], ['--dark', 'Dark'], ['--accent', 'Accent'], ['--star', 'Starred']].map(([v, label]) => {
      const color = root.getPropertyValue(v).trim() || 'transparent';
      return el('div', { class: 'swatch', style: 'background:' + color, title: label + ' ' + color }, el('span', { text: label }));
    }));

    const problems = [];
    let fine = 0;
    for (const [sel, label, bigByRole] of READ_SPOTS) {
      const node = doc.querySelector(sel);
      if (!node || !node.getClientRects().length) continue;
      const cs = win.getComputedStyle(node);
      const fg = parseColor(cs.color);
      if (!fg) continue;
      let bg = null, ratio = Infinity;
      for (const b of backdrops(win, node)) { const r = contrast(over(fg, b), b); if (r < ratio) { ratio = r; bg = b; } }
      const size = parseFloat(cs.fontSize);
      const big = bigByRole || size >= 24 || (size >= 18.6 && Number(cs.fontWeight) >= 700);
      const need = big ? 3 : 4.5;
      if (ratio >= need) { fine += 1; continue; }
      const rgb = (c) => 'rgb(' + c.slice(0, 3).map(Math.round).join(',') + ')';
      problems.push({ label, level: ratio < need * 0.7 ? 'bad' : 'warn', fg: rgb(fg), bg: rgb(bg) });
    }
    $('#read').replaceChildren(...problems.map((p) => el('li', { class: p.level }, [
      el('span', { class: 'pair', style: 'color:' + p.fg + ';background:' + p.bg, 'aria-hidden': 'true', text: 'Aa' }),
      el('span', {}, [el('strong', { text: p.label }), p.level === 'bad' ? ': hard to read' : ': may be hard to read for some people']),
    ])));
    $('#read-ok').textContent = problems.length
      ? (fine ? fine + ' other spots look easy to read. ' : '') + 'To fix it, tell the AI which parts are hard to read.'
      : 'Everything checked looks easy to read.';
    $('#colors').hidden = false;
  }


  /* ---------- pasting ---------- */

  let built = null;
  let timer = null;

  function renderNotes(result) {
    const list = $('#found');
    list.replaceChildren(...result.notes.map((n) => el('li', { class: n.level }, [
      el('span', { class: 'mark', 'aria-hidden': 'true', text: { ok: '✓', warn: '!', bad: '✕', info: 'i' }[n.level] }),
      el('span', {}, n.parts),
    ])));
    $('#found-empty').hidden = result.notes.length > 0;
  }

  function onPaste() {
    clearTimeout(timer);
    try { readPaste(); } catch (err) {
      console.error('[theme lab]', err);
      status("Something went wrong reading that. Try copying the AI's answer again with its Copy button, then paste it here.", 'bad');
    }
  }

  function status(message, level) {
    const node = $('#paste-status');
    node.textContent = message;
    node.className = 'paste-status' + (level ? ' is-' + level : '');
    node.hidden = !message;
  }

  function readPaste() {
    const text = paste.value;
    store.set(DRAFT_KEY, text);
    if (!text.trim()) {
      status('');
      built = null;
      $('#found').replaceChildren();
      $('#found-empty').hidden = false;
      $('#save').hidden = true;
      $('#save-empty').hidden = false;
      showBuiltin($('#builtin').value);
      return;
    }
    const result = buildTheme(text);
    renderNotes(result);
    built = result.ok ? result : null;
    $('#save').hidden = !built;
    $('#save-empty').hidden = Boolean(built);
    $('#save-empty').textContent = result.blocked
      ? 'Fix the problem with theme.json above, and the download will be ready here.'
      : 'Once a theme is pasted and looks right, you can download it here.';
    if (!built) {
      // Still show the colors while theme.json gets fixed.
      if (result.blocked && result.theme.css) {
        current = { source: 'paste' }; showing(result.name, true); send(result.theme);
        status('The preview shows the colors, but theme.json has a typo. See step 2.', 'warn');
      } else {
        status("Couldn't find a theme in what you pasted. Copy the AI's whole answer (its Copy button works best) and paste it here.", 'bad');
        showBuiltin($('#builtin').value, true); // keep the preview filled in, never blank
      }
      return;
    }
    const pics = Object.keys(built.theme.art).length;
    status('Preview updated with "' + built.name + '"' + (pics ? ' and ' + pics + (pics === 1 ? ' picture' : ' pictures') : '') + '.', 'ok');
    $('#folder-name').textContent = built.folder;
    $('#csv-line').value = csvField(built.name) + ',' + built.folder;
    $('#share-note').textContent = '';
    current = { source: 'paste' };
    showing(built.name, true);
    send(built.theme);
  }

  const csvField = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);

  paste.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(onPaste, 350); });
  $('#show').addEventListener('click', onPaste);
  $('#clear').addEventListener('click', () => { paste.value = ''; history.replaceState(null, '', location.pathname + location.search); onPaste(); paste.focus(); });


  /* ---------- built-in themes ---------- */

  async function themeList() {
    try {
      const text = await (await fetch('themes/themes.csv', { cache: 'no-cache' })).text();
      return text.trim().split(/\r?\n/).slice(1).map((line) => {
        const m = line.match(/^\s*(?:"((?:[^"]|"")*)"|([^,]*)),\s*([\w-]+)\s*$/);
        return m ? { name: (m[1] != null ? m[1].replace(/""/g, '"') : m[2]).trim(), folder: m[3] } : null;
      }).filter(Boolean);
    } catch (e) { return [{ name: 'Starter', folder: 'starter' }]; }
  }

  async function loadBuiltin(folder) {
    const base = 'themes/' + folder + '/';
    const get = async (p) => { const r = await fetch(base + p, { cache: 'no-cache' }); if (!r.ok) throw new Error(p); return r.text(); };
    const css = await get('theme.css').catch(() => '');
    const jsonText = await get('theme.json').catch(() => '{}');
    let json = {};
    try { json = JSON.parse(jsonText); } catch (e) { /* plain defaults */ }
    const art = {};
    await Promise.all(Object.values(json.art || {}).map(async (p) => { art[cleanPath(p)] = await get(p).catch(() => ''); }));
    return { css, json, jsonText, art };
  }

  let builtinCache = {};
  async function showBuiltin(folder, force) {
    if (!folder) return;
    const t = builtinCache[folder] || (builtinCache[folder] = await loadBuiltin(folder));
    if (!force && paste.value.trim() && current && current.source === 'paste') return; // pasted themes win
    current = { source: 'builtin', folder };
    showing(t.json.name || folder, false);
    send({ css: t.css, json: t.json, art: t.art });
  }

  $('#builtin').addEventListener('change', async (e) => {
    const folder = e.target.value;
    const t = builtinCache[folder] || (builtinCache[folder] = await loadBuiltin(folder));
    current = { source: 'builtin', folder };
    showing(t.json.name || folder, false);
    send({ css: t.css, json: t.json, art: t.art });
  });

  // The theme's files as labeled blocks, ready to paste to an AI.
  $('#copy-builtin').addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const folder = $('#builtin').value;
    const t = builtinCache[folder] || (builtinCache[folder] = await loadBuiltin(folder));
    const parts = ['```css theme.css', t.css.trim(), '```', '', '```json theme.json', t.jsonText.trim(), '```'];
    for (const [p, svg] of Object.entries(t.art)) if (svg) parts.push('', '```svg ' + p, svg.trim(), '```');
    await copy(parts.join('\n'), button, 'Copied');
  });

  async function copy(text, button, done) {
    const label = button.textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = done; }
    catch (err) { button.textContent = "Couldn't copy"; }
    setTimeout(() => { button.textContent = label; }, 1800);
  }
  // If the instructions can't be loaded here, point to them on GitHub so nobody is stuck.
  function skillFallback(button, label) {
    button.textContent = label;
    const note = $('#skill-note');
    note.replaceChildren("Couldn't load the instructions here. ", el('a', { href: 'https://github.com/nicolenadine/wishlist/blob/main/skills/wishlist-theme/SKILL.md', target: '_blank', rel: 'noopener', text: 'Open them on GitHub' }), ' instead, then copy everything below the title.');
    note.hidden = false;
  }

  // The AI instructions: the same file Claude uses as a skill, ready to paste into any AI chat.
  $('#copy-skill').addEventListener('click', async (e) => {
    const button = e.currentTarget;
    try {
      const res = await fetch('skills/wishlist-theme/SKILL.md', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const body = (await res.text()).replace(/^---[\s\S]*?---\s*/, '');
      await copy('Use these instructions to make a theme for my wishlist site. Ask me your questions first.\n\n' + body, button, 'Copied. Now paste it into your AI.');
    } catch (err) { skillFallback(button, 'Copy AI instructions'); }
  });

  // The same instructions packaged the way Claude's Settings → Skills upload expects: a zip with the skill folder.
  $('#skill-zip').addEventListener('click', async (e) => {
    const button = e.currentTarget;
    try {
      const res = await fetch('skills/wishlist-theme/SKILL.md', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      saveBlob(makeZip([['wishlist-theme/SKILL.md', await res.text()]]), 'wishlist-theme-skill.zip');
    } catch (err) { skillFallback(button, 'Or add them to Claude as a skill'); }
  });

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  $('#copy-csv').addEventListener('click', (e) => copy($('#csv-line').value, e.currentTarget, 'Copied'));


  /* ---------- download: a zip with the theme folder ---------- */

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // A plain (uncompressed) zip. Theme files are small, so there's no need for compression.
  function makeZip(entries) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    const now = new Date();
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const [name, text] of entries) {
      const nameBytes = enc.encode(name);
      const data = enc.encode(text);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true); local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true); local.setUint16(28, 0, true);
      chunks.push(new Uint8Array(local.buffer), nameBytes, data);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, dosTime, true); cen.setUint16(14, dosDate, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
      cen.setUint16(28, nameBytes.length, true); cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    }
    const size = central.reduce((s, c) => s + c.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  $('#download').addEventListener('click', () => {
    if (!built) return;
    const f = built.folder;
    const entries = [];
    if (built.theme.css) entries.push([f + '/theme.css', built.theme.css.trim() + '\n']);
    entries.push([f + '/theme.json', JSON.stringify(built.theme.json, null, 2) + '\n']);
    for (const [p, svg] of Object.entries(built.theme.art)) entries.push([f + '/' + p, svg.trim() + '\n']);
    saveBlob(makeZip(entries), f + '.zip');
  });


  /* ---------- preview links: the pasted answer, packed into the address ---------- */

  const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

  async function pack(text) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function unpack(s) {
    const stream = new Blob([fromB64(s)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }

  $('#share').addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const noteEl = $('#share-note');
    try {
      const packed = await pack(paste.value);
      const link = location.origin + location.pathname + '#t=' + packed;
      history.replaceState(null, '', '#t=' + packed);
      await copy(link, button, 'Link copied');
      noteEl.textContent = 'Anyone with this link sees this theme in the lab. Nothing changes on your site.' +
        (link.length > 8000 ? ' The link is long because of the pictures; some chat apps may cut it off.' : '');
    } catch (err) {
      noteEl.textContent = "This browser can't make preview links. Download the folder instead.";
    }
  });


  /* ---------- preview size ---------- */

  let size = 'desktop';
  const SIZES = { desktop: [1280, 900], phone: [390, 780] };
  function fit() {
    const vp = $('#viewport');
    const narrow = matchMedia('(max-width: 860px)').matches;
    const mode = narrow ? 'phone' : size;
    const [w, h] = SIZES[mode];
    const room = vp.clientWidth - 44;
    const tall = narrow ? 780 : Math.max(500, vp.clientHeight - 22);
    const scale = Math.min(1, room / w);
    const device = $('#device');
    device.classList.toggle('is-phone', mode === 'phone');
    frame.style.width = w + 'px';
    frame.style.height = (mode === 'phone' ? h : Math.round(tall / scale)) + 'px';
    device.style.width = w + 'px';
    device.style.transform = scale < 1 ? 'scale(' + scale + ')' : '';
    const scaler = $('#scaler');
    scaler.style.width = Math.round(w * scale) + 'px';
    scaler.style.height = Math.round((mode === 'phone' ? h : tall / scale) * scale) + 'px';
  }
  document.querySelectorAll('.toggle button').forEach((b) => b.addEventListener('click', () => {
    size = b.dataset.size;
    document.querySelectorAll('.toggle button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    fit();
  }));
  new ResizeObserver(fit).observe($('#viewport'));
  window.addEventListener('resize', fit);


  /* ---------- start ---------- */

  // The preview says when it's ready, but it may have said so before this script was listening, so ask too.
  const hello = () => { try { frame.contentWindow.postMessage({ type: 'wishlist-lab:hello' }, location.origin); } catch (e) { /* not loaded yet */ } };
  hello();
  frame.addEventListener('load', () => setTimeout(hello, 50));

  (async () => {
    const list = await themeList();
    $('#builtin').replaceChildren(...list.map((th) => el('option', { value: th.folder, text: th.name })));
    if (list.some((th) => th.folder === 'starter')) $('#builtin').value = 'starter';
    fit();
    const shared = (location.hash.match(/^#t=([\w-]+)/) || [])[1];
    let text = '';
    if (shared) { try { text = await unpack(shared); } catch (e) { /* a broken link just opens the lab */ } }
    if (!text) text = store.get(DRAFT_KEY) || '';
    paste.value = text;
    if (text.trim()) onPaste(); else showBuiltin($('#builtin').value);
  })();
})();
