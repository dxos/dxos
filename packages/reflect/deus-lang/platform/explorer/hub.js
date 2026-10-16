//
// Copyright 2026 DXOS.org
//

// The host's front page (D200): every project's counts added up, the projects themselves, and a search
// over all of their definitions. Each project's explorer stays at `/@owner/project/`.

/** The kinds as the explorer shows them (`app.js` KINDS), in its order. */
const KINDS = [
  ['type', 'T', 'types'],
  ['ability', 'A', 'abilities'],
  ['term', 'ƒ', 'terms'],
  ['test', '⊨', 'tests'],
  ['theorem', '∀', 'theorems'],
  ['spec', 'S', 'spec blocks'],
];

const RESULTS = 60;

const escape = (text) =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const element = (id) => document.getElementById(id);

const icon = (kind, glyph) => `<span class="icon k-${escape(kind)}" title="${escape(kind)}">${escape(glyph)}</span>`;

const count = (value) => Number(value ?? 0).toLocaleString('en-US');

/** A row of count tiles; a tile links where its count can be seen, and is plain where no one page lists it. */
const tiles = (counts, link) =>
  `<ul class="stats">${counts
    .map(([kind, glyph, label, value]) => {
      const body = `${glyph ? icon(kind, glyph) : ''}<b>${count(value)}</b><span>${escape(label)}</span>`;
      const href = link(kind);
      return href ? `<li><a href="${escape(href)}">${body}</a></li>` : `<li><div class="tile">${body}</div></li>`;
    })
    .join('')}</ul>`;

/** A project's counts as tiles: definitions by kind, then its open tasks. */
const countsOf = (project) => [
  ...KINDS.map(([kind, glyph, label]) => [kind, glyph, label, project.kinds?.[kind] ?? 0]),
  ['task', '◎', 'open tasks', project.open ?? 0],
];

/** How many of a project's checked tests and theorems pass, from the results its pushes carry (D209); none when none were pushed. */
const checksLine = (project, home) => {
  const { pass = 0, fail = 0 } = project.checks ?? {};
  if (pass + fail === 0) {
    return '';
  }
  return `<a class="hub-checks${fail > 0 ? ' failing' : ''}" href="${escape(`${home}#k:checks`)}" title="Checked tests and theorems, failing first">${icon(fail > 0 ? 'fail' : 'test', fail > 0 ? '✗' : '✓')}<b>${count(pass)}/${count(pass + fail)}</b> checks pass</a>`;
};

const renderTotals = (projects) => {
  const sum = (pick) => projects.reduce((total, project) => total + (pick(project) ?? 0), 0);
  const counts = [
    ['namespace', '▤', 'projects', projects.length],
    ...KINDS.map(([kind, glyph, label]) => [kind, glyph, label, sum((project) => project.kinds?.[kind])]),
    ['task', '◎', 'open tasks', sum((project) => project.open)],
  ];
  element('hub-totals').innerHTML =
    `<header class="home-header"><h1>DEUS codebases</h1><p class="muted">${count(sum((project) => project.own ?? project.definitions))} definitions in ${projects.length} project${projects.length === 1 ? '' : 's'} on this host, each counted in the project that defines it.</p>` +
    // A first path for a visitor who has not met DEUS (the four-project probe, 2026-10-16).
    `<p class="hub-start">New here? DEUS keeps code in a codebase, not files: each definition stored by its hash beside its history, specs, tests and tasks. Start with <a href="/@dxos/toolchain/#n:Tour">the Tour</a>, then a spec document such as <a href="/@dxos/toolchain/#s:Compile.Spec">Compile.Spec</a>; <a href="/@dxos/toolchain/#k:glossary">the glossary</a> explains the terms and the glyphs. To see DEUS run in a browser, open <a href="/demo/todo/">the todo app</a>, written in DEUS with React (<a href="/@dxos/web/#n:TodoApp">its source</a>).</p></header>` +
    // The totals add up every project, and only the project list shows them together.
    tiles(counts, (kind) => (kind === 'namespace' ? '#hub-projects' : undefined));
};

/** A project's counts as one quiet line of small labelled numbers, each opening that list in its explorer. */
const countLine = (project, home) =>
  `<p class="hub-counts">${checksLine(project, home)}${countsOf(project)
    .filter(([kind, , , value]) => value > 0 || kind !== 'task')
    .map(
      ([kind, glyph, label, value]) =>
        `<a href="${escape(`${home}#k:${kind === 'task' ? 'tasks' : kind}`)}" title="${escape(label)}">${icon(kind, glyph)}<b>${count(value)}</b> ${escape(label)}</a>`,
    )
    .join('')}</p>`;

/** Its own definitions, and those of the libraries it mounts, which count in their own projects. */
const sizeOf = (project) => {
  const own = project.own ?? project.definitions;
  const mounted = (project.definitions ?? 0) - own;
  return `${count(own)} definitions${mounted > 0 ? ` + ${count(mounted)} from libraries` : ''}`;
};

/** Until its feature map's introduction arrives, a project is described by what it is mostly made of. */
const fallbackDescription = (project) =>
  project.namespaces?.length > 0
    ? `Mostly ${project.namespaces.slice(0, -1).join(', ')}${project.namespaces.length > 1 ? ' and ' : ''}${project.namespaces.at(-1)}.`
    : '';

