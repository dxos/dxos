//
// Copyright 2026 DXOS.org
//

// The codebase explorer (D58): a single page over the JSON that `deus explore` writes.
// Definitions and tasks open as cards in one workspace, newest first, so several can be read
// side by side; the open cards are kept in the URL so a view can be shared.

const STATES = ['todo', 'doing', 'done', 'canceled'];
const PRIORITIES = ['none', 'urgent', 'high', 'medium', 'low'];

const escape = (text) =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const load = async (path) => {
  const response = await fetch(path);
  return response.ok ? response.json() : undefined;
};

const element = (id) => document.getElementById(id);

/** The dialect definitions are shown in (D70): DEUS, or TypeScript-like where the page has it; kept per viewer. */
const readDialect = () => {
  try {
    return localStorage.getItem('deus.dialect') === 'ts' ? 'ts' : 'deus';
  } catch {
    return 'deus';
  }
};

let dialect = readDialect();

/** Open cards as `d:<hash>`, `t:<task id>` and `c:<change>`, newest first; the URL hash is the source of truth. */
const openKeys = () =>
  decodeURIComponent(location.hash.slice(1))
    .split(',')
    .filter((key) => /^[dtc]:./.test(key));

const setOpen = (keys) => {
  const next = keys.join(',');
  if (decodeURIComponent(location.hash.slice(1)) !== next) {
    location.hash = next;
  }
};

const open = (key) => setOpen([key, ...openKeys().filter((other) => other !== key)]);

const close = (key) => setOpen(openKeys().filter((other) => other !== key));

const defLink = (name, hash) => `<a data-open="d:${escape(hash)}">${escape(name)}</a>`;

const taskLink = (task) => `<a data-open="t:${escape(task.id)}">${escape(task.title)}</a>`;

const changeRows = (changes) =>
  changes.length === 0
    ? '<p class="muted">none</p>'
    : `<table>${changes
        .map(
          (change) =>
            `<tr><td class="hash"><a data-open="c:${escape(change.causal)}">#${escape(change.causal.slice(0, 10))}</a></td><td>${escape(change.message)}${
              change.by ? ` <span class="muted">by ${escape(change.by)}</span>` : ''
            }</td></tr>`,
        )
        .join('')}</table>`;

const linkList = (refs) =>
  refs.length === 0
    ? '<p class="muted">none</p>'
    : `<p class="links">${refs.map((ref) => defLink(ref.name, ref.hash)).join('')}</p>`;

const card = (key, title, subtitle, content) =>
  `<article class="card" data-key="${escape(key)}"><header><h2>${title}</h2><span class="hash">${subtitle}</span>` +
  `<button class="close" data-close="${escape(key)}" title="Close">×</button></header><div class="content">${content}</div></article>`;

const definitionCard = (def) =>
  card(
    `d:${def.hash}`,
    escape(def.name),
    `${escape(def.kind)} · #${escape(def.hash.slice(0, 10))}`,
    (def.aliases.length > 0 ? `<p class="muted">also named ${def.aliases.map(escape).join(', ')}</p>` : '') +
      (def.signature ? `<pre>${escape(def.signature)}</pre>` : '') +
      `<pre>${dialect === 'ts' && def.ts ? def.ts : def.html}</pre>` +
      (def.verdict ? `<h3>Verdict</h3><p>${escape(def.verdict)}</p>` : '') +
      (def.tasks.length > 0 ? `<h3>Tasks</h3><p class="links">${def.tasks.map(taskLink).join('')}</p>` : '') +
      `<h3>Depends on</h3>${linkList(def.deps)}<h3>Used by</h3>${linkList(def.users)}`,
  );

