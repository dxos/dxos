//
// Copyright 2026 DXOS.org
//

// The explorer read live from the hosted codebase (D192). The explorer's own DEUS code (`Explorer.site`,
// `liveIndex`, `liveDef`, `liveChange`), compiled to JS with `deus build --js`, runs here over a
// codebase directory whose files are the project's packs: `objects/<2>/<hash>` and `meta/<hash>` are
// pack lookups, `branches/<b>` the head. The compiled code reads synchronously, so a run that reads
// something not fetched yet sees no file, records it, and is run again once it is fetched. Results
// are kept in the bucket under `<project>/live/<causal>/`, since nothing at a causal ever changes.
//
//   GET /v1/<project>/live/<branch>               {"causal": head}
//   GET /v1/<project>/live/<causal>/index.json    meta, names, tasks, comments, events and features
//   GET /v1/<project>/live/<causal>/def/<page>.json   a definition's page (`_Bool` for `#Bool`)
//   GET /v1/<project>/live/<causal>/change/<causal>.json   a change's page
//   GET /v1/<project>/live/<causal>/doc/<Doc>.json   a spec document's page (`Address.Spec`, D196)

import { addressOfFolder } from './address.mjs';
import * as runtime from './gen/deus-runtime.mjs';
import * as explorer from './gen/explorer-live.js';
import { lookupMany, parseSexp } from './packs.mjs';
import { HttpError, headLogKey, json, listAll, listFolders, readHead } from './remote.mjs';

const ROOT = '/codebase';
const HASH = /^[0-9a-f]{64}$/;
const BUILTIN = /^#[A-Za-z][A-Za-z0-9_.]{0,99}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;
const PAGE = /^(_[A-Za-z][A-Za-z0-9_.]{0,99}|[0-9a-f]{64}(\.[0-9]{1,6})?)\.json$/;
/** A spec document is named like a namespace: `Address.Spec`, `Toolchain.Features`. */
const DOC = /^[A-Za-z][A-Za-z0-9_]{0,99}(\.[A-Za-z][A-Za-z0-9_]{0,99}){0,9}\.json$/;
/** A member of a recursive group: its group's hash and its position. */
const MEMBER = /^[0-9a-f]{64}\.[0-9]{1,6}$/;
/** Passes a run may take before it gives up: each one fetches everything the last one missed. */
const MAX_PASSES = 30;

/** `/v1/<project>/live/…`; `drawn` waits for this head's own page rather than answering with an earlier head's. */
export const live = async (request, env, ctx, project, rest, { drawn = false } = {}) => {
  if (request.method !== 'GET') {
    throw new HttpError(405, 'method not allowed');
  }
  const [first, ...more] = rest.map(decodeURIComponent);
  if (!HASH.test(first ?? '')) {
    const branch = [first, ...more].join('/');
    if (!BRANCH.test(branch)) {
      throw new HttpError(404, 'a live explorer is /live/<branch> or /live/<causal>/…');
    }
    const shown = await liveHead(env, ctx, project, branch);
    if (!shown) {
      throw new HttpError(404, `no branch ${branch}`);
    }
    return json(shown);
  }
  const causal = first;
  const path = more.join('/');
  if (
    path !== 'index.json' &&
    !(more.length === 2 && (more[0] === 'def' || more[0] === 'change') && PAGE.test(more[1])) &&
    !(more.length === 2 && more[0] === 'doc' && DOC.test(more[1]))
  ) {
    throw new HttpError(404, 'not found');
  }
  const key = `${project}/live/${causal}/${path}`;
  const stored = await storedPage(env, ctx, key);
  if (stored !== undefined) {
    return page(stored);
  }
  // One render per page at a time; a request for a page being drawn waits for it, and the request that
  // starts it stores it.
  let rendering = drawing.get(key);
  if (!rendering) {
    rendering = render(env, ctx, project, causal, more).finally(() => drawing.delete(key));
    drawing.set(key, rendering);
    ctx.waitUntil(
      rendering
        .then((text) => env.BUCKET.put(key, text, { httpMetadata: { contentType: 'application/json' } }))
        .catch((error) => console.error(`drawing ${key} failed`, error)),
    );
  }
  if (more[0] === 'def' && !drawn) {
    // A definition's source is fixed by its hash, so an earlier head's page differs only in who uses it;
    // a visitor gets that at once while this head's page is drawn, instead of waiting for a cold build.
    const earlier = await earlierPage(env, project, causal, more[1]);
    if (earlier) {
      return new Response(earlier.body, {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=60',
          'x-deus-drawn-at': earlier.causal,
        },
      });
    }
  }
  return page(await rendering);
};