const renderProjects = (projects) => {
  element('hub-projects').innerHTML =
    '<h3 class="group-title">Projects</h3>' +
    `<div class="hub-projects">${projects
      .map((project) => {
        const home = `/${project.address}/`;
        return (
          `<a class="hub-project" href="${escape(home)}"><header><span class="hub-project-name">${escape(project.address)}</span>` +
          (project.branch ? `<span class="chip">${escape(project.branch)}</span>` : '') +
          `<span class="muted hub-size">${project.drawing ? 'being drawn' : sizeOf(project)}</span></header>` +
          `<p class="hub-description" data-description="${escape(project.address)}">${escape(fallbackDescription(project))}</p>` +
          (project.historyCheck
            ? `<p class="hub-warning">⚠ Its head #${escape(project.historyCheck.causal.slice(0, 10))} does not descend from the head before it, #${escape(project.historyCheck.previous.slice(0, 10))}: a push dropped history. <code>deus heads</code> lists both and <code>deus restore</code> brings the names back.</p>`
            : '') +
          '</a>' +
          (project.drawing ? '' : countLine(project, home))
        );
      })
      .map((card) => `<article class="hub-card">${card}</article>`)
      .join('')}</div>`;
  void describe(projects);
};

/** The first paragraph of each project's feature map, which says what the project is. */
const describe = (projects) =>
  Promise.all(
    projects
      .filter((project) => project.featureMap && !project.drawing)
      .map(async (project) => {
        const response = await fetch(`/v1/${project.address}/live/${project.causal}/doc/${project.featureMap}.json`);
        const text = response.ok ? (await response.json()).text : '';
        const body = text.slice(text.search(/^# /m)).split('\n').slice(1).join('\n').trim();
        const paragraph =
          body
            .split(/\n\s*\n/)[0]
            ?.replace(/\s+/g, ' ')
            .replace(/`/g, '') ?? '';
        const slot = document.querySelector(`[data-description="${CSS.escape(project.address)}"]`);
        if (slot && paragraph && !paragraph.startsWith('#')) {
          slot.textContent = paragraph;
        }
      }),
  );

//
// Search: each project's names, fetched when the visitor first types.
//

let names;

const loadNames = (projects) =>
  (names ??= Promise.all(
    projects
      .filter((project) => project.causal && !project.drawing)
      .map(async (project) => {
        const response = await fetch(`/v1/${project.address}/live/${project.causal}/index.json`);
        const index = response.ok ? await response.json() : { names: [] };
        return index.names.map((entry) => ({ ...entry, project: project.address }));
      }),
  ).then((lists) => lists.flat()));

/** Names whose last segment starts with the query come first, then names that contain it anywhere. */
const rank = (entry, query) => {
  const name = entry.name.toLowerCase();
  const last = name.slice(name.lastIndexOf('.') + 1);
  return last.startsWith(query) ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : -1;
};

const search = async (projects, text) => {
  const query = text.trim().toLowerCase();
  const results = element('hub-results');
  if (!query) {
    results.hidden = true;
    return;
  }
  results.hidden = false;
  results.innerHTML = '<p class="muted">Searching…</p>';
  const all = await loadNames(projects);
  if (element('hub-search').value.trim().toLowerCase() !== query) {
    return;
  }
  const hits = all
    .map((entry) => [rank(entry, query), entry])
    .filter(([score]) => score >= 0)
    .sort((left, right) => left[0] - right[0] || left[1].name.length - right[1].name.length)
    .slice(0, RESULTS)
    .map(([, entry]) => entry);
  const glyph = Object.fromEntries(KINDS.map(([kind, symbol]) => [kind, symbol]));
  results.innerHTML =
    `<h3 class="group-title">${hits.length === RESULTS ? `First ${RESULTS}` : hits.length} result${hits.length === 1 ? '' : 's'} for “${escape(text.trim())}”</h3>` +
    (hits.length === 0
      ? '<p class="muted">Nothing by that name.</p>'
      : `<ul class="rows">${hits
          .map(
            (entry) =>
              `<li class="entry-row">${icon(entry.kind, glyph[entry.kind] ?? '·')}<a class="ref" href="/${escape(entry.project)}/${escape(entry.name)}">${escape(entry.name)}</a>` +
              `<span class="chip">${escape(entry.project)}</span>${entry.summary ? `<span class="row-summary">${escape(entry.summary)}</span>` : ''}</li>`,
          )
          .join('')}</ul>`);
};

const main = async () => {
  // Links from before the hub (`/#d:<hash>`) named the toolchain's cards, which now live at its own path.
  if (/^#[dtcnks]:/.test(location.hash)) {
    location.replace(`/@dxos/toolchain/${location.hash}`);
    return;
  }
  const response = await fetch('/v1/_projects');
  const projects = response.ok ? await response.json() : [];
  renderTotals(projects);
  renderProjects(projects);
  let pending;
  const input = element('hub-search');
  input.addEventListener('input', () => {
    clearTimeout(pending);
    pending = setTimeout(() => void search(projects, input.value), 150);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== input) {
      event.preventDefault();
      input.focus();
    }
  });
};

void main();