const taskCard = (task, tasks) => {
  const parent = tasks.find((other) => other.id === task.parent);
  const children = tasks.filter((other) => other.parent === task.id);
  const links = task.links.map((link) =>
    link.change
      ? `<li>change <span class="hash">#${escape(link.change.slice(0, 10))}</span> ${escape(link.message)}</li>`
      : `<li>${defLink(link.definition, link.current ?? link.hash)}${
          link.current === null
            ? ' <span class="muted">no longer named</span>'
            : link.current !== link.hash
              ? ` <span class="muted">changed since linked (was #${escape(link.hash.slice(0, 10))})</span>`
              : ''
        }</li>`,
  );
  return card(
    `t:${task.id}`,
    escape(task.title),
    `task · ${escape(task.id)}`,
    `<p><span class="badge">${escape(task.state)}</span><span class="badge">${escape(PRIORITIES[task.priority] ?? task.priority)}</span>` +
      (task.assignee ? `<span class="badge">@${escape(task.assignee)}</span>` : '') +
      task.labels.map((label) => `<span class="badge">${escape(label)}</span>`).join('') +
      (parent ? ` parent ${taskLink(parent)}` : '') +
      '</p>' +
      (task.details ? `<p>${escape(task.details)}</p>` : '') +
      `<h3>Links</h3>${links.length > 0 ? `<ul>${links.join('')}</ul>` : '<p class="muted">none</p>'}` +
      (children.length > 0 ? `<h3>Subtasks</h3><p class="links">${children.map(taskLink).join('')}</p>` : '') +
      (task.comments.length > 0
        ? `<h3>Comments</h3>${task.comments.map((comment) => `<p><b>${escape(comment.author)}</b>: ${escape(comment.note)}</p>`).join('')}`
        : '') +
      `<h3>History</h3>${changeRows(task.history)}`,
  );
};

/** A change names definitions by the hashes they had then; pages exist for the current ones. */
const changeCard = (change, tasks, names) => {
  const current = (name, hash) => names.find((entry) => entry.name === name)?.hash ?? hash;
  const taskRefs = change.tasks
    .map((id) => tasks.find((task) => task.id === id))
    .filter(Boolean)
    .map(taskLink);
  return card(
    `c:${change.causal}`,
    escape(change.message),
    `change · #${escape(change.causal.slice(0, 10))}${change.by ? ` · by ${escape(change.by)}` : ''}`,
    `<h3>Added</h3>${linkList(change.added.map((ref) => ({ name: ref.name, hash: current(ref.name, ref.hash) })))}` +
      `<h3>Changed</h3>${
        change.changed.length === 0
          ? '<p class="muted">none</p>'
          : `<ul>${change.changed
              .map(
                (entry) =>
                  `<li>${defLink(entry.name, current(entry.name, entry.hash))} <span class="hash">#${escape(entry.from.slice(0, 10))} → #${escape(entry.hash.slice(0, 10))}</span></li>`,
              )
              .join('')}</ul>`
      }` +
      (change.removed.length > 0 ? `<h3>Removed</h3><p>${change.removed.map(escape).join(', ')}</p>` : '') +
      (taskRefs.length > 0 ? `<h3>Tasks</h3><p class="links">${taskRefs.join('')}</p>` : '') +
      `<h3>Parents</h3><p class="hash">${change.parents.map((parent) => `<a data-open="c:${escape(parent)}">#${escape(parent.slice(0, 10))}</a>`).join(' ') || 'none'}</p>`,
  );
};

/** The namespace tree: a node per name segment; a node may also be a definition (`List` and `List.map`). */
const buildTree = (names) => {
  const root = { children: new Map(), entry: undefined };
  for (const entry of names) {
    let node = root;
    for (const segment of entry.name.split('.')) {
      if (!node.children.has(segment)) {
        node.children.set(segment, { children: new Map(), entry: undefined });
      }
      node = node.children.get(segment);
    }
    node.entry = entry;
  }
  return root;
};

const renderTree = (node, depth) =>
  [...node.children.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([segment, child]) => {
      const label = child.entry
        ? `${defLink(segment, child.entry.hash)}<span class="kind">${escape(child.entry.kind)}</span>`
        : escape(segment);
      return child.children.size === 0
        ? `<span class="leaf">${label}</span>`
        : `<details${depth === 0 && node.children.size < 8 ? ' open' : ''}><summary>${label}</summary><div class="children">${renderTree(child, depth + 1)}</div></details>`;
    })
    .join('');