//
// The hub (`/`): every project on this host with its counts, read from each head's summary.
//

/** Raised when a summary gains or changes a field, so summaries drawn before are drawn again once. */
const SUMMARY_VERSION = 2;

const summaryKey = (project, causal) => `${project}/live/${causal}/summary.json`;

/** What the hub shows of a head: its counts by kind and its tasks, from its index (a few hundred bytes, not megabytes). */
const summaryOfIndex = (index) => {
  const kinds = {};
  for (const entry of index.names ?? []) {
    kinds[entry.kind] = (kinds[entry.kind] ?? 0) + 1;
  }
  const meta = index.meta ?? {};
  // What the project is mostly made of, for a card that has no feature map to describe it.
  const sizes = {};
  for (const entry of index.names ?? []) {
    const top = entry.name.includes('.') ? entry.name.slice(0, entry.name.indexOf('.')) : '';
    // `lib.<name>` is a mounted library, not the project's own code (D49).
    if (top && top !== 'lib' && !/\.(Spec|Features|QA)$/.test(entry.name.split('.').slice(0, 2).join('.'))) {
      sizes[top] = (sizes[top] ?? 0) + 1;
    }
  }
  const namespaces = Object.entries(sizes)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([name]) => name);
  const map = (index.features ?? []).find((entry) => entry.document?.endsWith('.Features'))?.document;
  return {
    branch: meta.branch,
    definitions: meta.definitions,
    tasks: meta.tasks,
    open: meta.open,
    features: meta.features ?? 0,
    kinds,
    namespaces,
    summaryVersion: SUMMARY_VERSION,
    ...(map ? { featureMap: map } : {}),
  };
};

/** The project folders in the bucket: a folder with a main head, or an owner folder's subfolders with one. */
const projectFolders = async (bucket) => {
  const folders = [];
  for (const top of await listFolders(bucket, '')) {
    if (await bucket.head(`${top}heads/main`)) {
      folders.push(top.slice(0, -1));
      continue;
    }
    for (const inner of await listFolders(bucket, top)) {
      if (await bucket.head(`${inner}heads/main`)) {
        folders.push(inner.slice(0, -1));
      }
    }
  }
  return folders;
};

const PROJECTS_KEY = 'projects';

/** Every project with its shown head's summary, drawing a summary the first time a head is listed; cached for a minute. */
export const projectSummaries = async (env, ctx) => {
  const cached = await env.CACHE?.get(PROJECTS_KEY);
  if (cached) {
    return JSON.parse(cached);
  }
  const projects = await Promise.all(
    (await projectFolders(env.BUCKET)).map(async (folder) => {
      const shown = await liveHead(env, ctx, folder, 'main');
      if (!shown) {
        return undefined;
      }
      let summary = await storedPage(env, ctx, summaryKey(folder, shown.causal));
      // A summary from before it named namespaces is drawn again from the index.
      if (summary !== undefined && JSON.parse(summary).summaryVersion !== SUMMARY_VERSION) {
        summary = undefined;
      }
      if (summary === undefined) {
        // A head drawn before summaries were kept: read its index once and keep the summary.
        const index = await storedPage(env, ctx, `${folder}/live/${shown.causal}/index.json`);
        if (index === undefined) {
          return { address: addressOfFolder(folder) ?? folder, causal: shown.causal, drawing: true };
        }
        summary = JSON.stringify(summaryOfIndex(JSON.parse(index)));
        await env.BUCKET.put(summaryKey(folder, shown.causal), summary, {
          httpMetadata: { contentType: 'application/json' },
        });
        remember(env, ctx, summaryKey(folder, shown.causal), summary, PAGE_TTL);
      }
      const check = await historyCheckOf(env.BUCKET, folder, shown.causal);
      return {
        address: addressOfFolder(folder) ?? folder,
        causal: shown.causal,
        ...JSON.parse(summary),
        ...(check && !check.ok ? { historyCheck: check } : {}),
      };
    }),
  );
  const listed = projects.filter(Boolean).sort((left, right) => left.address.localeCompare(right.address));
  remember(env, ctx, PROJECTS_KEY, JSON.stringify(listed), HEAD_TTL);
  return listed;
};

/** Seconds KV keeps a branch's shown head: D195 already shows a head up to a minute behind, and 60 s is KV's shortest TTL. */
const HEAD_TTL = 60;
/** Seconds KV keeps a drawn page: a page never changes, so the TTL only bounds what KV holds. */
const PAGE_TTL = 7 * 24 * 3600;

const headCacheKey = (project, branch) => `head:${project}:${branch}`;

