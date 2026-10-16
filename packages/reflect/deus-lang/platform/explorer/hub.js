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
  ['test', '✓', 'tests'],
  ['theorem', '∀', 'theorems'],
  ['spec', 'S', 'specs'],
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

/** A row of count tiles; each tile links where its count can be seen. */
const tiles = (counts, link) =>
  `<ul class="stats">${counts
    .map(
      ([kind, glyph, label, value]) =>
        `<li><a href="${escape(link(kind))}">${glyph ? icon(kind, glyph) : ''}<b>${count(value)}</b><span>${escape(label)}</span></a></li>`,
    )
    .join('')}</ul>`;

/** A project's counts as tiles: definitions by kind, then its open tasks. */
const countsOf = (project) => [
  ...KINDS.map(([kind, glyph, label]) => [kind, glyph, label, project.kinds?.[kind] ?? 0]),
  ['task', '◎', 'open tasks', project.open ?? 0],
];

const renderTotals = (projects) => {
  const sum = (pick) => projects.reduce((total, project) => total + (pick(project) ?? 0), 0);
  const counts = [
    ['namespace', '▤', 'projects', projects.length],
    ...KINDS.map(([kind, glyph, label]) => [kind, glyph, label, sum((project) => project.kinds?.[kind])]),
    ['task', '◎', 'open tasks', sum((project) => project.open)],
  ];
  element('hub-totals').innerHTML =
    `<header class="home-header"><h1>DEUS codebases</h1><p class="muted">${count(sum((project) => project.definitions))} definitions in ${projects.length} project${projects.length === 1 ? '' : 's'} on this host. A library a project mounts counts in both.</p></header>` +
    tiles(counts, (kind) => (kind === 'namespace' ? '#hub-projects' : '#'));
};

const renderProjects = (projects) => {
  element('hub-projects').innerHTML =
    '<h3 class="group-title">Projects</h3>' +
    `<div class="hub-projects">${projects
      .map((project) => {
        const home = `/${project.address}/`;
        return (
          `<article class="hub-project"><header><a class="hub-project-name" href="${escape(home)}">${escape(project.address)}</a>` +
          (project.branch ? `<span class="chip">${escape(project.branch)}</span>` : '') +
          `</header><p class="muted">${project.drawing ? 'Being drawn for the first time.' : `${count(project.definitions)} definitions · ${count(project.tasks)} tasks`}</p>` +
          (project.drawing ? '' : tiles(countsOf(project), (kind) => `${home}#k:${kind === 'task' ? 'tasks' : kind}`)) +
          '</article>'
        );
      })
      .join('')}</div>`;
};

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
