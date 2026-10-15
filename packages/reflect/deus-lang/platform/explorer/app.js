//
// Copyright 2026 DXOS.org
//

// The codebase explorer (D58, D75): a single page over the JSON that `deus explore` writes, modelled on
// Unison Share. A namespace tree, a finder (`/`), and a workspace of cards: definitions, namespaces, tasks
// and changes. The open cards are kept in the URL fragment, in display order, so a view can be shared.

const STATES = ['todo', 'doing', 'done', 'canceled'];
const PRIORITIES = ['none', 'urgent', 'high', 'medium', 'low'];
const KINDS = {
  type: { icon: 'T', label: 'type', plural: 'Types' },
  ability: { icon: 'A', label: 'ability', plural: 'Abilities' },
  term: { icon: 'ƒ', label: 'term', plural: 'Terms' },
  test: { icon: '✓', label: 'test', plural: 'Tests' },
  theorem: { icon: '∀', label: 'theorem', plural: 'Theorems' },
  spec: { icon: 'S', label: 'spec', plural: 'Specs' },
};
const KIND_ORDER = Object.keys(KINDS);
const LIST_LIMIT = 24;

const escape = (text) =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const element = (id) => document.getElementById(id);

const short = (hash) => (hash.startsWith('#') ? hash : `#${hash.slice(0, 8)}`);

const lastSegment = (name) => name.slice(name.lastIndexOf('.') + 1);

const namespaceOf = (name) => (name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : '');

/** A definition's page: builtin hashes are IRIs such as `#Bool`, written as `_Bool`. */
const pagePath = (hash) => `def/${hash.startsWith('#') ? `_${hash.slice(1)}` : hash}.json`;

const cache = new Map();

/** Each file is fetched once; a missing file resolves to `undefined`. */
const load = (path) => {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path)
        .then((response) => (response.ok ? response.json() : undefined))
        .catch(() => undefined),
    );
  }
  return cache.get(path);
};

//
// Codebase indexes.
//

const index = {
  meta: undefined,
  names: [],
  tasks: [],
  byHash: new Map(),
  byName: new Map(),
  tree: undefined,
};

/** The namespace tree: a node per name segment; a node may also be a definition (`List` and `List.map`). */
const buildTree = (names) => {
  const root = { segment: '', path: '', children: new Map(), entry: undefined, count: 0 };
  for (const entry of names) {
    let node = root;
    node.count++;
    for (const segment of entry.name.split('.')) {
      if (!node.children.has(segment)) {
        const path = node.path ? `${node.path}.${segment}` : segment;
        node.children.set(segment, { segment, path, children: new Map(), entry: undefined, count: 0 });
      }
      node = node.children.get(segment);
      node.count++;
    }
    node.entry = entry;
    node.count--;
  }
  return root;
};

const nodeAt = (path) => {
  let node = index.tree;
  for (const segment of path ? path.split('.') : []) {
    node = node?.children.get(segment);
  }
  return node;
};

const sortedChildren = (node) => [...node.children.values()].sort((a, b) => a.segment.localeCompare(b.segment));

/** Resolves a name as written inside `namespace`: the innermost enclosing namespace that binds it wins. */
const resolve = (name, namespace) => {
  const parts = namespace ? namespace.split('.') : [];
  for (let i = parts.length; i >= 0; i--) {
    const candidate = [...parts.slice(0, i), name].join('.');
    const entry = index.byName.get(candidate);
    if (entry) {
      return entry;
    }
  }
  return undefined;
};

//
// Writing (D82): signed-in members of the GitHub org comment and file tasks through the hosted
// explorer's worker. Its requests wait in the remote's inbox until `deus inbox` applies them, so
// the app shows them as pending until the pages are regenerated. Without the worker (a local
// `deus explore`, a bare bucket) `api/me` is missing and the explorer stays read-only.
//

const account = { signIn: false, login: null, avatar: null, member: false, org: '' };

/** Comments by subject (`def:<name>`, `change:<causal>`), from `comments.json`. */
let comments = {};

/** Requests filed here that the codebase does not have yet. */
let pending = [];

const ASSET_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];

const getJson = async (path) => {
  try {
    const response = await fetch(path, { credentials: 'same-origin' });
    return response.ok && (response.headers.get('content-type') ?? '').includes('json')
      ? await response.json()
      : undefined;
  } catch {
    return undefined;
  }
};

const loadWriting = async () => {
  const [me, inbox, saved] = await Promise.all([getJson('api/me'), getJson('api/inbox'), load('comments.json')]);
  comments = saved ?? {};
  if (me) {
    Object.assign(account, me);
  }
  // A request stays in the inbox until applied; once the pages carry it, it is shown from them.
  pending = Array.isArray(inbox) ? inbox : [];
  renderAccount();
};

const canWrite = () => account.signIn && account.member;

const signInHref = () => `auth/login?return=${encodeURIComponent(location.pathname + location.hash)}`;

const renderAccount = () => {
  const node = element('account');
  node.hidden = !account.signIn;
  element('new-task').hidden = !canWrite();
  element('report').hidden = !canWrite();
  if (!account.signIn) {
    return;
  }
  node.innerHTML = account.login
    ? `${account.avatar ? `<img class="avatar" src="${escape(account.avatar)}" alt="" />` : ''}` +
      `<span class="login" title="${account.member ? `Member of ${escape(account.org)}` : `Not a member of ${escape(account.org)}: read only`}">@${escape(account.login)}</span>` +
      `${account.member ? '' : '<span class="chip">read only</span>'}<a class="plain-button" href="auth/logout">Sign out</a>`
    : `<a class="plain-button sign-in" href="${escape(signInHref())}">Sign in<span class="wide-only"> with GitHub</span></a>`;
};

const authorHtml = (author) =>
  author.startsWith('github:')
    ? `<a class="author" href="https://github.com/${escape(author.slice(7))}" target="_blank" rel="noopener">@${escape(author.slice(7))}</a>`
    : `<b class="author">${escape(author)}</b>`;

/** `written` is RFC 3339 from the worker, or nanoseconds since the epoch from the CLI. */
const whenHtml = (written) => {
  if (!written) {
    return '';
  }
  const date = /^\d+$/.test(written) ? new Date(Number(written.slice(0, -6))) : new Date(written);
  return Number.isNaN(date.getTime())
    ? ''
    : `<time datetime="${escape(date.toISOString())}" title="${escape(date.toLocaleString())}">${escape(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))}</time>`;
};

/** A change's time (seconds since the epoch, D165): date and time in the reader's zone, the full time on hover. */
const atHtml = (seconds) => {
  if (typeof seconds !== 'number') {
    return '';
  }
  const date = new Date(seconds * 1000);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const text = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  });
  return `<time class="at" datetime="${escape(date.toISOString())}" title="${escape(date.toLocaleString())}">${escape(text)}</time>`;
};

const assetHtml = (asset) => {
  const href = `assets/${escape(asset.hash)}`;
  return asset.type.startsWith('image/')
    ? `<a class="asset" href="${href}" target="_blank" rel="noopener" title="${escape(asset.name)}"><img src="${href}" alt="${escape(asset.name)}" loading="lazy" /></a>`
    : `<a class="asset file" href="${href}" target="_blank" rel="noopener">${escape(asset.name)}</a>`;
};

const commentHtml = (comment, isPending = false) =>
  `<div class="comment${isPending ? ' pending' : ''}"><div class="comment-head">${authorHtml(comment.author ?? comment.by ?? '')}${whenHtml(comment.at)}` +
  `${isPending ? '<span class="chip pending-chip" title="Filed here; it joins the codebase when the inbox is next applied">pending</span>' : ''}</div>` +
  `${comment.note ? `<div class="doc">${docHtml(comment.note, '')}</div>` : ''}` +
  `${comment.assets?.length ? `<div class="assets">${comment.assets.map(assetHtml).join('')}</div>` : ''}</div>`;

/** Requests this page filed or found in the inbox that are not in the generated pages yet. */
const pendingFor = (match) => pending.filter(match).map((request) => ({ ...request, author: request.by }));

/** The form members write in; others see how to get there. `target` is `subject` or `task` with its value. */
const composerHtml = (target, value) => {
  if (!account.signIn) {
    return '';
  }
  if (!account.login) {
    return `<p class="composer-note muted"><a href="${escape(signInHref())}">Sign in with GitHub</a> to comment.</p>`;
  }
  if (!account.member) {
    return `<p class="composer-note muted">Only members of the ${escape(account.org)} GitHub organization can comment.</p>`;
  }
  return (
    `<form class="composer" data-${target}="${escape(value)}">` +
    `<textarea name="note" rows="2" placeholder="Comment. Paste or drop an image to attach it." aria-label="Comment"></textarea>` +
    `<div class="attachments"></div><footer>` +
    `<label class="attach-button">Attach image<input type="file" accept="${ASSET_TYPES.join(',')}" multiple hidden /></label>` +
    `<span class="muted hint">⌘↵ sends</span><button type="submit" class="primary-button">Comment</button></footer></form>`
  );
};

/** A thread: saved comments, then pending ones, then the composer. */
const threadSection = (saved, waiting, composer) => {
  const count = saved.length + waiting.length;
  if (count === 0 && !composer) {
    return '';
  }
  return section(
    'Comments',
    count,
    saved.map((comment) => commentHtml(comment)).join('') +
      waiting.map((comment) => commentHtml(comment, true)).join('') +
      composer,
  );
};

const subjectThread = (subject) =>
  threadSection(
    comments[subject] ?? [],
    pendingFor((request) => request.kind === 'comment' && request.subject === subject),
    composerHtml('subject', subject),
  );

const taskThread = (task) =>
  threadSection(
    task.comments,
    pendingFor((request) => request.kind === 'task-comment' && request.task === task.id),
    composerHtml('task', task.id),
  );

/** Uploads one file to the asset store; the worker names it by its SHA-256. */
const upload = async (file) => {
  if (!ASSET_TYPES.includes(file.type)) {
    throw new Error(`${file.name}: attach a PNG, JPEG, GIF, WebP image or a PDF`);
  }
  const response = await fetch('api/asset', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': file.type, 'x-file-name': encodeURIComponent(file.name || 'pasted.png'), 'x-deus': '1' },
    body: file,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `upload failed (${response.status})`);
  }
  return body;
};

const post = async (path, body) => {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', 'x-deus': '1' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error ?? `request failed (${response.status})`);
  }
  return result;
};

/** What each form has uploaded, in order. */
const attached = new WeakMap();

const attach = async (form, files) => {
  const list = form.querySelector('.attachments');
  for (const file of files) {
    const chip = document.createElement('span');
    chip.className = 'attachment uploading';
    chip.textContent = file.name || 'image';
    list.append(chip);
    try {
      const asset = await upload(file);
      attached.set(form, [...(attached.get(form) ?? []), asset]);
      chip.className = 'attachment';
      chip.dataset.hash = asset.hash;
      chip.innerHTML =
        (asset.type.startsWith('image/') ? `<img src="${URL.createObjectURL(file)}" alt="" />` : '') +
        `<span>${escape(asset.name)}</span><button type="button" class="icon-button" data-detach="${escape(asset.hash)}" aria-label="Remove">✕</button>`;
    } catch (error) {
      chip.remove();
      notify(error.message);
    }
  }
};

/** Re-renders the cards a new pending request shows up in. */
const refreshCards = () => {
  for (const [key, node] of cardElements) {
    node.remove();
    cardElements.delete(key);
  }
  return render();
};

const submit = async (form) => {
  const button = form.querySelector('[type=submit]');
  const assets = attached.get(form) ?? [];
  if (form.querySelector('.attachment.uploading')) {
    notify('Wait for the images to upload');
    return;
  }
  button.disabled = true;
  try {
    if (form.id === 'task-form') {
      const entry = await post('api/task', {
        title: form.title.value,
        details: form.details.value,
        link: form.link.value.trim(),
        labels: form.dataset.labels ?? '',
        assets,
      });
      pending.push(entry);
      closeOverlays();
      form.reset();
      delete form.dataset.labels;
      form.querySelector('.attachments').innerHTML = '';
      attached.delete(form);
      notify('Filed. The task joins the codebase when the inbox is next applied.');
      if (ui.view === 'tasks') {
        renderTasks();
      }
      return;
    }
    const note = form.note.value;
    const entry = form.dataset.task
      ? await post('api/task-comment', { task: form.dataset.task, note, assets })
      : await post('api/comment', { subject: form.dataset.subject, note, assets });
    pending.push(entry);
    const key = form.closest('.card')?.dataset.key;
    await refreshCards();
    if (key) {
      setFocus(key, false);
    }
  } catch (error) {
    notify(error.message);
  } finally {
    button.disabled = false;
  }
};

const openTaskForm = ({ report = false } = {}) => {
  if (!canWrite()) {
    return;
  }
  const form = element('task-form');
  if (report) {
    form.dataset.labels = 'explorer,report';
  } else if (form.dataset.labels) {
    delete form.dataset.labels;
  }
  form.querySelector('h2').textContent = report ? 'Report' : 'New task';
  const focused = ui.focus?.startsWith('d:') ? index.byHash.get(ui.focus.slice(2))?.name : undefined;
  if (focused && !element('task-link').value) {
    element('task-link').value = focused;
  }
  element('task-dialog').hidden = false;
  element('task-title').focus();
};