/** Writes to the `CACHE` KV namespace when the Worker has one; a failed write only costs a later miss. */
const remember = (env, ctx, key, value, ttl) => {
  if (env.CACHE) {
    ctx.waitUntil(
      env.CACHE.put(key, value, { expirationTtl: ttl }).catch((error) => console.error(`caching ${key} failed`, error)),
    );
  }
};

/** `{ branch, causal, drawing? }` for the head a visitor of `branch` is shown, or undefined without the branch; cached in KV. */
export const liveHead = async (env, ctx, project, branch) => {
  const cached = await env.CACHE?.get(headCacheKey(project, branch));
  if (cached) {
    return JSON.parse(cached);
  }
  const head = await readHead(env, project, branch);
  if (!head) {
    return undefined;
  }
  const shown = await shownHead(env, project, branch, head);
  remember(env, ctx, headCacheKey(project, branch), JSON.stringify(shown), HEAD_TTL);
  return shown;
};

/** A drawn page's text from KV, else from the bucket (and then kept in KV), or undefined when it is not drawn. */
const storedPage = async (env, ctx, key) => {
  const cached = await env.CACHE?.get(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  const stored = await env.BUCKET.get(key);
  if (!stored) {
    return undefined;
  }
  const text = await stored.text();
  remember(env, ctx, key, text, PAGE_TTL);
  return text;
};

/** The head the queue last drew for each branch, under `<project>/live/shown/<branch>`. */
const shownKey = (project, branch) => `${project}/live/shown/${branch}`;
/** How long after a push the last drawn head stands in for it; past that the head is drawn on request. */
const SHOWN_GRACE_MS = 5 * 60_000;

/**
 * The head a visitor is shown: the branch's head once its index is drawn, and until then, for a few minutes
 * after the push, the head drawn last, since drawing a new index in a cold isolate takes half a minute.
 */
export const shownHead = async (env, project, branch, head) => {
  if (await env.BUCKET.head(`${project}/live/${head.causal}/index.json`)) {
    return { branch, causal: head.causal };
  }
  const fresh = head.uploaded && Date.now() - head.uploaded.getTime() < SHOWN_GRACE_MS;
  const shown = fresh ? await env.BUCKET.get(shownKey(project, branch)) : null;
  if (!shown) {
    return { branch, causal: head.causal };
  }
  return { branch, causal: (await shown.text()).trim(), drawing: head.causal };
};

/** The heads whose index was drawn, newest first, so a page missing at one head can come from the last. */
const drawnKey = (project) => `${project}/live/drawn.json`;
const DRAWN_KEPT = 8;

const recordDrawn = async (bucket, project, causal) => {
  const stored = await bucket.get(drawnKey(project));
  const known = stored ? JSON.parse(await stored.text()) : [];
  if (known[0] !== causal) {
    const drawn = [causal, ...known.filter((other) => other !== causal)].slice(0, DRAWN_KEPT);
    await bucket.put(drawnKey(project), JSON.stringify(drawn), { httpMetadata: { contentType: 'application/json' } });
  }
};

/** `page` as the newest earlier drawn head has it, or undefined. */
const earlierPage = async (env, project, causal, page) => {
  const stored = await env.BUCKET.get(drawnKey(project));
  if (!stored) {
    return undefined;
  }
  const drawn = JSON.parse(await stored.text());
  const at = drawn.indexOf(causal);
  // Two earlier heads at most: a page absent from both is new or long unvisited, and is drawn instead.
  for (const other of drawn.slice(at + 1, at + 3)) {
    const found = await env.BUCKET.get(`${project}/live/${other}/def/${page}`);
    if (found) {
      return { causal: other, body: found.body };
    }
  }
  return undefined;
};

/** Draws the main branch head's index, so it is in the bucket before anyone asks; failures are only logged. */
export const warmLive = async (env, ctx, project) => {
  try {
    const head = await readHead(env, project, 'main');
    if (!head) {
      return;
    }
    const response = await live(new Request('https://warm.invalid/'), env, ctx, project, [head.causal, 'index.json'], {
      drawn: true,
    });
    await env.BUCKET.put(shownKey(project, 'main'), head.causal, { httpMetadata: { contentType: 'text/plain' } });
    // Visitors move to the new head now rather than when the cached one expires.
    remember(
      env,
      ctx,
      headCacheKey(project, 'main'),
      JSON.stringify({ branch: 'main', causal: head.causal }),
      HEAD_TTL,
    );
    // The overview links its head's change first.
    await live(new Request('https://warm.invalid/'), env, ctx, project, [head.causal, 'change', `${head.causal}.json`]);
    await checkHistory(env, project, 'main', head.causal);
    const names = JSON.parse(await response.text()).names ?? [];
    // The overview asks for every spec document at once, so those pages are drawn before anyone opens it.
    const documents = [
      ...new Set(
        names.filter((entry) => entry.kind === 'spec').map((entry) => entry.name.slice(0, entry.name.lastIndexOf('.'))),
      ),
    ];
    for (const doc of documents) {
      await live(new Request('https://warm.invalid/'), env, ctx, project, [head.causal, 'doc', `${doc}.json`], {
        drawn: true,
      }).catch((error) => console.error(`drawing ${doc} failed`, error));
    }
    // Every definition's page is drawn too, in chunks a queue consumer finishes, so no visitor waits for one.
    const chunks = [];
    for (let from = 0; from < names.length; from += PAGES_PER_CHUNK) {
      chunks.push({ body: { project, causal: head.causal, from, count: PAGES_PER_CHUNK } });
    }
    if (env.LIVE_QUEUE?.sendBatch && chunks.length > 0) {
      for (let at = 0; at < chunks.length; at += 100) {
        await env.LIVE_QUEUE.sendBatch(chunks.slice(at, at + 100));
      }
    }
  } catch (error) {
    console.error('warming the live explorer failed', error);
  }
};

/** Definition pages one queue message draws: well inside a consumer's CPU time once the site is built. */
const PAGES_PER_CHUNK = 200;

/** Draws the definition pages `from` to `from + count` of a causal's index, skipping those already stored. */
export const warmPages = async (env, ctx, { project, causal, from, count }) => {
  try {
    const index = await env.BUCKET.get(`${project}/live/${causal}/index.json`);
    if (!index) {
      return;
    }
    const names = (JSON.parse(await index.text()).names ?? []).slice(from, from + count);
    const pages = [
      ...new Set(names.map((entry) => (entry.hash.startsWith('#') ? `_${entry.hash.slice(1)}` : entry.hash))),
    ];
    for (const page of pages) {
      if (!(await env.BUCKET.head(`${project}/live/${causal}/def/${page}.json`))) {
        // One page at a time, each drawn here: a consumer drawing pages in parallel would exhaust its memory.
        await live(new Request('https://warm.invalid/'), env, ctx, project, [causal, 'def', `${page}.json`], {
          drawn: true,
        });
      }
    }
  } catch (error) {
    console.error('drawing live explorer pages failed', error);
  }
};

/** Pages being drawn in this isolate, by bucket key. */
const drawing = new Map();

const page = (body) =>
  new Response(body, {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=31536000, immutable' },
  });

const render = async (env, ctx, project, causal, path) => {
  const files = filesAt(env.BUCKET, project, causal);
  await warm(files);
  files.metas = await metasAt(files);
  const before = files.texts.size;
  try {
    return await draw(env, files, project, causal, path);
  } finally {
    // A cold isolate starts from the newest snapshot of what the index read, so it fetches only what changed
    // since; the index reads the head's whole working set, where a definition's page reads a sliver of it.
    if (path[0] === 'index.json' && (files.texts.size > before || (files.loaded ?? 0) > files.touched.size)) {
      ctx.waitUntil(saveSnapshot(files));
    }
  }
};

const draw = async (env, files, project, causal, path) => {
  // The branches are the bucket's heads (D181), so the explorer lists them as a pull would.
  files.branches = await listAll(env.BUCKET, `${project}/heads/`);
  if (path[0] === 'change') {
    const change = path[1].slice(0, -'.json'.length);
    if (!HASH.test(change)) {
      throw new HttpError(404, 'a change is named by its hash');
    }
    // A change page diffs its namespace with its first parent's, which reads both trees node by node.
    await fetchAll(files, [`o${change}`]);
    const node = files.texts.get(`o${change}`);
    const parent = node ? causalFields(node).parents[0] : undefined;
    await Promise.all([prefetchTree(files, change), parent ? prefetchTree(files, parent) : undefined]);
    return run(files, () => explorer.raw.liveChange(ROOT, change));
  }
  const site = await siteOf(files);
  if (path[0] === 'index.json') {
    const chain = await prefetchHistory(files);
    const text = await run(files, () => explorer.raw.liveIndex(site));
    // The next head's walk stops at this causal and reads the rest of the chain in parallel.
    await env.BUCKET.put(chainKey(project, causal), JSON.stringify(chain), {
      httpMetadata: { contentType: 'application/json' },
    });
    await recordDrawn(env.BUCKET, project, causal);
    await env.BUCKET.put(summaryKey(project, causal), JSON.stringify(summaryOfIndex(JSON.parse(text))), {
      httpMetadata: { contentType: 'application/json' },
    });
    return text;
  }
  if (path[0] === 'doc') {
    const doc = await run(files, () => explorer.raw.liveDoc(site, path[1].slice(0, -'.json'.length)));
    if (doc === '') {
      throw new HttpError(404, 'no such spec document');
    }
    return doc;
  }
  const name = path[1].slice(0, -'.json'.length);
  const hash = name.startsWith('_') ? `#${name.slice(1)}` : name;
  return run(files, () => explorer.raw.liveDef(site, hash));
};

/**
 * One `Explorer.site` per project in an isolate, for its latest causal: building it reads every
 * definition, and each page then needs only its own.
 */
const sites = new Map();

const siteOf = (files) => {
  const cached = sites.get(files.project);
  if (cached?.causal === files.causal) {
    return cached.site;
  }
  // Requests that arrive together share one build: the app opens several pages at once, and each
  // build holds every definition, so parallel builds would exhaust the isolate's memory.
  const site = (async () => {
    await prefetchNamespace(files);
    return run(files, () => explorer.raw.site(ROOT));
  })();
  sites.set(files.project, { causal: files.causal, site });
  site.catch(() => {
    if (sites.get(files.project)?.site === site) {
      sites.delete(files.project);
    }
  });
  return site;
};

/** Files of the project's codebase at `causal`, as `Codebase` reads them, kept per isolate. */
const filesByProject = new Map();

const filesAt = (bucket, project, causal) => {
  const known = filesByProject.get(project);
  const same = known?.causal === causal;
  // Objects never change, so a new causal of the same project keeps what the last one's pages read, and only
  // that, so an isolate's memory follows one head rather than every head it has drawn; metadata is rewritten
  // in place (doc comments, a spec block's prose), so it is read again.
  const texts = same ? known.texts : new Map(known ? [...known.texts].filter(([key]) => known.touched.has(key)) : []);
  if (known && !same) {
    dropMetadata(texts);
  }
  const files = { bucket, project, causal, texts, touched: same ? known.touched : new Set(), missing: new Set() };
  filesByProject.set(project, files);
  return files;
};

const dropMetadata = (texts) => {
  for (const key of [...texts.keys()]) {
    if (key.startsWith('m')) {
      texts.delete(key);
    }
  }
};

/**
 * The items of a list's text, each as its own text, strings with their quotes:
 * `(m "a" (meta (doc "x")))` gives `m`, `"a"` and `(meta (doc "x"))`.
 */
const itemsOf = (text) => {
  const items = [];
  let depth = 0;
  let start = -1;
  const close = (end) => {
    if (start >= 0) {
      items.push(text.slice(start, end));
      start = -1;
    }
  };
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (depth === 1 && start < 0 && !/[\s)]/.test(char)) {
      start = at;
    }
    if (char === '"') {
      for (at++; at < text.length && text[at] !== '"'; at++) {
        if (text[at] === '\\') {
          at++;
        }
      }
      if (depth === 1) {
        close(at + 1);
      }
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth === 1) {
        close(at + 1);
      } else if (depth === 0) {
        close(at);
      }
    } else if (depth === 1 && /\s/.test(char)) {
      close(at);
    }
  }
  return items;
};

