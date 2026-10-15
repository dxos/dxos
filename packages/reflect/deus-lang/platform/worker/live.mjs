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

import { addressOfFolder } from './address.mjs';
import * as runtime from './gen/deus-runtime.mjs';
import * as explorer from './gen/explorer-live.js';
import { lookup, parseSexp } from './packs.mjs';
import { HttpError, json, listAll, readHead } from './remote.mjs';

const ROOT = '/codebase';
const HASH = /^[0-9a-f]{64}$/;
const BUILTIN = /^#[A-Za-z][A-Za-z0-9_.]{0,99}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/;
const PAGE = /^(_[A-Za-z][A-Za-z0-9_.]{0,99}|[0-9a-f]{64})\.json$/;
/** Passes a run may take before it gives up: each one fetches everything the last one missed. */
const MAX_PASSES = 30;
/** Pack lookups in flight at once while a pass's misses are fetched. */
const PARALLEL = 64;

/** `/v1/<project>/live/…`. */
export const live = async (request, env, ctx, project, rest) => {
  if (request.method !== 'GET') {
    throw new HttpError(405, 'method not allowed');
  }
  const [first, ...more] = rest.map(decodeURIComponent);
  if (!HASH.test(first ?? '')) {
    const branch = [first, ...more].join('/');
    if (!BRANCH.test(branch)) {
      throw new HttpError(404, 'a live explorer is /live/<branch> or /live/<causal>/…');
    }
    const head = await readHead(env, project, branch);
    if (!head) {
      throw new HttpError(404, `no branch ${branch}`);
    }
    return json({ branch, causal: head.causal });
  }
  const causal = first;
  const path = more.join('/');
  if (
    path !== 'index.json' &&
    !(more.length === 2 && (more[0] === 'def' || more[0] === 'change') && PAGE.test(more[1]))
  ) {
    throw new HttpError(404, 'not found');
  }
  const key = `${project}/live/${causal}/${path}`;
  const stored = await env.BUCKET.get(key);
  if (stored) {
    return page(stored.body);
  }
  const text = await render(env, ctx, project, causal, more);
  ctx.waitUntil(env.BUCKET.put(key, text, { httpMetadata: { contentType: 'application/json' } }));
  return page(text);
};

const page = (body) =>
  new Response(body, {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=31536000, immutable' },
  });

const render = async (env, ctx, project, causal, path) => {
  const files = filesAt(env.BUCKET, project, causal);
  await warm(files);
  const before = files.texts.size;
  try {
    return await draw(env, files, project, causal, path);
  } finally {
    // A cold isolate starts from the newest snapshot of what was read, so it fetches only what changed since.
    if (files.texts.size > before) {
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
    return text;
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

const siteOf = async (files) => {
  const cached = sites.get(files.project);
  if (cached?.causal === files.causal) {
    return cached.site;
  }
  await prefetchNamespace(files);
  const site = await run(files, () => explorer.raw.site(ROOT));
  sites.set(files.project, { causal: files.causal, site });
  return site;
};

/** Files of the project's codebase at `causal`, as `Codebase` reads them, kept per isolate. */
const filesByProject = new Map();

const filesAt = (bucket, project, causal) => {
  const known = filesByProject.get(project);
  // Objects never change, so a new causal of the same project keeps everything read for the last one.
  const texts = known?.texts ?? new Map();
  const files = { bucket, project, causal, texts, missing: new Set() };
  filesByProject.set(project, files);
  return files;
};

/** The pack key a codebase path reads, or undefined for a path that is not an object or metadata. */
const keyOf = (path) => {
  const object = /^\/codebase\/objects\/[0-9a-f]{2}\/([^/]+)$/.exec(path);
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
    const key = keyOf(path);
    if (key === undefined) {
      return undefined;
    }
    const text = files.texts.get(key);
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

/** Fetches pack entries (`o<hash>` objects, `m<hash>` metadata), `PARALLEL` at a time; an absent one is kept as null. */
const fetchAll = async (files, keys) => {
  const queue = keys.filter((key) => !files.texts.has(key));
  const worker = async () => {
    while (queue.length > 0) {
      const key = queue.pop();
      const text = await lookup(files.bucket, files.project, key.slice(1), key[0] === 'o' ? 1 : 2);
      files.texts.set(key, text ?? null);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
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
          if (hash && (HASH.test(hash) || BUILTIN.test(hash))) {
            hashes.add(hash);
          }
        }
      }
    }
    level = next;
  }
  const snapshots = ['tasks', 'comments'].map(field).filter(Boolean);
  await fetchAll(files, [
    ...[...hashes].flatMap((hash) => [`o${hash}`, `m${hash}`]),
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
  for (const [key, value] of JSON.parse(text)) {
    if (!files.texts.has(key)) {
      files.texts.set(key, value);
    }
  }
};

/** Writes what the isolate has read for the project: objects never change, so a snapshot is never wrong, only short. */
const saveSnapshot = async (files) => {
  const entries = [...files.texts].filter(([, value]) => value !== null);
  const body = await new Response(
    new Blob([JSON.stringify(entries)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();
  await files.bucket.put(snapshotKey(files.project), body, { httpMetadata: { contentType: 'application/gzip' } });
};
