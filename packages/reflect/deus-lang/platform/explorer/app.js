//
// Copyright 2026 DXOS.org
//

// The codebase explorer (D58, D72): a single page over the JSON that `deus explore` writes, modelled on
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
    .filter((key) => /^[dtcnv]:./.test(key));
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
  writeFragment('code', keys.includes(key) ? keys : [...keys.slice(0, anchor + 1), key, ...keys.slice(anchor + 1)]);
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

const card = (key, { iconHtml, title, meta = '', body, tag = '', prose = false }) =>
  `<article class="card${ui.folded.has(key) ? ' folded' : ''}" data-key="${escape(key)}" tabindex="-1">` +
  `<header>${iconHtml}<h2${prose ? ' class="prose"' : ''}>${title}</h2>${tag}<span class="card-meta">${meta}</span>` +
  `<button class="icon-button" data-fold="${escape(key)}" title="Fold (c)" aria-label="Fold">▾</button>` +
  `<button class="icon-button" data-close="${escape(key)}" title="Close (x)" aria-label="Close">✕</button></header>` +
  `<div class="content">${body}</div></article>`;

const hashChip = (hash) =>
  `<button class="hash-chip" data-copy="${escape(hash)}" title="Copy the full hash">${escape(short(hash))}</button>`;

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

const definitionCard = (key, def) => {
  const namespace = namespaceOf(def.name);
  const entry = index.byHash.get(def.hash);
  const kindTag = `<span class="tag">${escape(KINDS[def.kind]?.label ?? def.kind)}</span>`;
  return card(key, {
    iconHtml: icon(def.kind),
    title: breadcrumbs(def.name, false),
    tag: kindTag,
    meta: hashChip(def.hash),
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
        .map(
          (change) =>
            `<li class="entry-row">${changeLink(change.causal)}<span>${escape(change.message)}</span>${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}</li>`,
        )
        .join('')}</ul>`;

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
      (task.comments.length > 0
        ? section(
            'Comments',
            task.comments.length,
            task.comments
              .map(
                (comment) =>
                  `<div class="comment"><b>${escape(comment.author)}</b><div>${docHtml(comment.note, '')}</div></div>`,
              )
              .join(''),
          )
        : '') +
      section('History', task.history.length, changeRows(task.history), task.history.length <= 8),
  });
};

/** A change names definitions by the hashes they had then; pages exist for the current ones. */
const changeCard = (key, change) => {
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
    meta: `${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}${hashChip(change.causal)}`,
    body:
      (added.length > 0 ? section('Added', added.length, rowList(added)) : '') +
      (changed.length > 0 ? section('Changed', changed.length, rowList(changed)) : '') +
      (removed.length > 0 ? section('Removed', removed.length, rowList(removed)) : '') +
      (tasks.length > 0 ? section('Tasks', tasks.length, `<ul class="rows">${tasks.join('')}</ul>`) : '') +
      (added.length + changed.length + removed.length + tasks.length === 0
        ? '<p class="muted">No visible names or tasks changed.</p>'
        : '') +
      `<p class="parents"><span class="label">Parents</span> ${change.parents.map((parent) => changeLink(parent)).join(' ') || '<span class="muted">none: the first change</span>'}</p>`,
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
      const def = await load(pagePath(value));
      if (def?.ts !== undefined) {
        element('dialects').hidden = false;
      }
      return def ? definitionCard(key, def) : missingCard(key, `No definition ${short(value)}`);
    }
    case 'n':
      return namespaceCard(key, value);
    case 't': {
      const task = index.tasks.find((other) => other.id === value);
      return task ? taskCard(key, task) : missingCard(key, `No task ${value}`);
    }
    case 'c': {
      const change = await load(`change/${value}.json`);
      return change ? changeCard(key, change) : missingCard(key, `No change ${short(value)}`);
    }
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
    } · ${meta.definitions} definitions · ${meta.tasks} tasks</p></header>` +
    `<ul class="stats">${counts.map(([kind, count]) => `<li>${icon(kind)}<b>${count}</b><span>${escape(KINDS[kind].plural.toLowerCase())}</span></li>`).join('')}` +
    (checked.length > 0
      ? `<li><span class="icon ${failing.length > 0 ? 'k-fail' : 'k-test'}">${failing.length > 0 ? '✗' : '✓'}</span><b>${checked.length - failing.length}/${checked.length}</b><span>checks pass</span></li>`
      : '') +
    `<li><span class="icon k-task">◎</span><b>${open.length}</b><span>open task${open.length === 1 ? '' : 's'}</span></li></ul>` +
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
  element('tasks-view').innerHTML = `<h1 class="view-title">Tasks</h1><div class="board">${columns.join('')}</div>`;
};

const renderHistory = async () => {
  const history = index.meta.history;
  const view = element('history-view');
  view.innerHTML =
    `<h1 class="view-title">History <span class="muted">· ${escape(index.meta.branch)}</span></h1><ol class="timeline">` +
    history
      .map(
        (change) =>
          `<li><a class="timeline-row" data-open="c:${escape(change.causal)}"><span class="dot"></span><span class="message">${escape(change.message || '(no message)')}</span>` +
          `<span class="diffstat" data-stat="${escape(change.causal)}"></span>${change.by ? `<span class="by">${escape(change.by)}</span>` : ''}<span class="hash">${escape(short(change.causal))}</span></a></li>`,
      )
      .join('') +
    '</ol>' +
    (history.length >= 30 ? '<p class="muted">The 30 most recent changes.</p>' : '');
  await Promise.all(
    history.map(async (change) => {
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
    link.classList.toggle('active', link.dataset.view === view);
  }
  element('workspace').hidden = view !== 'code';
  element('tasks-view').hidden = view !== 'tasks';
  element('history-view').hidden = view !== 'history';
  if (view === 'tasks') {
    renderTasks();
  } else if (view === 'history') {
    void renderHistory();
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
  return key.startsWith('n:') ? value : short(value);
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
      if (ui.view === 'code' && keys.length > 0 && event.key === 'j') {
        setFocus(keys[Math.min(at + 1, keys.length - 1)]);
      }
      break;
    case 'k':
      if (ui.view === 'code' && keys.length > 0) {
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
    case 't':
      document.body.classList.toggle('no-sidebar');
      break;
    case 'g':
      pendingG = true;
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
    '[data-open], [data-close], [data-fold], [data-view], [data-toggle], [data-copy], [data-more], [data-home], [data-index], [data-dialect], [data-unfold]',
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
  }
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
  element('project').textContent = meta.project.replace(/^https?:\/\//, '');
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