/** Metadata snapshots read in this isolate, by `<project>@<causal>`; a few heads are drawn at a time. */
const metasByCausal = new Map();
const METAS_KEPT = 4;

/**
 * The metadata of the causal's own snapshot (D134), as a Map from a definition's hash to its metadata's
 * text, or null for a history from before snapshots. The snapshot is objects, so it is right for that
 * causal whenever it is read, unlike the bucket's latest copy of each definition's metadata.
 */
const metasAt = async (files) => {
  const cacheKey = `${files.project}@${files.causal}`;
  if (metasByCausal.has(cacheKey)) {
    return metasByCausal.get(cacheKey);
  }
  await fetchAll(files, [`o${files.causal}`]);
  const node = files.texts.get(`o${files.causal}`);
  const root = node
    ? parseSexp(node)
        .slice(1)
        .find((item) => Array.isArray(item) && item[0] === 'metas')?.[1]?.s
    : undefined;
  let metas = null;
  if (root) {
    metas = new Map();
    // Two levels of sixteen-way nodes over leaves (`Codebase.putMetas`).
    for (let level = [root]; level.length > 0;) {
      await fetchAll(
        files,
        level.map((hash) => `o${hash}`),
      );
      const next = [];
      for (const hash of level) {
        const text = files.texts.get(`o${hash}`);
        if (!text) {
          throw new HttpError(503, `the metadata snapshot #${hash.slice(0, 10)} is in no pack yet`);
        }
        for (const item of itemsOf(text).slice(1)) {
          const [kind, ...rest] = itemsOf(item);
          if (kind === 'sub') {
            next.push(JSON.parse(rest[1]));
          } else if (kind === 'm') {
            metas.set(JSON.parse(rest[0]), rest[1]);
          }
        }
      }
      level = next;
    }
  }
  metasByCausal.set(cacheKey, metas);
  if (metasByCausal.size > METAS_KEPT) {
    metasByCausal.delete(metasByCausal.keys().next().value);
  }
  return metas;
};