/** `m`: the focused card's comment box. */
const focusComposer = () => {
  const node = ui.focus && cardElements.get(ui.focus);
  const box = node?.querySelector('.composer textarea');
  if (box) {
    node.classList.remove('folded');
    box.focus();
  }
};

const onWriteEvents = () => {
  document.addEventListener('submit', (event) => {
    if (event.target.matches('.composer, #task-form')) {
      event.preventDefault();
      void submit(event.target);
    }
  });
  document.addEventListener('change', (event) => {
    if (event.target.matches('.attach-button input[type=file]')) {
      void attach(event.target.closest('form'), [...event.target.files]);
      event.target.value = '';
    }
  });
  document.addEventListener('paste', (event) => {
    const form = event.target.closest?.('.composer, #task-form');
    const files = [...(event.clipboardData?.files ?? [])];
    if (form && files.length > 0) {
      event.preventDefault();
      void attach(form, files);
    }
  });
  document.addEventListener('dragover', (event) => {
    if (event.target.closest?.('.composer, #task-form')) {
      event.preventDefault();
    }
  });
  document.addEventListener('drop', (event) => {
    const form = event.target.closest?.('.composer, #task-form');
    if (form && event.dataTransfer?.files.length) {
      event.preventDefault();
      void attach(form, [...event.dataTransfer.files]);
    }
  });
  document.addEventListener('keydown', (event) => {
    const form = event.target.closest?.('.composer, #task-form');
    if (form && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit(form);
    }
  });
  document.addEventListener('click', (event) => {
    const detach = event.target.closest('[data-detach]');
    if (detach) {
      const form = detach.closest('form');
      attached.set(
        form,
        (attached.get(form) ?? []).filter((asset) => asset.hash !== detach.dataset.detach),
      );
      detach.closest('.attachment').remove();
    } else if (event.target.closest('[data-dismiss]')) {
      closeOverlays();
    }
  });
  element('new-task').addEventListener('click', () => openTaskForm());
  element('report').addEventListener('click', () => void report());
  element('tasks-view').addEventListener('click', (event) => event.target.closest('[data-new-task]') && openTaskForm());
};

//
// Workspace state: the open cards are the URL fragment; the focused card and folds are local.
//

const ui = { focus: undefined, folded: new Set(), view: 'code', expanded: new Set(), dialect: 'deus' };

/** The dialect sources are shown in (D70): DEUS, or TypeScript-like where a page has it; kept per viewer. */
const DIALECT_KEY = 'deus.dialect';

try {
  ui.dialect = localStorage.getItem(DIALECT_KEY) === 'ts' ? 'ts' : 'deus';
} catch {}

const parseFragment = () => {
  const keys = decodeURIComponent(location.hash.slice(1))
    .split(',')
    .filter((key) => /^[dtcnvk]:./.test(key));
  const view = keys.find((key) => key.startsWith('v:'))?.slice(2) ?? 'code';
  return { view, keys: keys.filter((key) => !key.startsWith('v:')) };
};

const writeFragment = (view, keys) => {
  const next = [...(view === 'code' ? [] : [`v:${view}`]), ...keys].join(',');
  if (decodeURIComponent(location.hash.slice(1)) !== next) {
    location.hash = next;
  } else {
    void render();
  }
};

/** Opens a card after the focused one (or focuses it if already open), and shows the workspace. */
const open = (key) => {
  const { keys } = parseFragment();
  const anchor = keys.indexOf(ui.focus);
  ui.focus = key;
  writeFragment(
    ui.view === 'graph' ? 'graph' : 'code',
    keys.includes(key) ? keys : [...keys.slice(0, anchor + 1), key, ...keys.slice(anchor + 1)],
  );
};

const close = (key) => {
  const { view, keys } = parseFragment();
  const at = keys.indexOf(key);
  const rest = keys.filter((other) => other !== key);
  if (ui.focus === key) {
    ui.focus = rest[Math.min(at, rest.length - 1)];
  }
  writeFragment(view, rest);
};

const setView = (view) => writeFragment(view, parseFragment().keys);

//
// Rendering helpers.
//

const icon = (kind) =>
  `<span class="icon k-${escape(kind)}" title="${escape(KINDS[kind]?.label ?? kind)}">${escape(KINDS[kind]?.icon ?? '·')}</span>`;

const folderIcon = '<span class="icon k-namespace" title="namespace">▤</span>';

const statusMark = (status) =>
  status === 'pass'
    ? '<span class="status pass" title="passes">●</span>'
    : status === 'fail'
      ? '<span class="status fail" title="fails">●</span>'
      : '';

const defLink = (name, hash, label = name) =>
  `<a class="ref" data-open="d:${escape(hash)}" data-hash="${escape(hash)}">${escape(label)}</a>`;

const taskLink = (task) => `<a class="task-link" data-open="t:${escape(task.id)}">${escape(task.title)}</a>`;

const changeLink = (causal, label = short(causal)) =>
  `<a class="hash" data-open="c:${escape(causal)}">${escape(label)}</a>`;

/** A type, with its type names linked: `Text -> {IO} List Int`. */
const typeHtml = (text, namespace) =>
  escape(text).replace(/\b([A-Z][\w]*(?:\.[A-Za-z_][\w?]*)*)/g, (word) => {
    const entry = resolve(word, namespace);
    return entry
      ? `<a class="ref ty" data-open="d:${escape(entry.hash)}" data-hash="${escape(entry.hash)}">${word}</a>`
      : `<span class="ty">${word}</span>`;
  });

/** `name : type`, highlighted. */
const signatureHtml = (sig, namespace) => {
  const at = sig.indexOf(' : ');
  return at < 0
    ? typeHtml(sig, namespace)
    : `<span class="sig-name">${escape(sig.slice(0, at))}</span> : ${typeHtml(sig.slice(at + 3), namespace)}`;
};

/** The type part of a `name : type` signature. */
const typeOf = (sig) => (sig.includes(' : ') ? sig.slice(sig.indexOf(' : ') + 3) : sig);