const renderBoard = (tasks) =>
  STATES.map(
    (state) =>
      `<div class="column"><h3>${state} (${tasks.filter((task) => task.state === state).length})</h3>${tasks
        .filter((task) => task.state === state)
        .map(
          (task) =>
            `<a class="task ${state}" data-open="t:${escape(task.id)}">${escape(task.title)}<div class="meta">${escape(task.id)} · ${escape(
              PRIORITIES[task.priority] ?? task.priority,
            )}${task.assignee ? ` · @${escape(task.assignee)}` : ''}${task.labels.length > 0 ? ` · ${task.labels.map(escape).join(', ')}` : ''}</div></a>`,
        )
        .join('')}</div>`,
  ).join('');

const renderOverview = (meta) =>
  `<article class="card"><header><h2>${escape(meta.project)}</h2><span class="hash">branch ${escape(meta.branch)}</span></header><div class="content">` +
  `<p>${meta.definitions} definitions · ${meta.tasks} tasks (${meta.open} open) · branches: ${meta.branches.map(escape).join(', ')}</p>` +
  '<p class="muted">Open definitions from the tree or the search; each opens as a card here, and the cards stay in the URL.</p>' +
  `<h3>History</h3>${changeRows(meta.history)}</div></article>`;

const main = async () => {
  const [meta, names, tasks] = await Promise.all([load('meta.json'), load('names.json'), load('tasks.json')]);
  const defs = new Map();
  element('project').textContent = meta.project;
  element('open-count').textContent = meta.open > 0 ? `(${meta.open})` : '';
  document.title = meta.project;
  const tree = buildTree(names);
  element('tree').innerHTML = renderTree(tree, 0);
  element('board').innerHTML = renderBoard(tasks);
  element('overview').innerHTML = renderOverview(meta);

  const definition = async (hash) => {
    if (!defs.has(hash)) {
      defs.set(hash, await load(`def/${encodeURIComponent(hash)}.json`));
    }
    return defs.get(hash);
  };

  const render = async () => {
    const keys = openKeys();
    const cards = await Promise.all(
      keys.map(async (key) => {
        if (key.startsWith('t:')) {
          const task = tasks.find((other) => other.id === key.slice(2));
          return task ? taskCard(task, tasks) : '';
        }
        if (key.startsWith('c:')) {
          const change = await load(`change/${key.slice(2)}.json`);
          return change ? changeCard(change, tasks, names) : '';
        }
        const def = await definition(key.slice(2));
        return def ? definitionCard(def) : '';
      }),
    );
    element('cards').innerHTML = cards.join('');
    element('overview').hidden = keys.length > 0;
  };

  const search = () => {
    const query = element('search').value.trim().toLowerCase();
    if (query === '') {
      element('tree').innerHTML = renderTree(tree, 0);
      return;
    }
    const hits = names.filter((entry) => entry.name.toLowerCase().includes(query)).slice(0, 80);
    const taskHits = tasks.filter((task) => task.title.toLowerCase().includes(query)).slice(0, 20);
    element('tree').innerHTML =
      hits
        .map(
          (entry) =>
            `<span class="leaf">${defLink(entry.name, entry.hash)}<span class="kind">${escape(entry.kind)}</span></span>`,
        )
        .join('') +
      taskHits.map((task) => `<span class="leaf">${taskLink(task)}<span class="kind">task</span></span>`).join('');
  };

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-open], [data-close], [data-view], [data-dialect]');
    if (!target) {
      return;
    }
    event.preventDefault();
    if (target.dataset.open) {
      open(target.dataset.open);
      element('workspace').scrollTop = 0;
    } else if (target.dataset.close) {
      close(target.dataset.close);
    } else if (target.dataset.dialect) {
      dialect = target.dataset.dialect;
      try {
        localStorage.setItem('deus.dialect', dialect);
      } catch {}
      showDialect();
      void render();
    } else {
      for (const button of document.querySelectorAll('#views button')) {
        button.classList.toggle('active', button === target);
      }
      element('board').hidden = target.dataset.view !== 'tasks';
    }
  });
  element('search').addEventListener('input', search);
  element('project').addEventListener('click', (event) => {
    event.preventDefault();
    setOpen([]);
  });
  const showDialect = () => {
    for (const button of document.querySelectorAll('#dialects button')) {
      button.classList.toggle('active', button.dataset.dialect === dialect);
    }
  };
  showDialect();
  window.addEventListener('hashchange', render);
  await render();
};

void main();