/** The pack key a codebase path reads, or undefined for a path that is not an object or metadata. */
const keyOf = (path) => {
  // Builtins are named `#Bool`, so their directory is `#B`, not two hex digits.
  const object = /^\/codebase\/objects\/[^/]{2}\/([^/]+)$/.exec(path);
  if (object) {
    return `o${object[1]}`;
  }
  const meta = /^\/codebase\/meta\/([^/]+)$/.exec(path);
  return meta ? `m${meta[1]}` : undefined;
};

/** The codebase directory the compiled explorer reads; anything not here (results, provenance) is absent. */
const provider = (files) => ({
  read: (path) => {
    if (path === `${ROOT}/HEAD`) {
      return 'main\n';
    }
    if (path === `${ROOT}/branches/main`) {
      return `${files.causal}\n`;
    }
    if (path === `${ROOT}/project`) {
      return `(project (iri ${JSON.stringify(projectIri(files.project))}))\n`;
    }
    const meta = files.metas ? /^\/codebase\/meta\/([^/]+)$/.exec(path) : null;
    // A history node's metadata (who made the change) is in no snapshot but never changes, so it is read
    // from the packs; a definition the snapshot does not name has no metadata at this causal.
    if (meta && (files.metas.has(meta[1]) || !files.texts.get(`o${meta[1]}`)?.startsWith('(causal'))) {
      return files.metas.get(meta[1]);
    }
    const key = keyOf(path);
    if (key === undefined) {
      return undefined;
    }
    const text = files.texts.get(key);
    files.touched.add(key);
    if (text === undefined) {
      files.missing.add(key);
      return undefined;
    }
    return text ?? undefined;
  },
  list: (path) =>
    path === `${ROOT}/branches`
      ? files.branches?.length
        ? files.branches
        : ['main']
      : path === ROOT
        ? ['HEAD', 'branches', 'meta', 'objects', 'project']
        : undefined,
});