/** Inline doc markup: `code` spans, linked when they name a definition. */
const inlineDoc = (text, namespace) =>
  escape(text).replace(/`([^`]+)`/g, (_, code) => {
    const entry = /^[\w.?]+$/.test(code) ? resolve(code, namespace) : undefined;
    return entry ? `<code>${defLink(entry.name, entry.hash, code)}</code>` : `<code>${code}</code>`;
  });

/** A doc comment as HTML: paragraphs, bullet lists and indented code blocks. */
const docHtml = (doc, namespace) => {
  const lines = doc.replace(/\s+$/, '').split('\n');
  const indents = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => line.length - line.trimStart().length);
  const strip = indents.length > 0 ? Math.min(...indents) : 0;
  const text = [lines[0].trim(), ...lines.slice(1).map((line) => line.slice(strip))].join('\n').trim();
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const blockLines = block.split('\n');
      if (blockLines.every((line) => /^\s{2,}\S|^\s*$/.test(line))) {
        const pad = Math.min(
          ...blockLines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length),
        );
        return `<pre class="doc-code">${escape(blockLines.map((line) => line.slice(pad)).join('\n'))}</pre>`;
      }
      if (blockLines.every((line) => /^\s*[-*] /.test(line) || /^\s{2,}/.test(line))) {
        const items = [];
        for (const line of blockLines) {
          if (/^\s*[-*] /.test(line)) {
            items.push(line.replace(/^\s*[-*] /, ''));
          } else {
            items[items.length - 1] += ` ${line.trim()}`;
          }
        }
        return `<ul>${items.map((item) => `<li>${inlineDoc(item, namespace)}</li>`).join('')}</ul>`;
      }
      return `<p>${inlineDoc(blockLines.map((line) => line.trim()).join(' '), namespace)}</p>`;
    })
    .join('');
};

/** A row in a listing: icon, linked name, signature and summary. */
const entryRow = (entry, label = entry.name) =>
  `<li class="entry-row">${icon(entry.kind)}${defLink(entry.name, entry.hash, label)}${statusMark(entry.status)}` +
  (entry.sig ? `<code class="row-sig">${typeHtml(typeOf(entry.sig), namespaceOf(entry.name))}</code>` : '') +
  (entry.summary ? `<span class="row-summary">${inlineDoc(entry.summary, namespaceOf(entry.name))}</span>` : '') +
  '</li>';

/** A ref (`{name, hash}`) as a row, enriched from the name index. */
const refRow = (ref) => {
  const entry = index.byHash.get(ref.hash);
  return entry
    ? entryRow({ ...entry, name: ref.name })
    : `<li class="entry-row"><span class="icon">·</span>${defLink(ref.name, ref.hash)}</li>`;
};

/** A list that shows the first rows and expands to all of them. */
const rowList = (rows, empty = 'None.') =>
  rows.length === 0
    ? `<p class="muted">${empty}</p>`
    : `<ul class="rows">${rows.slice(0, LIST_LIMIT).join('')}</ul>` +
      (rows.length > LIST_LIMIT
        ? `<ul class="rows more" hidden>${rows.slice(LIST_LIMIT).join('')}</ul><button class="link-button" data-more>Show ${rows.length - LIST_LIMIT} more</button>`
        : '');

const section = (title, count, body, openByDefault = true) =>
  `<details class="section"${openByDefault ? ' open' : ''}><summary><h3>${title}${count === undefined ? '' : ` <span class="count">${count}</span>`}</h3></summary>${body}</details>`;

/** Namespace path as links: `Codebase` › `Tasks` › name. */
const breadcrumbs = (name, isNamespace) => {
  const parts = name.split('.');
  const crumbs = parts.slice(0, isNamespace ? parts.length : -1).map((part, i) => {
    const path = parts.slice(0, i + 1).join('.');
    return i === parts.length - 1
      ? `<span class="crumb-last">${escape(part)}</span>`
      : `<a class="crumb" data-open="n:${escape(path)}">${escape(part)}</a>`;
  });
  if (!isNamespace) {
    crumbs.push(`<span class="crumb-last">${escape(parts[parts.length - 1])}</span>`);
  }
  return crumbs.join('<span class="crumb-dot">.</span>');
};

const card = (key, { iconHtml, title, meta = '', body, tag = '', prose = false, actions = '' }) =>
  `<article class="card${ui.folded.has(key) ? ' folded' : ''}" data-key="${escape(key)}" tabindex="-1">` +
  `<header>${iconHtml}<h2${prose ? ' class="prose"' : ''}>${title}</h2>${tag}<span class="card-meta">${meta}</span>${actions}` +
  `<button class="icon-button" data-fold="${escape(key)}" title="Fold (c)" aria-label="Fold">▾</button>` +
  `<button class="icon-button" data-close="${escape(key)}" title="Close (x)" aria-label="Close">✕</button></header>` +
  `<div class="content">${body}</div></article>`;

const hashChip = (hash) =>
  `<button class="hash-chip" data-copy="${escape(hash)}" title="Copy the full hash">${escape(short(hash))}</button>`;

//
// Events (D104): what the analytics store recorded about definitions and changes, from `events.json`.
//

/** `events.json`, fetched only when `meta.json` counts events. */
const loadEvents = () => (index.meta.events > 0 ? load('events.json') : Promise.resolve(undefined));

/** A row's time: `recorded_at` is microseconds since the epoch, as decimal text. */
const eventTime = (at) => {
  const date = new Date(Number(String(at).slice(0, -3)));
  return Number.isNaN(date.getTime())
    ? ''
    : `<time datetime="${escape(date.toISOString())}" title="${escape(date.toLocaleString())}">${escape(date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</time>`;
};

/** A `CodeRef` value as a link: pinned `<project>/<name>#<hash>`, a name IRI, or `#<hash>` (a change's may be a 10-digit prefix). */
const codeRefHtml = (ref) => {
  const text = String(ref);
  const at = text.lastIndexOf('#');
  const fragment = at >= 0 ? text.slice(at + 1) : '';
  const name = at >= 0 ? text.slice(0, at) : text;
  const tail = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name;
  const isHex = /^[0-9a-f]+$/.test(fragment);
  const hash = fragment && !isHex ? `#${fragment}` : fragment;
  const entry =
    (hash && index.byHash.get(hash)) ||
    (isHex && fragment.length >= 8 && fragment.length < 64
      ? index.names.find((other) => other.hash.startsWith(fragment))
      : undefined) ||
    (!fragment && tail ? index.byName.get(tail) : undefined);
  if (entry) {
    return defLink(entry.name, entry.hash);
  }
  const change = isHex && index.meta.history.find((node) => node.causal.startsWith(fragment));
  if (change) {
    return changeLink(change.causal, escape(change.message || short(change.causal)));
  }
  return `<code title="${escape(text)}">${escape(tail || text)}</code>`;
};

const cellHtml = (value, type) => {
  if (value === undefined || value === null || value === '') {
    return '<span class="muted">·</span>';
  }
  if (type === 'ref') {
    return codeRefHtml(value);
  }
  if (type === 'bool') {
    return value === true || value === 'true'
      ? '<span class="status pass">✓</span>'
      : '<span class="status fail">✗</span>';
  }
  const text = String(value);
  return type === 'int'
    ? `<span class="num">${escape(text)}</span>`
    : `<span class="cell-text" title="${escape(text)}">${escape(text)}</span>`;
};

const eventTable = (type) =>
  type.latest.length === 0
    ? '<p class="muted">No events yet.</p>'
    : `<div class="table-wrap"><table class="event-table"><thead><tr><th>When</th><th>By</th>${type.columns.map((column) => `<th>${escape(column.name)}</th>`).join('')}</tr></thead><tbody>` +
      type.latest
        .map(
          (row) =>
            `<tr><td>${eventTime(row.recorded_at)}</td><td>${escape(row.recorded_by)}</td>${type.columns.map((column) => `<td>${cellHtml(row[column.name], column.type)}</td>`).join('')}</tr>`,
        )
        .join('') +
      '</tbody></table></div>' +
      (type.count > type.latest.length
        ? `<p class="muted table-note">The latest ${type.latest.length} of ${type.count}.</p>`
        : '');

const eventsCard = (key, events) => {
  if (!events) {
    return missingCard(key, 'This site has no events');
  }
  const total = events.types.reduce((sum, type) => sum + type.count, 0);
  return card(key, {
    iconHtml: '<span class="icon k-event" title="events">◆</span>',
    title: 'Events',
    meta: `<span class="count">${total} in ${events.types.length} type${events.types.length === 1 ? '' : 's'}</span>`,
    body:
      '<p class="muted">What the analytics store recorded about this codebase: test runs, CI checks and changes. A definition or change lists its own count.</p>' +
      events.types
        .map((type) => {
          const entry = index.byName.get(type.name);
          const title = entry ? defLink(type.name, entry.hash) : escape(type.name);
          return section(
            `${title} <span class="muted event-split">${type.pushed} pushed · ${type.pending} pending</span>`,
            type.count,
            eventTable(type),
            type.count > 0,
          );
        })
        .join(''),
  });
};

/** The tallies for a definition or change hash, adding those filed under a prefix of it. */
const tallyFor = (events, hash) => {
  const tallies = new Map();
  for (const [key, entry] of Object.entries(events?.byDefinition ?? {})) {
    if (key === hash || (key.length >= 8 && key.length < hash.length && hash.startsWith(key))) {
      for (const tally of entry.events) {
        const id = `${tally.type} ${tally.column}`;
        tallies.set(id, { ...tally, count: (tallies.get(id)?.count ?? 0) + tally.count });
      }
    }
  }
  return [...tallies.values()];
};

const eventsSection = (events, hash) => {
  const tallies = tallyFor(events, hash);
  return tallies.length === 0
    ? ''
    : section(
        'Events',
        tallies.reduce((sum, tally) => sum + tally.count, 0),
        `<ul class="rows">${tallies
          .map(
            (tally) =>
              `<li class="entry-row"><span class="icon k-event">◆</span><a data-open="k:events">${escape(tally.type)}</a><span class="muted">as ${escape(tally.column)}</span><span class="count">${tally.count}</span></li>`,
          )
          .join('')}</ul>`,
      );
};

//
// Features (D118): each feature map as a tree, from `features.json`.
//

/** `features.json`, fetched only when `meta.json` counts features. */
const loadFeatures = () => (index.meta.features > 0 ? load('features.json') : Promise.resolve(undefined));

/** A feature status as a badge, coloured as the task state it corresponds to. */
const featureStatus = (status) => `<span class="state feature-${escape(status)}">${escape(status)}</span>`;

/** A spec document links to its namespace when the site has one; a definition to its page; a task to its card. */
const featureLinks = (feature) => {
  const specs = feature.specs.map((doc) =>
    index.names.some((entry) => entry.name.startsWith(`${doc}.`))
      ? `<a class="ref" data-open="n:${escape(doc)}">${escape(doc)}</a>`
      : `<code>${escape(doc)}</code>`,
  );
  const defs = feature.defs.map((name) => {
    const entry = index.byName.get(name);
    return entry ? defLink(name, entry.hash) : `<code>${escape(name)}</code>`;
  });
  const tasks = feature.tasks.map((id) => {
    const task = index.tasks.find((other) => other.id === id);
    const open = feature.openTasks.includes(id);
    return task
      ? `<a class="task-link${open ? '' : ' closed'}" data-open="t:${escape(id)}" title="${escape(task.title)} (${escape(task.state)})">${escape(task.title)}</a>`
      : `<code>${escape(id)}</code>`;
  });
  return [
    ['Specs', specs],
    ['Definitions', defs],
    ['Tasks', tasks],
  ]
    .filter(([, links]) => links.length > 0)
    .map(
      ([label, links]) =>
        `<div class="feature-links${label === 'Tasks' ? ' tasks' : ''}"><span class="feature-label">${label}</span>${links.join('')}</div>`,
    )
    .join('');
};

const featureRow = (feature) => {
  const open = feature.openTasks.length;
  const warnings = feature.problems.filter((problem) => !problem.startsWith('gap: '));
  const gaps = feature.problems.filter((problem) => problem.startsWith('gap: '));
  return (
    `<li class="feature${feature.depth > 0 ? ' child' : ''}" style="--depth: ${Math.min(feature.depth, 4)}">` +
    `<div class="feature-head">${featureStatus(feature.status)}<span class="feature-id">${escape(feature.id)}</span>` +
    `<span class="feature-title">${escape(feature.title)}</span>` +
    (feature.tasks.length > 0
      ? `<span class="count" title="${open} of ${feature.tasks.length} tasks open">${open}/${feature.tasks.length} open</span>`
      : '') +
    '</div>' +
    featureLinks(feature) +
    warnings.map((problem) => `<p class="feature-problem">⚠ ${escape(problem)}</p>`).join('') +
    gaps.map((problem) => `<p class="feature-gap">${escape(problem.slice('gap: '.length))}</p>`).join('') +
    '</li>'
  );
};

const featuresCard = (key, maps) => {
  if (!maps || maps.length === 0) {
    return missingCard(key, 'This site has no feature maps');
  }
  const all = maps.flatMap((map) => map.features);
  const shipped = all.filter((feature) => feature.status === 'shipped').length;
  const problems = all.filter((feature) => feature.problems.some((problem) => !problem.startsWith('gap: '))).length;
  return card(key, {
    iconHtml: '<span class="icon k-feature" title="features">◇</span>',
    title: 'Features',
    meta: `<span class="count">${shipped} of ${all.length} shipped</span>${problems > 0 ? ` <span class="count warn">${problems} with problems</span>` : ''}`,
    body:
      '<p class="muted">What the product is, feature by feature, from the feature maps in the codebase. Each feature links its specs, definitions and tasks.</p>' +
      maps
        .map((map) =>
          section(
            `<a class="ref" data-open="n:${escape(map.document)}">${escape(map.document)}</a>`,
            map.features.length,
            `<ul class="features">${map.features.map(featureRow).join('')}</ul>` +
              (map.notes.length > 0
                ? `<div class="feature-notes">${map.notes.map((note) => `<p class="feature-problem">⚠ ${escape(note)}</p>`).join('')}</div>`
                : ''),
          ),
        )
        .join(''),
  });
};

//
// Cards.
//

const verdictHtml = (def) => {
  if (!def.verdict) {
    return def.kind === 'test' || def.kind === 'theorem' ? '<p class="verdict none">Not checked yet.</p>' : '';
  }
  const pass = def.verdict.match(/^\(pass "([^"]*)"\s*(\d+)?\)/);
  if (pass) {
    const cases = pass[2] ? ` · ${pass[2]} case${pass[2] === '1' ? '' : 's'}` : '';
    return `<p class="verdict pass">✓ ${def.kind === 'theorem' ? 'Proved' : 'Passes'} <span class="muted">${escape(pass[1])}${cases}</span></p>`;
  }
  const fail = def.verdict.match(/^\(fail "((?:[^"\\]|\\.)*)"/);
  const reason = fail ? fail[1].replace(/\\(.)/g, (_, char) => (char === 'n' ? '\n' : char)) : def.verdict;
  return `<div class="verdict fail"><span>✗ ${def.kind === 'theorem' ? 'Not proved' : 'Fails'}</span><pre>${escape(reason)}</pre></div>`;
};

/** The source in the chosen dialect, without its leading doc comment, which the card renders as prose above it. */
const sourceHtml = (def) => {
  const html = ui.dialect === 'ts' && def.ts ? def.ts : def.html;
  return def.doc ? html.replace(/^<span class=cm>(?:\/--[\s\S]*?-\/|\/\*\*[\s\S]*?\*\/)<\/span>\n?/, '') : html;
};

const definitionCard = (key, def, events) => {
  const namespace = namespaceOf(def.name);
  const entry = index.byHash.get(def.hash);
  const kindTag = `<span class="tag">${escape(KINDS[def.kind]?.label ?? def.kind)}</span>`;
  return card(key, {
    iconHtml: icon(def.kind),
    title: breadcrumbs(def.name, false),
    tag: kindTag,
    meta: hashChip(def.hash),
    actions: consoleButton(def),
    body:
      (def.doc ? `<div class="doc">${docHtml(def.doc, namespace)}</div>` : '') +
      verdictHtml(def) +
      `<pre class="source" data-namespace="${escape(namespace)}" data-self="${escape(def.hash)}">${sourceHtml(def)}</pre>` +
      (def.signature && def.kind !== 'type' && def.kind !== 'ability'
        ? `<p class="inferred"><span class="label">Inferred type</span><code>${signatureHtml(def.signature, namespace)}</code></p>`
        : '') +
      (nodeAt(def.name)?.children.size > 0
        ? `<p class="aliases"><span class="label">Namespace</span><a data-open="n:${escape(def.name)}">${folderIcon} ${escape(def.name)}.*</a> <span class="count">${nodeAt(def.name).count} definitions</span></p>`
        : '') +
      (def.aliases.length > 0
        ? `<p class="aliases"><span class="label">Also named</span> ${def.aliases.map((alias) => `<code>${escape(alias)}</code>`).join(' ')}</p>`
        : '') +
      (def.tasks.length > 0
        ? section(
            'Tasks',
            def.tasks.length,
            `<ul class="rows">${def.tasks.map((task) => `<li class="entry-row">${stateChip(task.state)}${taskLink(task)}</li>`).join('')}</ul>`,
          )
        : '') +
      subjectThread(`def:${def.name}`) +
      eventsSection(events, def.hash) +
      `<div class="relations">${section('Depends on', def.deps.length, rowList(def.deps.map(refRow), 'Nothing in this codebase.'), def.deps.length <= LIST_LIMIT)}` +
      `${section('Used by', def.users.length, rowList(def.users.map(refRow), 'Nothing yet.'), def.users.length <= LIST_LIMIT)}</div>` +
      (entry ? '' : '<p class="muted">This hash no longer has a name on this branch.</p>'),
  });
};

const namespaceCard = (key, path) => {
  const node = nodeAt(path);
  if (!node) {
    return missingCard(key, `No namespace ${path}`);
  }
  const children = sortedChildren(node);
  const namespaces = children.filter((child) => child.children.size > 0);
  const leaves = children.filter((child) => child.entry);
  const groups = KIND_ORDER.map((kind) => [kind, leaves.filter((child) => child.entry.kind === kind)]).filter(
    ([, group]) => group.length > 0,
  );
  const self = node.entry;
  return card(key, {
    iconHtml: folderIcon,
    title: breadcrumbs(path, true),
    tag: '<span class="tag">namespace</span>',
    meta: `<span class="muted">${node.count} definitions</span>`,
    body:
      (self
        ? `<p class="self">${icon(self.kind)}<span><code>${escape(path)}</code> is also a ${escape(self.kind)}:</span> ${defLink(self.name, self.hash, 'open it')}</p>`
        : '') +
      (namespaces.length > 0
        ? section(
            'Namespaces',
            namespaces.length,
            `<ul class="namespace-grid">${namespaces
              .map(
                (child) =>
                  `<li><a data-open="n:${escape(child.path)}">${folderIcon}<span>${escape(child.segment)}</span><span class="count">${child.count}</span></a></li>`,
              )
              .join('')}</ul>`,
          )
        : '') +
      groups
        .map(([kind, group]) =>
          section(
            KINDS[kind].plural,
            group.length,
            `<ul class="rows">${group.map((child) => entryRow(child.entry, child.segment)).join('')}</ul>`,
          ),
        )
        .join(''),
  });
};

const stateChip = (state) => `<span class="state ${escape(state)}">${escape(state)}</span>`;

const priorityChip = (priority) =>
  priority > 0 ? `<span class="priority p${priority}">${escape(PRIORITIES[priority])}</span>` : '';

const changeRows = (changes) =>
  changes.length === 0
    ? '<p class="muted">None.</p>'
    : `<ul class="rows">${changes
        .map((change) =>
          change.imported
            ? `<li class="entry-row"><span class="hash">${escape(short(change.causal))}</span><span class="change-message">${escape(change.message)}</span>${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}${atHtml(change.at)}</li>`
            : `<li class="entry-row">${changeLink(change.causal)}<a class="change-message" data-open="c:${escape(change.causal)}">${escape(change.message)}</a>${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}${atHtml(change.at)}</li>`,
        )
        .join('')}</ul>`;

/** Every definition of one kind, or every check (`k:checks`, failing first): what an overview tile opens. */
const kindCard = (key, kind) => {
  const isChecks = kind === 'checks';
  if (!isChecks && !KINDS[kind]) {
    return missingCard(key, `No kind ${kind}`);
  }
  const rank = { fail: 0, pass: 2 };
  const entries = index.names
    .filter((entry) => (isChecks ? Boolean(entry.status) : entry.kind === kind))
    .sort((a, b) => (isChecks ? (rank[a.status] ?? 1) - (rank[b.status] ?? 1) : 0) || a.name.localeCompare(b.name));
  const failing = entries.filter((entry) => entry.status === 'fail').length;
  return card(key, {
    iconHtml: isChecks
      ? `<span class="icon ${failing > 0 ? 'k-fail' : 'k-test'}">${failing > 0 ? '✗' : '✓'}</span>`
      : icon(kind),
    title: isChecks ? 'Checks' : escape(KINDS[kind].plural),
    meta: `<span class="count">${isChecks ? `${entries.length - failing} of ${entries.length} pass` : entries.length}</span>`,
    body: rowList(entries.map((entry) => entryRow(entry))),
  });
};

const taskCard = (key, task) => {
  const parent = index.tasks.find((other) => other.id === task.parent);
  const children = index.tasks.filter((other) => other.parent === task.id);
  const links = task.links.map((link) => {
    if (link.change) {
      return `<li class="entry-row">${changeLink(link.change)}<span>${escape(link.message)}</span></li>`;
    }
    const entry = index.byHash.get(link.current ?? '');
    const note =
      link.current === null
        ? '<span class="muted">no longer named</span>'
        : link.current !== link.hash
          ? `<span class="muted">changed since linked (was ${escape(short(link.hash))})</span>`
          : '';
    return `<li class="entry-row">${icon(entry?.kind ?? 'term')}${link.current === null ? `<code>${escape(link.definition)}</code>` : defLink(link.definition, link.current)}${note}</li>`;
  });
  return card(key, {
    iconHtml: '<span class="icon k-task" title="task">◎</span>',
    title: escape(task.title),
    prose: true,
    tag: stateChip(task.state),
    meta: `<span class="muted">${escape(task.id)}</span>`,
    body:
      `<p class="chips">${priorityChip(task.priority)}${task.assignee ? `<span class="chip">@${escape(task.assignee)}</span>` : ''}${task.labels
        .map((label) => `<span class="chip">${escape(label)}</span>`)
        .join('')}${parent ? `<span class="muted">subtask of</span> ${taskLink(parent)}` : ''}</p>` +
      (task.details ? `<div class="doc">${docHtml(task.details, '')}</div>` : '') +
      section(
        'Linked',
        links.length,
        links.length > 0 ? `<ul class="rows">${links.join('')}</ul>` : '<p class="muted">Nothing linked.</p>',
      ) +
      (children.length > 0
        ? section(
            'Subtasks',
            children.length,
            `<ul class="rows">${children.map((child) => `<li class="entry-row">${stateChip(child.state)}${taskLink(child)}</li>`).join('')}</ul>`,
          )
        : '') +
      taskThread(task) +
      section('History', task.history.length, changeRows(task.history), task.history.length <= 8),
  });
};

/** A change names definitions by the hashes they had then; pages exist for the current ones. */
const changeCard = (key, change, events) => {
  const current = (name, hash) => index.byName.get(name)?.hash ?? hash;
  const added = change.added.map((ref) => refRow({ name: ref.name, hash: current(ref.name, ref.hash) }));
  // A dependent rehashed by `deus update` prints the same as before; edited names come first, with their diffs.
  const edited = change.changed.filter((entry) => entry.before !== undefined && entry.before !== entry.after);
  const changed = [...edited, ...change.changed.filter((entry) => !edited.includes(entry))].map((entry) => {
    const now = index.byName.get(entry.name);
    const row =
      `${icon(now?.kind ?? 'term')}${defLink(entry.name, current(entry.name, entry.hash))}` +
      `<span class="hash">${escape(short(entry.from))} → ${escape(short(entry.hash))}</span>${now && now.hash !== entry.hash ? '<span class="muted">changed again since</span>' : ''}`;
    if (entry.before === undefined) {
      return `<li class="entry-row">${row}</li>`;
    }
    if (entry.before === entry.after) {
      return `<li class="entry-row">${row}<span class="muted rehashed">rehashed: a dependency changed</span></li>`;
    }
    return `<li><details class="diff"${edited.length <= 6 ? ' open' : ''}><summary class="entry-row">${row}${diffSummary(entry)}</summary>${diffHtml(entry.before, entry.after)}</details></li>`;
  });
  const removed = change.removed.map(
    (name) => `<li class="entry-row"><span class="icon">−</span><code>${escape(name)}</code></li>`,
  );
  const tasks = change.tasks
    .map((id) => index.tasks.find((task) => task.id === id))
    .filter(Boolean)
    .map((task) => `<li class="entry-row">${stateChip(task.state)}${taskLink(task)}</li>`);
  return card(key, {
    iconHtml: '<span class="icon k-change" title="change">●</span>',
    title: escape(change.message || '(no message)'),
    prose: true,
    tag: diffStat(change),
    meta: `${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}${atHtml(change.at)}${hashChip(change.causal)}`,
    body:
      (added.length > 0 ? section('Added', added.length, rowList(added)) : '') +
      (changed.length > 0 ? section('Changed', changed.length, rowList(changed)) : '') +
      (removed.length > 0 ? section('Removed', removed.length, rowList(removed)) : '') +
      (tasks.length > 0 ? section('Tasks', tasks.length, `<ul class="rows">${tasks.join('')}</ul>`) : '') +
      (added.length + changed.length + removed.length + tasks.length === 0
        ? '<p class="muted">No visible names or tasks changed.</p>'
        : '') +
      eventsSection(events, change.causal) +
      `<p class="parents"><span class="label">Parents</span> ${change.parents.map((parent) => changeLink(parent)).join(' ') || '<span class="muted">none: the first change</span>'}</p>` +
      subjectThread(`change:${change.causal}`),
  });
};

/** The longest common subsequence of lines, as `[' ' | '-' | '+', line]` pairs in order. */
const diffLines = (before, after) => {
  const rows = before.length;
  const cols = after.length;
  const table = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < rows || j < cols) {
    if (i < rows && j < cols && before[i] === after[j]) {
      out.push([' ', before[i++]]);
      j++;
    } else if (j >= cols || (i < rows && table[i + 1][j] >= table[i][j + 1])) {
      out.push(['-', before[i++]]);
    } else {
      out.push(['+', after[j++]]);
    }
  }
  return out;
};

const KEYWORDS = new Set([
  'def',
  'theorem',
  'test',
  'inductive',
  'structure',
  'ability',
  'namespace',
  'end',
  'match',
  'with',
  'fun',
  'let',
  'rec',
  'if',
  'then',
  'else',
  'handle',
  'return',
  'by',
  'where',
  'prim',
  'sorry',
]);

/** One line of source, highlighted as `Highlight.html` does on the generator's side. */
const highlightLine = (line) =>
  line.replace(
    /("(?:[^"\\]|\\.)*"?)|(--.*$|\/-.*$)|([A-Za-z_][\w.?]*)|([&<>])/g,
    (match, string, comment, word, special) => {
      if (string) {
        return `<span class=str>${escape(string)}</span>`;
      }
      if (comment) {
        return `<span class=cm>${escape(comment)}</span>`;
      }
      if (word) {
        return KEYWORDS.has(word)
          ? `<span class=kw>${word}</span>`
          : /^[A-Z]/.test(word)
            ? `<span class=ty>${word}</span>`
            : word;
      }
      return escape(special);
    },
  );

const diffLine = ([mark, line]) =>
  `<span class="line ${mark === '+' ? 'add' : mark === '-' ? 'del' : ''}"><span class="mark">${mark}</span>${highlightLine(line)}</span>`;

/** A unified diff that folds long unchanged runs to three lines of context on each side. */
const diffHtml = (before, after) => {
  const lines = diffLines(before.split('\n'), after.split('\n'));
  const out = [];
  for (let i = 0; i < lines.length;) {
    let end = i;
    while (end < lines.length && lines[end][0] === ' ') {
      end++;
    }
    const keepHead = i === 0 ? 0 : 3;
    const keepTail = end === lines.length ? 0 : 3;
    if (end - i > keepHead + keepTail + 2) {
      out.push(...lines.slice(i, i + keepHead).map(diffLine));
      const hidden = lines.slice(i + keepHead, end - keepTail);
      out.push(
        `<button class="fold" data-unfold>⋯ ${hidden.length} unchanged lines</button><span class="folded-lines" hidden>${hidden.map(diffLine).join('')}</span>`,
      );
      out.push(...lines.slice(end - keepTail, end).map(diffLine));
    } else {
      out.push(...lines.slice(i, end).map(diffLine));
    }
    if (end < lines.length) {
      out.push(diffLine(lines[end]));
      end++;
    }
    i = end;
  }
  return `<pre class="diff-view">${out.join('')}</pre>`;
};

const diffSummary = (entry) => {
  const lines = diffLines(entry.before.split('\n'), entry.after.split('\n'));
  const added = lines.filter(([mark]) => mark === '+').length;
  const removed = lines.filter(([mark]) => mark === '-').length;
  return `<span class="diffstat">${added > 0 ? `<span class="plus">+${added}</span>` : ''}${removed > 0 ? `<span class="minus">−${removed}</span>` : ''}</span>`;
};

const diffStat = (change) =>
  `<span class="diffstat">${change.added.length > 0 ? `<span class="plus">+${change.added.length}</span>` : ''}${
    change.changed.length > 0 ? `<span class="tilde">~${change.changed.length}</span>` : ''
  }${change.removed.length > 0 ? `<span class="minus">−${change.removed.length}</span>` : ''}</span>`;

const missingCard = (key, message) =>
  card(key, {
    iconHtml: '<span class="icon">?</span>',
    title: escape(message),
    body: '<p class="muted">The site has no page for it.</p>',
  });

const buildCard = async (key) => {
  const value = key.slice(2);
  switch (key[0]) {
    case 'd': {
      const [def, events] = await Promise.all([load(pagePath(value)), loadEvents()]);
      if (def?.ts !== undefined) {
        element('dialects').hidden = false;
      }
      return def ? definitionCard(key, def, events) : missingCard(key, `No definition ${short(value)}`);
    }
    case 'n':
      return namespaceCard(key, value);
    case 't': {
      const task = index.tasks.find((other) => other.id === value);
      return task ? taskCard(key, task) : missingCard(key, `No task ${value}`);
    }
    case 'c': {
      const [change, events] = await Promise.all([load(`change/${value}.json`), loadEvents()]);
      return change ? changeCard(key, change, events) : missingCard(key, `No change ${short(value)}`);
    }
    case 'k':
      return value === 'events'
        ? eventsCard(key, await loadEvents())
        : value === 'features'
          ? featuresCard(key, await loadFeatures())
          : kindCard(key, value);
    default:
      return missingCard(key, key);
  }
};

/** Links type names in the source that the generator left plain, resolving them as the definition would. */
const linkSource = (root) => {
  for (const pre of root.querySelectorAll('pre.source')) {
    const namespace = pre.dataset.namespace;
    for (const span of pre.querySelectorAll('span.ty')) {
      if (span.closest('a')) {
        continue;
      }
      const entry = resolve(span.textContent, namespace);
      if (entry && entry.hash !== pre.dataset.self) {
        const link = document.createElement('a');
        link.className = 'ref';
        link.dataset.open = `d:${entry.hash}`;
        link.dataset.hash = entry.hash;
        span.replaceWith(link);
        link.append(span);
      }
    }
    for (const link of pre.querySelectorAll('a.ref[data-open^="d:"]')) {
      link.dataset.hash = link.dataset.open.slice(2);
    }
  }
};

//
// Home, tasks and history views.
//