/** The IRI a project's explorer is titled with: the toolchain keeps the one its codebase was made with. */
const projectIri = (folder) =>
  folder === 'toolchain' ? 'https://dxos.org/deus/toolchain' : (addressOfFolder(folder) ?? folder);

/**
 * Runs `body` over the files until a pass reads nothing it lacks. A pass that missed a file may have
 * failed or answered wrongly because of it, so only a pass with no misses counts.
 */
const run = async (files, body) => {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    files.missing.clear();
    runtime.provideFiles(provider(files));
    let result;
    let failure;
    try {
      result = body();
    } catch (error) {
      failure = error;
    }
    if (files.missing.size === 0) {
      if (failure) {
        throw failure;
      }
      return result;
    }
    // Shown by `wrangler tail`: a pass that keeps missing a few files names a chain the prefetch should walk.
    console.log(
      `live ${files.project}@${files.causal.slice(0, 10)} pass ${pass}: ${files.missing.size} missing, e.g. ${[...files.missing].slice(0, 3).join(' ')}`,
    );
    await fetchAll(files, [...files.missing]);
  }
  throw new HttpError(503, 'the explorer kept reading new objects; try again');
};

/** Fetches pack entries (`o<hash>` objects, `m<hash>` metadata) in one batch; an absent one is kept as null. */
const fetchAll = async (files, keys) => {
  const todo = [...new Set(keys)].filter((key) => !files.texts.has(key));
  if (todo.length === 0) {
    return;
  }
  const found = await lookupMany(
    files.bucket,
    files.project,
    todo.map((key) => [key.slice(1), key[0] === 'o' ? 1 : 2]),
  );
  for (const key of todo) {
    files.texts.set(key, found.get(`${key[0] === 'o' ? 1 : 2}:${key.slice(1)}`) ?? null);
  }
};

/**
 * Reads the causal's namespace tree and every entry's object and metadata before the first pass:
 * `Codebase.readNamespace` stops at the first node it lacks, so without this a pass would find one node.
 */