const homeHtml = () => {
  const meta = index.meta;
  const counts = KIND_ORDER.map((kind) => [kind, index.names.filter((entry) => entry.kind === kind).length]).filter(
    ([, count]) => count > 0,
  );
  const checked = index.names.filter((entry) => entry.status);
  const failing = checked.filter((entry) => entry.status === 'fail');
  const top = sortedChildren(index.tree);
  const namespaces = top.filter((node) => node.children.size > 0);
  const roots = top.filter((node) => node.entry && node.children.size === 0).map((node) => node.entry);
  const open = index.tasks.filter((task) => task.state === 'todo' || task.state === 'doing');
  return (
    '<article class="home">' +
    `<header class="home-header"><h1>${escape(meta.project)}</h1><p class="muted">Branch <span class="chip">${escape(meta.branch)}</span>${
      meta.branches.length > 1 ? ` of ${meta.branches.length}` : ''
    } · ${meta.definitions} definitions · <a data-view="tasks">${meta.tasks} tasks</a></p></header>` +
    `<ul class="stats">${counts.map(([kind, count]) => `<li><a data-open="k:${kind}" title="List every ${escape(KINDS[kind].label)}">${icon(kind)}<b>${count}</b><span>${escape(KINDS[kind].plural.toLowerCase())}</span></a></li>`).join('')}` +
    (checked.length > 0
      ? `<li><a data-open="k:checks" title="List every check, failing first"><span class="icon ${failing.length > 0 ? 'k-fail' : 'k-test'}">${failing.length > 0 ? '✗' : '✓'}</span><b>${checked.length - failing.length}/${checked.length}</b><span>checks pass</span></a></li>`
      : '') +
    (meta.features > 0
      ? `<li><a data-open="k:features" title="What the product is, feature by feature"><span class="icon k-feature">◇</span><b>${meta.features}</b><span>features</span></a></li>`
      : '') +
    (meta.events > 0
      ? `<li><a data-open="k:events" title="What the analytics store recorded"><span class="icon k-event">◆</span><b>${meta.events}</b><span>events</span></a></li>`
      : '') +
    `<li><a data-view="tasks" title="Open the task board"><span class="icon k-task">◎</span><b>${open.length}</b><span>open task${open.length === 1 ? '' : 's'}</span></a></li></ul>` +
    `<div class="home-columns"><div>${section('Recent changes', meta.history.length, changeRows(meta.history.slice(0, 6)))}<a class="more-link" data-view="history">All history →</a></div>` +
    `<div>${section(
      'Open tasks',
      open.length,
      open.length > 0
        ? `<ul class="rows">${open
            .slice(0, 6)
            .map(
              (task) =>
                `<li class="entry-row">${stateChip(task.state)}${taskLink(task)}${priorityChip(task.priority)}</li>`,
            )
            .join('')}</ul>`
        : '<p class="muted">None.</p>',
    )}<a class="more-link" data-view="tasks">Task board →</a></div></div>` +
    (failing.length > 0
      ? section(
          'Failing checks',
          failing.length,
          `<ul class="rows">${failing.map((entry) => entryRow(entry)).join('')}</ul>`,
        )
      : '') +
    section(
      'Namespaces',
      namespaces.length,
      `<ul class="namespace-grid">${namespaces
        .map(
          (node) =>
            `<li><a data-open="n:${escape(node.path)}">${folderIcon}<span>${escape(node.segment)}</span><span class="count">${node.count}</span></a></li>`,
        )
        .join('')}</ul>`,
    ) +
    section('Top-level definitions', roots.length, rowList(roots.map((entry) => entryRow(entry))), false) +
    '<p class="hint muted">Press <kbd>/</kbd> to find a definition by name or by type, or browse the namespaces on the left.</p>' +
    '</article>'
  );
};

const renderTasks = () => {
  const columns = STATES.map((state) => {
    const tasks = index.tasks.filter((task) => task.state === state);
    return (
      `<div class="column"><h3>${stateChip(state)}<span class="count">${tasks.length}</span></h3>` +
      tasks
        .map(
          (task) =>
            `<a class="task-card ${escape(state)}" data-open="t:${escape(task.id)}"><span class="task-title">${escape(task.title)}</span>` +
            `<span class="task-meta"><span class="muted">${escape(task.id)}</span>${priorityChip(task.priority)}${task.assignee ? `<span class="chip">@${escape(task.assignee)}</span>` : ''}${task.labels
              .map((label) => `<span class="chip">${escape(label)}</span>`)
              .join('')}</span></a>`,
        )
        .join('') +
      '</div>'
    );
  });
  const filed = pending.filter((request) => request.kind === 'task');
  const waiting =
    filed.length > 0
      ? `<section class="pending-tasks"><h3>Waiting for the inbox <span class="count">${filed.length}</span></h3>` +
        filed
          .map(
            (request) =>
              `<div class="task-card pending"><span class="task-title">${escape(request.title)}</span><span class="task-meta">${authorHtml(request.by)}<span class="chip pending-chip">pending</span></span></div>`,
          )
          .join('') +
        '</section>'
      : '';
  const action = canWrite() ? '<button class="primary-button" data-new-task>New task</button>' : '';
  element('tasks-view').innerHTML =
    `<div class="view-head"><h1 class="view-title">Tasks</h1>${action}</div>${waiting}<div class="board">${columns.join('')}</div>`;
};

const renderHistory = async () => {
  const history = index.meta.history;
  const view = element('history-view');
  view.innerHTML =
    `<h1 class="view-title">History <span class="muted">· ${escape(index.meta.branch)}</span></h1><ol class="timeline">` +
    history
      .map((change) =>
        change.imported
          ? `<li><span class="timeline-row imported" title="Imported from an export; this store has no record of its contents"><span class="dot"></span><span class="message">${escape(change.message || '(no message)')}</span>` +
            `${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}${atHtml(change.at)}<span class="chip">imported</span><span class="hash">${escape(short(change.causal))}</span></span></li>`
          : `<li><a class="timeline-row" data-open="c:${escape(change.causal)}"><span class="dot"></span><span class="message">${escape(change.message || '(no message)')}</span>` +
            `<span class="diffstat" data-stat="${escape(change.causal)}"></span>${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}${atHtml(change.at)}<span class="hash">${escape(short(change.causal))}</span></a></li>`,
      )
      .join('') +
    '</ol>' +
    (history.length >= 1000 ? '<p class="muted">The 1000 most recent changes.</p>' : '');
  await Promise.all(
    history
      .filter((change) => !change.imported)
      .map(async (change) => {
        const page = await load(`change/${change.causal}.json`);
        const slot = view.querySelector(`[data-stat="${CSS.escape(change.causal)}"]`);
        if (page && slot) {
          slot.outerHTML = diffStat(page);
        }
      }),
  );
};

//
// Namespace tree.
//

const treeRows = (node, depth) =>
  sortedChildren(node)
    .map((child) => {
      const pad = `style="--depth:${depth}"`;
      if (child.children.size > 0) {
        const expanded = ui.expanded.has(child.path);
        return (
          `<div class="tree-node" data-path="${escape(child.path)}"><div class="tree-row folder" ${pad}>` +
          `<button class="caret${expanded ? ' open' : ''}" data-toggle="${escape(child.path)}" aria-label="Expand">▸</button>` +
          (child.entry
            ? `<a data-open="d:${escape(child.entry.hash)}" data-hash="${escape(child.entry.hash)}" data-tree-key="d:${escape(child.entry.hash)}">${icon(child.entry.kind)}<span class="label">${escape(child.segment)}</span></a>`
            : `<a data-open="n:${escape(child.path)}" data-tree-key="n:${escape(child.path)}">${folderIcon}<span class="label">${escape(child.segment)}</span></a>`) +
          `<span class="count">${child.count}</span></div>` +
          `<div class="tree-children">${expanded ? treeRows(child, depth + 1) : ''}</div></div>`
        );
      }
      return (
        `<div class="tree-row leaf" ${pad}><a data-open="d:${escape(child.entry.hash)}" data-hash="${escape(child.entry.hash)}" data-tree-key="d:${escape(child.entry.hash)}">` +
        `${icon(child.entry.kind)}<span class="label">${escape(child.segment)}</span>${statusMark(child.entry.status)}</a></div>`
      );
    })
    .join('');

const renderTree = () => {
  element('tree').innerHTML = treeRows(index.tree, 0);
};

const toggleFolder = (path, expand) => {
  const node = element('tree').querySelector(`.tree-node[data-path="${CSS.escape(path)}"]`);
  if (!node) {
    return;
  }
  const isOpen = ui.expanded.has(path);
  const next = expand ?? !isOpen;
  if (next === isOpen) {
    return;
  }
  next ? ui.expanded.add(path) : ui.expanded.delete(path);
  node.querySelector(':scope > .tree-row .caret').classList.toggle('open', next);
  const depth = path.split('.').length;
  node.querySelector(':scope > .tree-children').innerHTML = next ? treeRows(nodeAt(path), depth) : '';
};

/** Expands the tree down to a card's name and marks its row. */
const reveal = (key) => {
  const tree = element('tree');
  for (const row of tree.querySelectorAll('.active')) {
    row.classList.remove('active');
  }
  if (!key) {
    return;
  }
  let name;
  if (key.startsWith('n:')) {
    name = key.slice(2);
  } else if (key.startsWith('d:')) {
    name = index.byHash.get(key.slice(2))?.name;
  }
  if (!name) {
    return;
  }
  const parts = name.split('.');
  const folders = key.startsWith('n:') ? parts.length - 1 : parts.length - 1;
  for (let i = 1; i <= folders; i++) {
    toggleFolder(parts.slice(0, i).join('.'), true);
  }
  const self = index.byName.get(name);
  const row =
    tree.querySelector(`[data-tree-key="${CSS.escape(key)}"]`) ??
    (key.startsWith('n:') && self ? tree.querySelector(`[data-tree-key="d:${CSS.escape(self.hash)}"]`) : null);
  if (row) {
    row.classList.add('active');
    row.scrollIntoView({ block: 'nearest' });
  }
};

//
// The workspace.
//

const cardElements = new Map();

const setFocus = (key, scroll = true) => {
  ui.focus = key;
  for (const [other, node] of cardElements) {
    node.classList.toggle('focused', other === key);
  }
  const node = key && cardElements.get(key);
  if (node && scroll) {
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  if (ui.view === 'graph') {
    drawGraph();
  }
  reveal(key);
};

let rendering = Promise.resolve();

const render = () => {
  rendering = rendering.then(renderNow, renderNow);
  return rendering;
};

const renderNow = async () => {
  const { view, keys } = parseFragment();
  ui.view = view;
  for (const link of document.querySelectorAll('#views [data-view]')) {
    link.classList.toggle('active', link.dataset.view === (view === 'graph' ? 'code' : view));
  }
  element('layouts').hidden = view !== 'code' && view !== 'graph';
  for (const button of document.querySelectorAll('#layouts [data-view]')) {
    button.classList.toggle('active', button.dataset.view === view);
  }
  element('workspace').hidden = view !== 'code';
  element('graph-view').hidden = view !== 'graph';
  element('tasks-view').hidden = view !== 'tasks';
  element('history-view').hidden = view !== 'history';
  if (view === 'tasks') {
    renderTasks();
  } else if (view === 'history') {
    void renderHistory();
  } else if (view === 'graph') {
    void renderGraph(keys);
  }

  const workspace = element('workspace');
  for (const [key, node] of cardElements) {
    if (!keys.includes(key)) {
      node.remove();
      cardElements.delete(key);
    }
  }
  const built = await Promise.all(keys.map(async (key) => [key, cardElements.get(key) ?? (await buildCard(key))]));
  workspace.querySelector('.home')?.remove();
  for (const [key, value] of built) {
    let node = value;
    if (typeof value === 'string') {
      const holder = document.createElement('div');
      holder.innerHTML = value;
      node = holder.firstElementChild;
      linkSource(node);
      cardElements.set(key, node);
    }
    workspace.append(node);
  }
  if (keys.length === 0) {
    workspace.innerHTML = homeHtml();
  }
  const focus = keys.includes(ui.focus) ? ui.focus : keys[0];
  setFocus(focus, view === 'code' && focus !== undefined);
  document.title = focus ? `${titleOf(focus)} · ${index.meta.project}` : index.meta.project;
};

const titleOf = (key) => {
  const value = key.slice(2);
  if (key.startsWith('d:')) {
    return index.byHash.get(value)?.name ?? short(value);
  }
  if (key.startsWith('t:')) {
    return index.tasks.find((task) => task.id === value)?.title ?? value;
  }
  if (key.startsWith('k:')) {
    return value === 'checks'
      ? 'Checks'
      : value === 'events'
        ? 'Events'
        : value === 'features'
          ? 'Features'
          : (KINDS[value]?.plural ?? value);
  }
  return key.startsWith('n:') ? value : short(value);
};

//
// The graph view: the open definitions as cards in a force-directed layout, with what they depend on and
// what uses them around them; an edge points from a user to its dependency.
//

const NEIGHBOR_LIMIT = 12;

const graph = {
  nodes: new Map(),
  edges: [],
  positions: new Map(),
  camera: { x: 0, y: 0, scale: 1 },
  moved: false,
  alpha: 0,
  frame: 0,
  shownKeys: '',
};

/** A stable angle per hash, so the same neighbourhood lays out the same way on every visit. */
const angleOf = (hash) => {
  let sum = 0;
  for (const char of hash) {
    sum = (sum * 31 + char.charCodeAt(0)) % 3600;
  }
  return (sum / 3600) * 2 * Math.PI;
};

/** The open definitions, their pages, and up to `NEIGHBOR_LIMIT` neighbours each, dependencies first. */
const graphData = async (keys) => {
  const centers = keys.filter((key) => key.startsWith('d:')).map((key) => key.slice(2));
  const pages = new Map();
  await Promise.all(centers.map(async (hash) => pages.set(hash, await load(pagePath(hash)))));
  const shown = new Map(
    centers.filter((hash) => pages.get(hash)).map((hash) => [hash, { open: true, near: hash, hidden: 0 }]),
  );
  for (const hash of centers.filter((center) => shown.has(center))) {
    const page = pages.get(hash);
    const fresh = [...new Set([...page.deps, ...page.users].map((ref) => ref.hash))].filter(
      (other) => !shown.has(other),
    );
    for (const other of fresh.slice(0, NEIGHBOR_LIMIT)) {
      shown.set(other, { open: false, near: hash, hidden: 0 });
    }
    shown.get(hash).hidden = Math.max(0, fresh.length - NEIGHBOR_LIMIT);
  }
  await Promise.all(
    [...shown.keys()]
      .filter((hash) => !pages.has(hash))
      .map(async (hash) => pages.set(hash, await load(pagePath(hash)))),
  );
  const edges = [];
  for (const hash of shown.keys()) {
    for (const dep of pages.get(hash)?.deps ?? []) {
      if (shown.has(dep.hash) && dep.hash !== hash) {
        edges.push([hash, dep.hash]);
      }
    }
  }
  return { centers, shown, edges, pages };
};

const graphNodeHtml = (hash, info, page) => {
  const entry = index.byHash.get(hash) ?? page ?? { name: short(hash), kind: 'term' };
  const name = entry.name;
  const namespace = namespaceOf(name);
  const sig = entry.sig ? typeOf(entry.sig) : page?.signature ? typeOf(page.signature) : '';
  const summary = entry.summary ?? '';
  return (
    `<div class="gnode${info.open ? ' open' : ''}" data-node="${escape(hash)}" title="${escape(info.open ? `${name}: show in the list` : `${name}: open`)}">` +
    `<div class="gnode-head">${icon(entry.kind)}<span class="gnode-name">${namespace ? `<span class="gnode-ns">${escape(namespace)}.</span>` : ''}${escape(lastSegment(name))}</span>${statusMark(entry.status)}</div>` +
    (sig ? `<code class="gnode-sig">${escape(sig)}</code>` : '') +
    (info.open && summary ? `<p class="gnode-summary">${inlineDoc(summary, namespace)}</p>` : '') +
    (info.hidden > 0 ? `<span class="gnode-more">+${info.hidden} more in the list</span>` : '') +
    '</div>'
  );
};

/** One step of the layout: nodes repel, edges pull to a rest length, overlapping cards push apart. */
const graphTick = () => {
  const nodes = [...graph.nodes.values()];
  const alpha = graph.alpha;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const push = (alpha * 60000) / (distance * distance);
      dx /= distance;
      dy /= distance;
      a.vx -= dx * push;
      a.vy -= dy * push;
      b.vx += dx * push;
      b.vy += dy * push;
      const overlapX = (a.width + b.width) / 2 + 24 - Math.abs(b.x - a.x);
      const overlapY = (a.height + b.height) / 2 + 18 - Math.abs(b.y - a.y);
      if (overlapX > 0 && overlapY > 0) {
        const sign = (value) => (value >= 0 ? 1 : -1);
        if (overlapX / (a.width + b.width) < overlapY / (a.height + b.height)) {
          a.x -= (sign(b.x - a.x) * overlapX) / 2;
          b.x += (sign(b.x - a.x) * overlapX) / 2;
        } else {
          a.y -= (sign(b.y - a.y) * overlapY) / 2;
          b.y += (sign(b.y - a.y) * overlapY) / 2;
        }
      }
    }
  }
  for (const [from, to] of graph.edges) {
    const a = graph.nodes.get(from);
    const b = graph.nodes.get(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const rest = (a.width + b.width) / 2 + 70;
    const pull = ((distance - rest) / distance) * alpha * 0.06;
    a.vx += dx * pull;
    a.vy += dy * pull;
    b.vx -= dx * pull;
    b.vy -= dy * pull;
  }
  for (const node of nodes) {
    const gravity = alpha * (node.open ? 0.02 : 0.006);
    node.vx -= node.x * gravity;
    node.vy -= node.y * gravity;
    if (!node.pinned) {
      node.x += node.vx;
      node.y += node.vy;
    }
    node.vx *= 0.6;
    node.vy *= 0.6;
  }
  graph.alpha *= 0.985;
};

/** Where the segment from `a`'s centre to `b`'s centre leaves `a`'s card. */
const rimPoint = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const scale = Math.min(a.width / 2 / Math.abs(dx || 1e-9), a.height / 2 / Math.abs(dy || 1e-9));
  return [a.x + dx * Math.min(scale, 1), a.y + dy * Math.min(scale, 1)];
};

const drawGraph = () => {
  const view = element('graph-view');
  const stage = view.querySelector('.graph-stage');
  if (!stage) {
    return;
  }
  const { x, y, scale } = graph.camera;
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  for (const node of graph.nodes.values()) {
    node.element.style.transform = `translate(${node.x - node.width / 2}px, ${node.y - node.height / 2}px)`;
    node.element.classList.toggle('focused', `d:${node.hash}` === ui.focus);
  }
  const focus = ui.focus?.slice(2);
  stage.querySelector('.graph-edges').innerHTML = graph.edges
    .map(([from, to]) => {
      const a = graph.nodes.get(from);
      const b = graph.nodes.get(to);
      const [x1, y1] = rimPoint(a, b);
      const [x2, y2] = rimPoint(b, a);
      const near = from === focus || to === focus;
      const main = a.open || b.open;
      return `<line class="${near ? 'near' : main ? 'main' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-end="url(#arrow${near ? '-near' : ''})"/>`;
    })
    .join('');
};

/** Centres the layout in the view, no larger than life; on a phone, around the focused card, still readable. */
const fitGraph = () => {
  const view = element('graph-view');
  const nodes = [...graph.nodes.values()];
  if (nodes.length === 0) {
    return;
  }
  const left = Math.min(...nodes.map((node) => node.x - node.width / 2));
  const right = Math.max(...nodes.map((node) => node.x + node.width / 2));
  const top = Math.min(...nodes.map((node) => node.y - node.height / 2));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height / 2));
  const fit = Math.min(1, (view.clientWidth - 32) / (right - left), (view.clientHeight - 80) / (bottom - top));
  const scale = Math.max(fit, 0.6);
  const focus = scale > fit ? (graph.nodes.get(ui.focus?.slice(2)) ?? nodes.find((node) => node.open)) : undefined;
  const [centerX, centerY] = focus ? [focus.x, focus.y] : [(left + right) / 2, (top + bottom) / 2];
  graph.camera = {
    scale,
    x: view.clientWidth / 2 - centerX * scale,
    y: (view.clientHeight + 40) / 2 - centerY * scale,
  };
  graph.moved = false;
};

const animateGraph = () => {
  cancelAnimationFrame(graph.frame);
  const step = () => {
    if (ui.view !== 'graph') {
      return;
    }
    for (let i = 0; i < 2; i++) {
      graphTick();
    }
    if (!graph.moved) {
      fitGraph();
    }
    drawGraph();
    if (graph.alpha > 0.02) {
      graph.frame = requestAnimationFrame(step);
    }
  };
  graph.frame = requestAnimationFrame(step);
};

const renderGraph = async (keys) => {
  const view = element('graph-view');
  const signature = keys.join(',');
  const data = await graphData(keys);
  if (parseFragment().view !== 'graph') {
    return;
  }
  if (data.shown.size === 0) {
    cancelAnimationFrame(graph.frame);
    graph.nodes.clear();
    graph.edges = [];
    graph.shownKeys = signature;
    view.innerHTML =
      '<div class="graph-empty"><h2>Nothing to draw yet</h2><p class="muted">Open a definition from the tree or the finder (<kbd>/</kbd>) and the graph shows it with what it depends on and what uses it.</p></div>';
    return;
  }
  if (signature === graph.shownKeys && view.querySelector('.graph-stage')) {
    drawGraph();
    return;
  }
  graph.shownKeys = signature;
  for (const node of graph.nodes.values()) {
    graph.positions.set(node.hash, [node.x, node.y]);
  }
  const others = keys.length - data.centers.length;
  view.innerHTML =
    '<div class="graph-stage"><svg class="graph-edges-layer" aria-hidden="true"><defs>' +
    '<marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z"/></marker>' +
    '<marker id="arrow-near" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z"/></marker>' +
    '</defs><g class="graph-edges"></g></svg>' +
    [...data.shown].map(([hash, info]) => graphNodeHtml(hash, info, data.pages.get(hash))).join('') +
    '</div>' +
    '<div class="graph-bar"><span class="muted graph-hint">Click a card to open it; click an open card to show it in the list. Arrows point to what a definition uses.' +
    (others > 0
      ? ` ${others} open card${others === 1 ? ' is' : 's are'} not a definition and ${others === 1 ? 'shows' : 'show'} only in the list.`
      : '') +
    '</span><span class="graph-buttons"><button class="plain-button" data-graph="out" title="Zoom out (⌘ scroll)" aria-label="Zoom out">−</button>' +
    '<button class="plain-button" data-graph="in" title="Zoom in (⌘ scroll)" aria-label="Zoom in">+</button>' +
    '<button class="plain-button" data-graph="fit" title="Fit the graph to the view">Fit</button></span></div>';
  const previous = graph.nodes;
  graph.nodes = new Map();
  for (const [hash, info] of data.shown) {
    const nodeElement = view.querySelector(`.gnode[data-node="${CSS.escape(hash)}"]`);
    const kept = graph.positions.get(hash);
    const near = graph.positions.get(info.near) ?? [0, 0];
    const angle = angleOf(hash);
    const [x, y] =
      kept ??
      (info.open ? [near[0] + 40, near[1] + 40] : [near[0] + Math.cos(angle) * 260, near[1] + Math.sin(angle) * 180]);
    graph.nodes.set(hash, {
      hash,
      open: info.open,
      element: nodeElement,
      width: nodeElement.offsetWidth,
      height: nodeElement.offsetHeight,
      x,
      y,
      vx: 0,
      vy: 0,
      pinned: previous.get(hash)?.pinned ?? false,
    });
  }
  graph.edges = data.edges;
  graph.alpha = 1;
  // Most of the layout runs before the first paint, so the view opens settled rather than exploding.
  const settled = [...graph.nodes.keys()].every((hash) => previous.has(hash));
  for (let i = 0; i < (previous.size === 0 ? 160 : settled ? 0 : 40); i++) {
    graphTick();
  }
  if (!graph.moved) {
    fitGraph();
  }
  drawGraph();
  animateGraph();
};

/** Dragging a card moves (and pins) it; dragging the background pans; the wheel or a pinch zooms. */
const onGraphEvents = () => {
  const view = element('graph-view');
  const pointers = new Map();
  let drag;
  let pinch;
  const toStage = (clientX, clientY) => {
    const box = view.getBoundingClientRect();
    return [
      (clientX - box.left - graph.camera.x) / graph.camera.scale,
      (clientY - box.top - graph.camera.y) / graph.camera.scale,
    ];
  };
  const zoomAt = (clientX, clientY, factor) => {
    const box = view.getBoundingClientRect();
    const scale = Math.min(2.5, Math.max(0.15, graph.camera.scale * factor));
    const px = clientX - box.left;
    const py = clientY - box.top;
    graph.camera.x = px - ((px - graph.camera.x) * scale) / graph.camera.scale;
    graph.camera.y = py - ((py - graph.camera.y) * scale) / graph.camera.scale;
    graph.camera.scale = scale;
    graph.moved = true;
    drawGraph();
  };
  view.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.graph-bar, .graph-empty') || event.button > 0) {
      return;
    }
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    view.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      const [[ax, ay], [bx, by]] = [...pointers.values()];
      pinch = { distance: Math.hypot(bx - ax, by - ay) };
      drag = undefined;
      return;
    }
    const nodeElement = event.target.closest('.gnode');
    const node = nodeElement && graph.nodes.get(nodeElement.dataset.node);
    const [sx, sy] = toStage(event.clientX, event.clientY);
    drag = {
      node,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: node ? node.x - sx : 0,
      offsetY: node ? node.y - sy : 0,
      cameraX: graph.camera.x,
      cameraY: graph.camera.y,
      moved: false,
    };
  });
  view.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    pointers.set(event.pointerId, [event.clientX, event.clientY]);
    if (pinch && pointers.size === 2) {
      const [[ax, ay], [bx, by]] = [...pointers.values()];
      const distance = Math.hypot(bx - ax, by - ay);
      zoomAt((ax + bx) / 2, (ay + by) / 2, distance / pinch.distance);
      pinch.distance = distance;
      return;
    }
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.moved ||= Math.hypot(dx, dy) > 4;
    if (!drag.moved) {
      return;
    }
    if (drag.node) {
      const [sx, sy] = toStage(event.clientX, event.clientY);
      drag.node.x = sx + drag.offsetX;
      drag.node.y = sy + drag.offsetY;
      drag.node.pinned = true;
      graph.alpha = Math.max(graph.alpha, 0.3);
      graph.moved = true;
      animateGraph();
    } else {
      graph.camera.x = drag.cameraX + dx;
      graph.camera.y = drag.cameraY + dy;
      graph.moved = true;
    }
    drawGraph();
  });
  const release = (event) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      pinch = undefined;
    }
    if (drag && !drag.moved && drag.node && event.type === 'pointerup') {
      const key = `d:${drag.node.hash}`;
      if (drag.node.open) {
        ui.focus = key;
        setView('code');
      } else {
        open(key);
      }
    }
    drag = undefined;
  };
  view.addEventListener('pointerup', release);
  view.addEventListener('pointercancel', release);
  view.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      // A pinch arrives as a wheel with ctrlKey; a plain wheel or two-finger scroll pans.
      if (event.ctrlKey || event.metaKey) {
        zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.01));
      } else {
        graph.camera.x -= event.deltaX;
        graph.camera.y -= event.deltaY;
        graph.moved = true;
        drawGraph();
      }
    },
    { passive: false },
  );
  view.addEventListener('click', (event) => {
    const button = event.target.closest('[data-graph]');
    if (button) {
      const box = view.getBoundingClientRect();
      if (button.dataset.graph === 'fit') {
        fitGraph();
        drawGraph();
      } else {
        zoomAt(box.left + box.width / 2, box.top + box.height / 2, button.dataset.graph === 'in' ? 1.25 : 0.8);
      }
    }
  });
  window.addEventListener('resize', () => {
    if (ui.view === 'graph' && !graph.moved) {
      fitGraph();
      drawGraph();
    }
  });
};