const prefetchNamespace = async (files) => {
  await fetchAll(files, [`o${files.causal}`]);
  const node = files.texts.get(`o${files.causal}`);
  if (!node) {
    throw new HttpError(404, `the causal ${files.causal} is in no pack yet`);
  }
  const fields = parseSexp(node).slice(1);
  const field = (name) => fields.find((item) => Array.isArray(item) && item[0] === name)?.[1]?.s;
  const hashes = new Set();
  let level = [field('ns')].filter(Boolean);
  while (level.length > 0) {
    await fetchAll(
      files,
      level.map((hash) => `o${hash}`),
    );
    const next = [];
    for (const hash of level) {
      const text = files.texts.get(`o${hash}`);
      for (const item of text ? parseSexp(text).slice(1) : []) {
        if (!Array.isArray(item)) {
          continue;
        }
        if (item[0] === 'part' || item[0] === 'sub') {
          next.push(item[item.length - 1].s);
        } else if (item[0] === 'n' && Array.isArray(item[2])) {
          const hash = item[2][1]?.s;
          if (hash && (HASH.test(hash) || MEMBER.test(hash) || BUILTIN.test(hash))) {
            hashes.add(hash);
          }
        }
      }
    }
    level = next;
  }
  const snapshots = ['tasks', 'comments'].map(field).filter(Boolean);
  await fetchAll(files, [
    // With a metadata snapshot (`metasAt`), metadata is read from it instead.
    ...[...hashes].flatMap((hash) => (files.metas ? [`o${hash}`] : [`o${hash}`, `m${hash}`])),
    ...snapshots.map((hash) => `o${hash}`),
  ]);
  // `Tasks.current` and `Comments.current` stop at the first item they lack, so every item is read now.
  await fetchAll(
    files,
    snapshots.flatMap((hash) =>
      [...(files.texts.get(`o${hash}`) ?? '').matchAll(/"([0-9a-f]{64})"/g)].map((match) => `o${match[1]}`),
    ),
  );
};

/** How many changes back the explorer's log reads (`Explorer.historyLimit`). */
const HISTORY = 1000;

const chainKey = (project, causal) => `${project}/live/${causal}/chain.json`;

/** The fields of a history node: `ns`, `parents`, `tasks`, `prior`, `comments`, `metas`, `at`. */
const causalFields = (text) => {
  const fields = parseSexp(text).slice(1);
  const field = (name) => fields.find((item) => Array.isArray(item) && item[0] === name);
  return {
    parents: (field('parents') ?? []).slice(1).map((item) => item.s),
    snapshots: ['tasks', 'prior', 'comments']
      .map((name) => field(name)?.[1]?.s)
      .filter((hash) => hash && HASH.test(hash)),
  };
};

/**
 * Reads the first-parent chain the log and task histories walk (`Codebase.history`), and the task,
 * record and comment snapshots each node points at. The walk is one lookup per node, so it stops at
 * the first causal whose index stored its chain, and reads the rest of that chain all at once.
 * Returns the chain from `causal`.
 */
const prefetchHistory = async (files) => {
  const chain = [];
  let at = files.causal;
  while (at && chain.length < HISTORY) {
    const [stored] = await Promise.all([
      at === files.causal ? undefined : files.bucket.get(chainKey(files.project, at)),
      fetchAll(files, [`o${at}`]),
    ]);
    if (stored) {
      const rest = JSON.parse(await stored.text()).slice(0, HISTORY - chain.length);
      await fetchAll(
        files,
        rest.map((hash) => `o${hash}`),
      );
      chain.push(...rest);
      break;
    }
    const text = files.texts.get(`o${at}`);
    if (!text) {
      break;
    }
    chain.push(at);
    at = causalFields(text).parents[0];
  }
  await fetchAll(
    files,
    chain.flatMap((hash) => {
      const text = files.texts.get(`o${hash}`);
      return text ? causalFields(text).snapshots.map((snapshot) => `o${snapshot}`) : [];
    }),
  );
  return chain;
};

//
// Push checks (D201): what the Worker verifies about a head after a push moved the branch to it.
//

const checkKey = (project, causal) => `${project}/checks/${causal}.json`;

/** Parents a history check walks before it gives up: far more than any push adds. */
const CHECK_LIMIT = 5000;

/**
 * Whether `causal` descends from the head the branch had before the push that moved it there, by every
 * parent, not only the first: a push claims its base, and this is where the claim is verified. The verdict
 * is kept at `<project>/checks/<causal>.json`; a head that lost the previous one is logged loudly, and
 * `deus restore` brings the lost names back from the head log.
 */
export const checkHistory = async (env, project, branch, causal) => {
  const entry = (await listAll(env.BUCKET, headLogKey(project, branch))).find((key) => key.endsWith(`-${causal}`));
  const logged = entry ? await env.BUCKET.get(`${headLogKey(project, branch)}${entry}`) : null;
  const previous = logged ? JSON.parse(await logged.text()).previous : null;
  let verdict;
  if (!previous) {
    verdict = { check: 'history', causal, ok: true, why: 'the branch had no head before' };
  } else {
    const files = filesAt(env.BUCKET, project, causal);
    const seen = new Set();
    let level = [causal];
    let found = false;
    while (level.length > 0 && !found && seen.size < CHECK_LIMIT) {
      level.forEach((hash) => seen.add(hash));
      await fetchAll(
        files,
        level.map((hash) => `o${hash}`),
      );
      const next = [];
      for (const hash of level) {
        const text = files.texts.get(`o${hash}`);
        for (const parent of text ? causalFields(text).parents : []) {
          found ||= parent === previous;
          if (!seen.has(parent)) {
            next.push(parent);
          }
        }
      }
      level = [...new Set(next)];
    }
    verdict = {
      check: 'history',
      causal,
      previous,
      ok: found || previous === causal,
      why: found
        ? 'descends from the previous head'
        : seen.size >= CHECK_LIMIT
          ? `the previous head is not within ${CHECK_LIMIT} ancestors`
          : 'does not descend from the previous head: the push dropped its history',
    };
    if (!verdict.ok) {
      console.error(
        `push check failed for ${project} ${branch} #${causal.slice(0, 10)}: ${verdict.why} #${previous.slice(0, 10)}`,
      );
    }
  }
  await env.BUCKET.put(checkKey(project, causal), JSON.stringify(verdict), {
    httpMetadata: { contentType: 'application/json' },
  });
  return verdict;
};

/** The history check of a head, if one ran. */
export const historyCheckOf = async (bucket, project, causal) => {
  const stored = await bucket.get(checkKey(project, causal));
  return stored ? JSON.parse(await stored.text()) : undefined;
};

/** Where an isolate keeps everything it read for a project, so the next cold one reads it at once. */
const snapshotKey = (project) => `${project}/live/files.json.gz`;

/** Fills an empty isolate's files from the project's snapshot, when there is one. */
const warm = async (files) => {
  if (files.texts.size > 0) {
    return;
  }
  const object = await files.bucket.get(snapshotKey(files.project));
  if (!object) {
    return;
  }
  const text = await new Response(
    new Blob([await new Response(object.body).arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip')),
  ).text();
  // `{ causal, entries }`; a bare list predates metadata being kept apart, and counts as another causal.
  const snapshot = JSON.parse(text);
  const { causal, entries } = Array.isArray(snapshot) ? { causal: undefined, entries: snapshot } : snapshot;
  for (const [key, value] of entries) {
    if (!files.texts.has(key) && (causal === files.causal || !key.startsWith('m'))) {
      files.texts.set(key, value);
    }
  }
  files.loaded = entries.length;
};

/**
 * Writes what the isolate has read for the project: objects never change, so they are never wrong, only
 * short; metadata is kept with the causal it was read at and used only for that one.
 */
const saveSnapshot = async (files) => {
  // What this head's pages read, not everything earlier heads did, or the snapshot grows with every push.
  const entries = [...files.texts].filter(([key, value]) => value !== null && files.touched.has(key));
  const body = await new Response(
    new Blob([JSON.stringify({ causal: files.causal, entries })]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();
  await files.bucket.put(snapshotKey(files.project), body, { httpMetadata: { contentType: 'application/gzip' } });
};

/** Reads the namespace tree of history node `causal`, level by level: its nodes, not the definitions they name. */
const prefetchTree = async (files, causal) => {
  await fetchAll(files, [`o${causal}`]);
  const node = files.texts.get(`o${causal}`);
  const root =
    node &&
    parseSexp(node)
      .slice(1)
      .find((item) => Array.isArray(item) && item[0] === 'ns')?.[1]?.s;
  let level = root ? [root] : [];
  while (level.length > 0) {
    await fetchAll(
      files,
      level.map((hash) => `o${hash}`),
    );
    level = level.flatMap((hash) => {
      const text = files.texts.get(`o${hash}`);
      return (text ? parseSexp(text).slice(1) : [])
        .filter((item) => Array.isArray(item) && (item[0] === 'part' || item[0] === 'sub'))
        .map((item) => item[item.length - 1].s);
    });
  }
};