//
// The finder.
//

/** Positions of `query` in `text`: a substring, preferring the last segment, else a subsequence. */
const matchPositions = (text, query) => {
  const lower = text.toLowerCase();
  const fromLast = lower.indexOf(query, lower.lastIndexOf('.') + 1);
  const at = fromLast >= 0 ? fromLast : lower.indexOf(query);
  if (at >= 0) {
    return Array.from({ length: query.length }, (_, i) => at + i);
  }
  const positions = [];
  let from = 0;
  for (const char of query) {
    const found = lower.indexOf(char, from);
    if (found < 0) {
      return undefined;
    }
    positions.push(found);
    from = found + 1;
  }
  return positions;
};

const nameScore = (name, query) => {
  const lower = name.toLowerCase();
  const last = lastSegment(lower);
  if (lower === query) {
    return 1000;
  }
  if (last === query) {
    return 950 - lower.length * 0.1;
  }
  if (last.startsWith(query)) {
    return 850 - last.length;
  }
  if (lower.startsWith(query)) {
    return 800 - lower.length * 0.5;
  }
  const inLast = last.indexOf(query);
  if (inLast >= 0) {
    return 700 - inLast - last.length * 0.5;
  }
  const inName = lower.indexOf(query);
  if (inName >= 0) {
    return 600 - inName * 0.5 - lower.length * 0.2;
  }
  const positions = matchPositions(name, query);
  if (!positions) {
    return -1;
  }
  const gaps = positions.reduce((sum, position, i) => sum + (i === 0 ? 0 : position - positions[i - 1] - 1), 0);
  return gaps > query.length * 3 ? -1 : 300 - gaps * 5 - lower.length * 0.2;
};

const normalizeType = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();

const highlight = (text, positions) => {
  const marks = new Set(positions ?? []);
  return [...text].map((char, i) => (marks.has(i) ? `<mark>${escape(char)}</mark>` : escape(char))).join('');
};

const finder = { results: [], selected: 0 };

const search = (raw) => {
  const query = raw.trim();
  if (query === '') {
    return [];
  }
  const bySignature = query.startsWith(':') || query.includes('->');
  if (bySignature) {
    const wanted = normalizeType(query.replace(/^:/, ''));
    return index.names
      .filter((entry) => entry.sig && normalizeType(typeOf(entry.sig)).includes(wanted))
      .map((entry) => ({ entry, score: 500 - entry.sig.length * 0.5 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 60);
  }
  const lower = query.toLowerCase();
  const hits = [];
  for (const entry of index.names) {
    const score = nameScore(entry.name, lower);
    if (score > 0) {
      hits.push({
        entry,
        score: score + (entry.kind === 'type' || entry.kind === 'ability' ? 5 : 0),
        positions: matchPositions(entry.name, lower),
      });
    }
  }
  for (const node of index.tree.children.size > 0 ? allNamespaces() : []) {
    const score = nameScore(node.path, lower);
    if (score > 0 && !index.byName.has(node.path)) {
      hits.push({ namespace: node, score: score - 2, positions: matchPositions(node.path, lower) });
    }
  }
  for (const task of index.tasks) {
    const at = task.title.toLowerCase().indexOf(lower);
    if (at >= 0 || task.id === lower) {
      hits.push({
        task,
        score: 400 - at,
        positions: at >= 0 ? Array.from({ length: lower.length }, (_, i) => at + i) : [],
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 60);
};

let namespaceList;

const allNamespaces = () => {
  if (!namespaceList) {
    namespaceList = [];
    const walk = (node) => {
      for (const child of node.children.values()) {
        if (child.children.size > 0) {
          namespaceList.push(child);
          walk(child);
        }
      }
    };
    walk(index.tree);
  }
  return namespaceList;
};

const resultHtml = (hit, i) => {
  const selected = i === finder.selected ? ' selected' : '';
  if (hit.task) {
    return `<li class="result${selected}" data-index="${i}" role="option"><span class="icon k-task">◎</span><span class="result-name">${highlight(hit.task.title, hit.positions)}</span>${stateChip(hit.task.state)}</li>`;
  }
  if (hit.namespace) {
    return `<li class="result${selected}" data-index="${i}" role="option">${folderIcon}<span class="result-name">${highlight(hit.namespace.path, hit.positions)}</span><span class="result-sig muted">${hit.namespace.count} definitions</span></li>`;
  }
  const entry = hit.entry;
  return (
    `<li class="result${selected}" data-index="${i}" role="option">${icon(entry.kind)}<span class="result-name">${highlight(entry.name, hit.positions)}</span>${statusMark(entry.status)}` +
    `<code class="result-sig">${entry.sig ? escape(typeOf(entry.sig)) : ''}</code>${entry.summary ? `<span class="result-summary">${inlineDoc(entry.summary, '')}</span>` : ''}</li>`
  );
};

const renderFinder = () => {
  const list = element('finder-results');
  const query = element('finder-input').value;
  list.innerHTML =
    finder.results.length > 0
      ? finder.results.map(resultHtml).join('')
      : query.trim()
        ? '<li class="empty muted">No matches.</li>'
        : '<li class="empty muted">Type to search every name in the codebase.</li>';
  list.querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
};

const openFinder = () => {
  element('finder').hidden = false;
  const input = element('finder-input');
  input.select();
  input.focus();
  finder.results = search(input.value);
  finder.selected = 0;
  renderFinder();
};

const closeOverlays = () => {
  element('finder').hidden = true;
  element('shortcuts').hidden = true;
  element('task-dialog').hidden = true;
};

const choose = (hit) => {
  if (!hit) {
    return;
  }
  closeOverlays();
  open(hit.task ? `t:${hit.task.id}` : hit.namespace ? `n:${hit.namespace.path}` : `d:${hit.entry.hash}`);
};

//
// Hover previews.
//

let tooltipTimer;

const showTooltip = (target) => {
  const hash = target.dataset.hash;
  const entry = index.byHash.get(hash);
  if (!entry) {
    return;
  }
  const tooltip = element('tooltip');
  tooltip.innerHTML =
    `<div class="tooltip-head">${icon(entry.kind)}<b>${escape(entry.name)}</b>${statusMark(entry.status)}<span class="muted">${escape(short(entry.hash))}</span></div>` +
    (entry.sig ? `<code class="tooltip-sig">${signatureHtml(entry.sig, namespaceOf(entry.name))}</code>` : '') +
    (entry.summary ? `<p>${inlineDoc(entry.summary, namespaceOf(entry.name))}</p>` : '');
  tooltip.hidden = false;
  const box = target.getBoundingClientRect();
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const left = Math.max(8, Math.min(box.left, window.innerWidth - width - 8));
  const below = box.bottom + 6 + height < window.innerHeight;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${below ? box.bottom + 6 : box.top - height - 6}px`;
};

const hideTooltip = () => {
  clearTimeout(tooltipTimer);
  element('tooltip').hidden = true;
};

//
// Events.
//

let toast;

const notify = (message) => {
  toast?.remove();
  toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast?.remove(), 1600);
};

const isTyping = (target) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;

let pendingG = false;

const onKey = (event) => {
  if (!element('finder').hidden) {
    if (event.key === 'Escape') {
      closeOverlays();
    } else if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      finder.selected = Math.min(finder.selected + 1, finder.results.length - 1);
      renderFinder();
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      finder.selected = Math.max(finder.selected - 1, 0);
      renderFinder();
    } else if (event.key === 'Enter') {
      choose(finder.results[finder.selected]);
    } else {
      return;
    }
    event.preventDefault();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openFinder();
    return;
  }
  if (event.key === 'Escape') {
    closeOverlays();
    return;
  }
  if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }
  const { keys } = parseFragment();
  const at = keys.indexOf(ui.focus);
  if (pendingG) {
    pendingG = false;
    const view = { c: 'code', t: 'tasks', h: 'history' }[event.key];
    if (view) {
      setView(view);
      return;
    }
  }
  switch (event.key) {
    case '/':
      event.preventDefault();
      openFinder();
      break;
    case '?':
      element('shortcuts').hidden = false;
      break;
    case 'j':
    case 'ArrowDown':
      if ((ui.view === 'code' || ui.view === 'graph') && keys.length > 0 && event.key === 'j') {
        setFocus(keys[Math.min(at + 1, keys.length - 1)]);
      }
      break;
    case 'k':
      if ((ui.view === 'code' || ui.view === 'graph') && keys.length > 0) {
        setFocus(keys[Math.max(at - 1, 0)]);
      }
      break;
    case 'x':
      if (ui.focus) {
        close(ui.focus);
      }
      break;
    case 'X':
      writeFragment(ui.view, []);
      break;
    case 'c':
      if (ui.focus) {
        toggleFold(ui.focus);
      }
      break;
    case 'v':
      if (ui.view === 'code' || ui.view === 'graph') {
        setView(ui.view === 'graph' ? 'code' : 'graph');
      }
      break;
    case 't':
      document.body.classList.toggle('no-sidebar');
      break;
    case 'g':
      pendingG = true;
      break;
    case 'm':
      event.preventDefault();
      focusComposer();
      break;
    case 'n':
      event.preventDefault();
      openTaskForm();
      break;
    case 'r':
      event.preventDefault();
      void report();
      break;
    case '`':
      if (shell.info) {
        event.preventDefault();
        showShell();
      }
      break;
    default:
  }
};

const toggleFold = (key) => {
  ui.folded.has(key) ? ui.folded.delete(key) : ui.folded.add(key);
  cardElements.get(key)?.classList.toggle('folded', ui.folded.has(key));
};

const showDialect = () => {
  for (const button of document.querySelectorAll('#dialects [data-dialect]')) {
    button.classList.toggle('active', button.dataset.dialect === ui.dialect);
  }
};

/** Re-renders the open definitions in another dialect. */
const setDialect = (dialect) => {
  ui.dialect = dialect;
  try {
    localStorage.setItem(DIALECT_KEY, dialect);
  } catch {}
  showDialect();
  for (const key of [...cardElements.keys()].filter((other) => other.startsWith('d:'))) {
    cardElements.get(key).remove();
    cardElements.delete(key);
  }
  void render();
};

const onClick = (event) => {
  const target = event.target.closest(
    '[data-open], [data-close], [data-fold], [data-view], [data-toggle], [data-copy], [data-more], [data-home], [data-index], [data-dialect], [data-unfold], [data-run]',
  );
  if (!target) {
    const cardNode = event.target.closest('.card');
    if (cardNode) {
      setFocus(cardNode.dataset.key, false);
    }
    return;
  }
  event.preventDefault();
  hideTooltip();
  const data = target.dataset;
  if (data.index !== undefined) {
    choose(finder.results[Number(data.index)]);
  } else if (data.open) {
    const from = target.closest('.card');
    if (from) {
      ui.focus = from.dataset.key;
    }
    if (window.matchMedia('(max-width: 760px)').matches && target.closest('#sidebar')) {
      document.body.classList.add('no-sidebar');
    }
    open(data.open);
  } else if (data.close) {
    close(data.close);
  } else if (data.fold) {
    toggleFold(data.fold);
  } else if (data.view) {
    setView(data.view);
  } else if (data.toggle) {
    toggleFolder(data.toggle);
  } else if (data.copy) {
    void navigator.clipboard?.writeText(data.copy).then(
      () => notify('Copied the hash'),
      () => notify(data.copy),
    );
  } else if (data.more !== undefined) {
    target.previousElementSibling.hidden = false;
    target.remove();
  } else if (data.unfold !== undefined) {
    target.nextElementSibling.hidden = false;
    target.remove();
  } else if (data.dialect) {
    setDialect(data.dialect);
  } else if (data.home !== undefined) {
    writeFragment('code', []);
  } else if (data.run) {
    shellCommand(data.run, data.next);
  }
};

//
// Console (D84): `deus` itself, on the wasm kernel in this page, against a snapshot of the codebase.
//

const shell = { info: null, session: null, history: [], position: 0, busy: false };

/** Splits a command line into words as a POSIX shell does: '…' is literal, "…" honours backslash escapes. */
const splitWords = (line) => {
  const words = [];
  let word;
  for (let at = 0; at < line.length; at++) {
    const char = line[at];
    if (/\s/.test(char)) {
      if (word !== undefined) {
        words.push(word);
      }
      word = undefined;
    } else if (char === "'") {
      const end = line.indexOf("'", at + 1);
      word = (word ?? '') + line.slice(at + 1, end < 0 ? line.length : end);
      at = end < 0 ? line.length : end;
    } else if (char === '"') {
      word ??= '';
      for (at++; at < line.length && line[at] !== '"'; at++) {
        word += line[at] === '\\' && at + 1 < line.length ? line[++at] : line[at];
      }
    } else {
      word = (word ?? '') + (char === '\\' && at + 1 < line.length ? line[++at] : char);
    }
  }
  if (word !== undefined) {
    words.push(word);
  }
  return words;
};

const shellPrint = (text, className) => {
  if (!text) {
    return;
  }
  const output = element('console-output');
  const span = document.createElement('span');
  span.textContent = text;
  if (className) {
    span.className = className;
  }
  output.append(span);
  output.scrollTop = output.scrollHeight;
};

const fetchText = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`);
  }
  return response.text();
};

/** Loads the kernel, the toolchain image and the codebase snapshot once, on first use: about a megabyte compressed. */
const startShell = () =>
  (shell.session ??= (async () => {
    const started = performance.now();
    const [host, kernelText, image, snapshot] = await Promise.all([
      import('./console/host.mjs'),
      fetchText('console/deus_kernel.wasm.b64'),
      fetchText('console/deus.image'),
      fetchText('console/codebase.json').then(JSON.parse),
    ]);
    // `atob` drops the line breaks `openssl base64` writes.
    const wasm = Uint8Array.from(atob(kernelText), (char) => char.charCodeAt(0));
    const files = Object.fromEntries(Object.entries(snapshot).map(([path, text]) => [`/codebase/${path}`, text]));
    const fs = host.createFiles(files);
    const deus = await host.createDeus({
      wasm,
      fs,
      env: { HOME: '/home', DEUS_HOME: '/deus', DEUS_CODEBASE: '/codebase' },
    });
    element('console-status').textContent =
      `${Object.keys(snapshot).length} codebase files · ready in ${Math.round(performance.now() - started)} ms`;
    return { deus, image };
  })());

const runShell = async (line) => {
  shell.busy = true;
  element('console-input').disabled = true;
  shellPrint(`$ deus ${line}\n`, 'cmd');
  try {
    const { deus, image } = await startShell();
    const begin = performance.now();
    const result = await deus.run(image, { args: splitWords(line), cwd: '/work' });
    shellPrint(result.stdout);
    shellPrint(result.stderr, 'err');
    shellPrint(`exit ${result.code} · ${Math.round(performance.now() - begin)} ms\n`, 'meta');
  } catch (error) {
    shell.session = null;
    shellPrint(`The console could not start: ${error.message}\n`, 'err');
  }
  shell.busy = false;
  element('console-input').disabled = false;
  element('console-input').focus();
};

const showShell = (visible = element('console').hidden) => {
  element('console').hidden = !visible;
  document.body.classList.toggle('with-console', visible);
  element('console-toggle').classList.toggle('active', visible);
  if (visible) {
    if (!shell.session) {
      element('console-status').textContent = 'Loading the kernel, the toolchain and the codebase…';
      void startShell().catch(() => {});
    }
    element('console-input').focus();
  }
};

/** Opens the console, runs `line` there, and leaves `next` in the prompt for the reader to finish. */
const shellCommand = (line, next = '') => {
  showShell(true);
  element('console-input').value = next;
  if (line && !shell.busy) {
    void runShell(line);
  }
};

const consoleButton = (def) =>
  shell.info
    ? `<button class="icon-button" data-run="${escape(def.kind === 'test' ? `test ${def.name}` : `view ${def.name}`)}" data-next="${escape(def.kind === 'term' ? `eval ${def.name} ` : '')}" title="${def.kind === 'test' ? 'Run this test' : 'Open'} in the console" aria-label="Open in the console">›_</button>`
    : '';

const onShellEvents = async () => {
  // meta.json says whether the site has a console, so a site without one requests nothing for it.
  shell.info = index.meta.console ? await load('console/info.json') : undefined;
  if (!shell.info) {
    return;
  }
  element('console-toggle').hidden = false;
  element('console-toggle').addEventListener('click', () => showShell());
  element('console-close').addEventListener('click', () => showShell(false));
  const input = element('console-input');
  element('console-prompt').addEventListener('submit', (event) => {
    event.preventDefault();
    const line = input.value.trim();
    input.value = '';
    if (!line || shell.busy) {
      return;
    }
    if (line === 'clear') {
      element('console-output').replaceChildren();
      return;
    }
    shell.history.push(line);
    shell.position = shell.history.length;
    void runShell(line);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' && shell.position > 0) {
      event.preventDefault();
      input.value = shell.history[--shell.position];
    } else if (event.key === 'ArrowDown' && shell.position < shell.history.length) {
      event.preventDefault();
      input.value = shell.history[++shell.position] ?? '';
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      input.blur();
    }
  });
};

//
// Report (D93): a screenshot of what the reader sees, filed as a task about the explorer.
//

let styleText;

/** Moves a clone's children by its original's scroll offsets, which serialization drops. */
const keepScroll = (original, copy) => {
  if (original.scrollTop || original.scrollLeft) {
    copy.style.overflow = 'hidden';
    for (const child of copy.children) {
      child.style.transform = `translate(${-original.scrollLeft}px, ${-original.scrollTop}px)`;
    }
  }
  [...original.children].forEach((child, at) => copy.children[at] && keepScroll(child, copy.children[at]));
};

/** Draws the page as it is now: the DOM, styled, inside an SVG `foreignObject`, onto a canvas. No permission is asked. */
const drawPage = async () => {
  styleText ??= await fetchText('app.css');
  const width = window.innerWidth;
  const height = window.innerHeight;
  const copy = document.body.cloneNode(true);
  keepScroll(document.body, copy);
  for (const node of copy.querySelectorAll('script, #toast, .toast')) {
    node.remove();
  }
  // Typed text lives in properties, not attributes, so it is copied across by hand.
  const fields = document.body.querySelectorAll('input, textarea');
  copy.querySelectorAll('input, textarea').forEach((field, at) => {
    const value = fields[at]?.value ?? '';
    field instanceof HTMLTextAreaElement ? (field.textContent = value) : field.setAttribute('value', value);
  });
  // The image is drawn outside this document, so the theme's tokens are resolved here and pinned.
  const computed = getComputedStyle(document.documentElement);
  const tokens = [...new Set(styleText.match(/--[a-z0-9-]+(?=\s*:)/g) ?? [])]
    .map((name) => `${name}:${computed.getPropertyValue(name)}`)
    .join(';');
  const root = document.createElement('div');
  root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  root.setAttribute('class', document.body.className);
  root.setAttribute(
    'style',
    `${tokens};width:${width}px;height:${height}px;overflow:hidden;background:var(--bg);color:var(--fg)`,
  );
  root.append(...copy.childNodes);
  const markup = new XMLSerializer().serializeToString(root);
  const style = styleText.replace(/\bbody\b/g, '.page-shot').replace(/:root/g, '.page-shot');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%"><style xmlns="http://www.w3.org/1999/xhtml">${style.replace(/</g, '\\3c ')}</style>` +
    markup.replace('class="', 'class="page-shot ') +
    '</foreignObject></svg>';
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  context.scale(scale, scale);
  context.drawImage(image, 0, 0);
  return new Promise((done, fail) =>
    canvas.toBlob((blob) => (blob ? done(blob) : fail(new Error('empty capture'))), 'image/png'),
  );
};

/** Asks the browser to share this tab and keeps one frame: the fallback when the page cannot draw itself. */
const grabTab = async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, preferCurrentTab: true });
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return await new Promise((done, fail) =>
      canvas.toBlob((blob) => (blob ? done(blob) : fail(new Error('empty capture'))), 'image/png'),
    );
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
};

/** What the reader was looking at, in words, for the report's details. */
const placeOf = () => {
  const { keys } = parseFragment();
  const what =
    ui.view === 'code' ? (keys.length > 0 ? keys.map(titleOf).join(', ') : 'the overview') : `the ${ui.view} view`;
  return `Reported from ${what}: ${location.href}\n${window.innerWidth}×${window.innerHeight}, ${navigator.userAgent}\n\n`;
};

/** `r`: capture the view, then open the task form with the screenshot attached. */
const report = async () => {
  if (!canWrite()) {
    return;
  }
  closeOverlays();
  hideTooltip();
  let shot;
  try {
    shot = await drawPage();
  } catch {
    shot = await grabTab().catch(() => undefined);
  }
  const form = element('task-form');
  openTaskForm({ report: true });
  if (!form.details.value) {
    form.details.value = placeOf();
  }
  if (shot) {
    await attach(form, [
      new File([shot], `explorer-${new Date().toISOString().replace(/[:.]/g, '-')}.png`, { type: 'image/png' }),
    ]);
  } else {
    notify('Could not capture the page; attach a screenshot yourself');
  }
};

/** The project's address `@owner/project` (Address.Spec, D184): the IRI itself, or read from a D49 IRI `https://<owner>.<tld>/…/<project>`. */
const addressOf = (iri) => {
  if (iri.startsWith('@')) {
    return iri;
  }
  const match = /^https:\/\/([^./]+)\.[^/]+\/(?:.*\/)?([^/]+)$/.exec(iri);
  return match ? `@${match[1].toLowerCase()}/${match[2].toLowerCase()}` : iri.replace(/^https?:\/\//, '');
};

/** A path link `/@owner/project/Name` (Address.Spec R-8) becomes a fragment at `/@owner/project/`, `#d:<hash>` for a definition and `#n:Name` for a namespace, so cards keep working by fragment. */
const openPathLink = () => {
  const match = /^(\/@[a-z0-9-]+\/[a-z0-9-]+\/)(.+)$/.exec(decodeURIComponent(location.pathname));
  if (!match || location.hash.length > 1) {
    return;
  }
  const entry = index.byName.get(match[2]);
  const key = entry ? `d:${entry.hash}` : `n:${match[2]}`;
  history.replaceState(null, '', `${match[1]}#${encodeURIComponent(key)}`);
};

const main = async () => {
  const [meta, names, tasks] = await Promise.all([load('meta.json'), load('names.json'), load('tasks.json')]);
  if (!meta || !names || !tasks) {
    document.body.innerHTML =
      '<p class="fatal">This site is missing <code>meta.json</code>, <code>names.json</code> or <code>tasks.json</code>; run <code>deus explore</code> again.</p>';
    return;
  }
  Object.assign(index, { meta, names, tasks });
  for (const entry of names) {
    index.byName.set(entry.name, entry);
    if (!index.byHash.has(entry.hash)) {
      index.byHash.set(entry.hash, entry);
    }
  }
  index.tree = buildTree(names);
  element('project').textContent = addressOf(meta.project);
  element('project').title = meta.project;
  openPathLink();
  element('branch').textContent = meta.branch;
  element('open-count').textContent = meta.open > 0 ? String(meta.open) : '';
  if (index.tree.children.size < 12) {
    for (const child of index.tree.children.values()) {
      ui.expanded.add(child.path);
    }
  }
  if (window.matchMedia('(max-width: 760px)').matches) {
    document.body.classList.add('no-sidebar');
  }
  renderTree();
  showDialect();
  await loadWriting();
  onWriteEvents();
  onGraphEvents();
  await onShellEvents();

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  element('find').addEventListener('click', openFinder);
  element('help').addEventListener('click', () => (element('shortcuts').hidden = false));
  element('menu').addEventListener('click', () => document.body.classList.toggle('no-sidebar'));
  for (const overlay of document.querySelectorAll('.overlay')) {
    overlay.addEventListener('click', (event) => event.target === overlay && closeOverlays());
  }
  element('finder-input').addEventListener('input', (event) => {
    finder.results = search(event.target.value);
    finder.selected = 0;
    renderFinder();
  });
  element('finder-results').addEventListener('mousemove', (event) => {
    const row = event.target.closest('[data-index]');
    if (row && Number(row.dataset.index) !== finder.selected) {
      finder.selected = Number(row.dataset.index);
      for (const other of element('finder-results').querySelectorAll('.result')) {
        other.classList.toggle('selected', other === row);
      }
    }
  });
  document.addEventListener('mouseover', (event) => {
    const target = event.target.closest('[data-hash]');
    clearTimeout(tooltipTimer);
    if (target && !target.closest('#tree')) {
      tooltipTimer = setTimeout(() => showTooltip(target), 250);
    } else if (!event.target.closest('#tooltip')) {
      hideTooltip();
    }
  });
  window.addEventListener('hashchange', render);
  await render();
};

void main();
