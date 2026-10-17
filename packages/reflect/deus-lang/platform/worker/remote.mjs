//
// Copyright 2026 DXOS.org
//

// The replication API (D164): what `deus push` and `deus pull` talk to when a remote is an
// `https://…/v1/@owner/project` URL (D184; `/v1/<folder>` for projects older than addresses). It maps one to one onto the CLI's `Remote` ability, over the
// bucket binding, so no client needs R2 credentials. Reads are open; every write carries an API
// key whose row in the `DB` binding (D1) grants it a scope for the project.

import { addressOfFolder, grants, isGrantable, projectAt } from './address.mjs';
import * as heads from './gen/heads.js';
import * as keys from './gen/keys.js';
import { live, projectSummaries } from './live.mjs';
import { nameAt, names, objects, packs } from './packs.mjs';

/** `<level>-<sha256>`, the name of an immutable bundle (D50, D91). */
const BUNDLE = /^[0-9]{1,3}-[0-9a-f]{64}$/;

/** A key segment: no empty, dot-only or separator-bearing parts, so a key cannot leave its folder. */
const SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,199}$/;

/** The folders beside the bundles, each written under the scope of the same name. */
export const FOLDERS = ['assets', 'inbox', 'site', 'events'];

/** The folder a push writes its test and theorem results to (task b160627d); writing it takes the `push` scope. */
export const RESULTS = 'results';

/** Every scope a key can hold; `admin` implies the others and also manages keys. */
export const SCOPES = ['push', 'compact', ...FOLDERS, 'admin'];

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Answers `/v1/…`. */
export const remoteApi = async (request, env, ctx, url) => {
  const parts = url.pathname.split('/').slice(2);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    return json({ service: 'deus', api: 1, scopes: SCOPES });
  }
  if (parts[0] === 'keys') {
    return keysApi(request, env, ctx, parts.slice(1));
  }
  // `_` starts no project folder or owner, so the listing cannot shadow a project.
  if (parts[0] === '_projects' && parts.length === 1) {
    if (request.method !== 'GET') {
      throw new HttpError(405, 'method not allowed');
    }
    return json(env.BUCKET ? await projectSummaries(env, ctx) : []);
  }
  const target = projectAt(parts);
  if (!target) {
    throw new HttpError(404, 'no such project: a project is /v1/@owner/project');
  }
  // Every handler below works on the project's folder, which is all the bucket knows of it.
  const project = target.folder;
  const [area, ...rest] = parts.slice(target.used);
  if (!env.BUCKET) {
    throw new HttpError(503, 'this worker has no bucket');
  }
  if (area === 'bundles') {
    return bundles(request, env, ctx, project, rest);
  }
  if (area === 'packs') {
    return packs(request, env, ctx, project, rest);
  }
  if (area === 'objects' || area === 'meta') {
    return objects(request, env, project, area, rest);
  }
  if (area === 'names') {
    return names(request, env, project, rest);
  }
  if (area === 'live') {
    return live(request, env, ctx, project, rest);
  }
  if (area === 'headlog') {
    return headLog(request, env, project, rest);
  }
  if (area === 'files' && rest[0] === 'packs') {
    // `Remote.keys`, `download` and `upload` reach packs through the files API the CLI already speaks.
    return packs(request, env, ctx, project, rest.slice(1));
  }
  if (area === 'files' && (FOLDERS.includes(rest[0]) || rest[0] === RESULTS)) {
    return files(request, env, ctx, project, rest[0], rest.slice(1));
  }
  throw new HttpError(404, 'not found');
};

//
// Bundles.
//

const bundles = async (request, env, ctx, project, rest) => {
  const folder = `${project}/bundles/`;
  if (rest.length === 0 || (rest.length === 1 && rest[0] === '')) {
    if (request.method !== 'GET') {
      throw new HttpError(405, 'method not allowed');
    }
    return lines(await listAll(env.BUCKET, folder));
  }
  const [name] = rest;
  if (rest.length !== 1 || !BUNDLE.test(name)) {
    throw new HttpError(404, 'not a bundle name');
  }
  const key = folder + name;
  if (request.method === 'GET') {
    const object = await env.BUCKET.get(key);
    if (!object) {
      throw new HttpError(404, 'no such bundle');
    }
    // A bundle never changes, so a cached copy is always right.
    return new Response(object.body, {
      headers: { 'content-type': 'application/gzip', 'cache-control': 'public, max-age=31536000, immutable' },
    });
  }
  if (request.method === 'PUT') {
    const logged = await authorize(request, env, ctx, 'push', project);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (await env.BUCKET.head(key)) {
      return logged(json({ bundle: name, stored: false }, 200));
    }
    if (env.VERIFY_BUNDLES !== '0') {
      const text = await gunzip(bytes).catch(() => {
        throw new HttpError(400, 'a bundle is sent gzipped');
      });
      if ((await sha256(text)) !== name.slice(name.indexOf('-') + 1)) {
        throw new HttpError(400, 'the bundle does not hash to its name');
      }
    }
    const refused = await moveHead(request, env, project, logged);
    if (refused) {
      return logged(refused);
    }
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: 'application/gzip' } });
    return logged(json({ bundle: name, stored: true }, 201));
  }
  if (request.method === 'DELETE') {
    // Only compaction deletes a bundle, once strata hold everything it lists (D73). The bundle moves to
    // the trash rather than vanishing, so a compaction bug costs storage, never history (DataSafety.Spec).
    const logged = await authorize(request, env, ctx, 'compact', project);
    await toTrash(env.BUCKET, project, 'bundles', name);
    return logged(json({ bundle: name, deleted: true }));
  }
  throw new HttpError(405, 'method not allowed');
};

/**
 * A branch's head and the etag that moves it, from the bucket (`Worker.Heads.readStored`, in DEUS). Heads moved
 * before D181 are D1 rows: reading one costs no write, and the first push after D181 copies it to the bucket.
 */
export const readHead = async (env, project, branch) => {
  const stored = await heads.readStored(env.BUCKET, project, branch);
  if (stored) {
    return stored;
  }
  const row = await env.DB?.prepare('select causal from heads where project = ? and branch = ?')
    .bind(project, branch)
    .first();
  return row ? { causal: row.causal } : undefined;
};

/** Moves the head from `current` (or creates it), or returns false when another push moved it first (`Worker.Heads.writeHead`). */
const writeHead = (env, project, branch, causal, current) =>
  heads.writeHead(env.BUCKET, project, branch, causal, current?.etag);

/**
 * Moves the branch head a push claims, or answers why not (D167). The bundle is stored only after
 * the head moves, and a retry of the same push finds the head already there, so a failed store
 * never blocks the branch. Only compaction, which re-claims existing heads, may omit the claim.
 * The compare-and-swap is an R2 conditional write (D181): D1's Free plan allows 100,000 row writes
 * a day, which explorer uploads used up, and a push then could not move its head.
 */
const moveHead = async (request, env, project, logged) => {
  const header = request.headers.get('x-deus-claim');
  if (!header) {
    return logged.scopes.includes('compact') || logged.scopes.includes('admin')
      ? undefined
      : json({ error: 'a push must name the head it builds on (x-deus-claim); update deus by merging #13952' }, 428);
  }
  // The claim and what it may do are `Worker.Heads.parseClaim` and `verdict`, in DEUS (platform/worker/deus/heads.deus).
  const claim = heads.parseClaim(header);
  if (!claim) {
    throw new HttpError(400, 'x-deus-claim is `<branch> <head> <base>[,<base>…]`');
  }
  const { branch, head } = claim;
  const current = await readHead(env, project, branch);
  const required = current && current.causal !== head ? await requiredEpoch(env.BUCKET, project, current.causal) : 0;
  // A DEUS `Int` is 32 bits, so a number past it would wrap; such an epoch counts as none.
  const claimed = Number(request.headers.get('x-deus-epoch') ?? '0');
  const sent = Number.isInteger(claimed) && claimed >= 0 && claimed < 2 ** 31 ? claimed : 0;
  const verdict = heads.verdict(current?.causal, claim, required, sent);
  if (verdict === 'same') {
    return undefined;
  }
  if (verdict === 'epoch') {
    return json(
      {
        error: `${branch} needs a deus with data-safety epoch ${required} (Safety.epoch) or newer, and this one has ${sent}: its merge or push may lose data; update deus by merging #13952, then push again`,
        epoch: required,
      },
      426,
    );
  }
  if (verdict === 'write' && (await writeHead(env, project, branch, head, current))) {
    await logHead(env, project, branch, head, current?.causal, logged.keyId);
    return undefined;
  }
  const latest = await readHead(env, project, branch);
  return json(
    {
      error: `${branch} moved to #${(latest?.causal ?? '').slice(0, 10)} since you pulled; run \`deus pull\` and \`deus merge\`, then push again`,
      head: latest?.causal ?? null,
    },
    409,
  );
};

//
// Data safety (DataSafety.Spec): the epoch a codebase asks of the CLIs that push to it, and the log of every head a branch had.
//

/** Per bucket: the epoch each history node's namespace asks for; a node never changes, so neither does its answer. */
const epochs = new WeakMap();

/**
 * The data-safety epoch history node `causal` asks for: its `Safety.epoch` term, or 0 without one.
 * A head that is in no pack yet asks for nothing, so a push is never stuck behind the packs.
 */
export const requiredEpoch = async (bucket, project, causal) => {
  let known = epochs.get(bucket);
  if (!known) {
    known = new Map();
    epochs.set(bucket, known);
  }
  const key = `${project}/${causal}`;
  if (known.has(key)) {
    return known.get(key);
  }
  const found = await nameAt(bucket, project, causal, 'Safety.epoch').catch((error) => {
    if (error instanceof HttpError && error.status === 404) {
      return null;
    }
    throw error;
  });
  if (found === null) {
    return 0;
  }
  const epoch = heads.epochOf(found?.text ?? '');
  known.set(key, epoch);
  return epoch;
};

/** Where the log of a branch's heads lives: one immutable object per move, named by time and head (`Worker.Heads`). */
export const headLogKey = (project, branch) => heads.headLogKey(project, branch);

/** Records that `branch` moved to `causal`, so every head it ever had stays findable even after compaction. */
const logHead = (env, project, branch, causal, previous, keyId) =>
  heads.logHead(env.BUCKET, project, branch, causal, previous, keyId);

/** `/v1/<project>/headlog/<branch>`: every head the branch had, oldest first, one `<ms>-<causal>` per line; never written by clients. */
const headLog = async (request, env, project, rest) => {
  if (request.method !== 'GET') {
    throw new HttpError(405, 'the head log is written only by pushes');
  }
  const branch = rest
    .filter((segment) => segment !== '')
    .map(decodeURIComponent)
    .join('/');
  if (!heads.isBranch(branch)) {
    throw new HttpError(404, 'the head log is read as /headlog/<branch>');
  }
  return lines((await listAll(env.BUCKET, headLogKey(project, branch))).filter((name) => heads.isLogged(name)));
};

//
// Files beside the bundles: assets, the explorer's inbox and site, analytics events.
//

const files = async (request, env, ctx, project, folder, rest) => {
  const under = `${project}/${folder}/`;
  if (rest.length === 0 || (rest.length === 1 && rest[0] === '')) {
    if (request.method !== 'GET') {
      throw new HttpError(405, 'method not allowed');
    }
    return lines(await listAll(env.BUCKET, under));
  }
  if (!rest.every((segment) => SEGMENT.test(segment))) {
    throw new HttpError(400, 'invalid key');
  }
  const key = under + rest.join('/');
  if (request.method === 'GET') {
    const object = await env.BUCKET.get(key);
    if (!object) {
      throw new HttpError(404, 'not found');
    }
    return new Response(object.body, {
      headers: {
        'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  }
  if (request.method === 'PUT') {
    const logged = await authorize(request, env, ctx, folder === RESULTS ? 'push' : folder, project);
    const type = request.headers.get('content-type') ?? 'application/octet-stream';
    await env.BUCKET.put(key, new Uint8Array(await request.arrayBuffer()), { httpMetadata: { contentType: type } });
    return logged(json({ key: rest.join('/'), stored: true }, 201));
  }
  if (request.method === 'DELETE') {
    const logged = await authorize(request, env, ctx, folder === RESULTS ? 'push' : folder, project);
    // Assets are what comments and tasks attach; the site is rebuilt from the codebase, so it needs no trash.
    if (folder === 'site') {
      await env.BUCKET.delete(key);
    } else {
      await toTrash(env.BUCKET, project, folder, rest.join('/'));
    }
    return logged(json({ key: rest.join('/'), deleted: true }));
  }
  throw new HttpError(405, 'method not allowed');
};

/**
 * Deletes `<project>/<folder>/<name>` by moving it to `<project>/trash/<folder>/<name>`, which no client
 * can write or delete; R2 has no rename, so it is a copy, then the delete.
 */
export const toTrash = async (bucket, project, folder, name) => {
  const key = `${project}/${folder}/${name}`;
  const object = await bucket.get(key);
  if (!object) {
    return;
  }
  await bucket.put(
    `${project}/trash/${folder}/${name}`,
    new Uint8Array(await new Response(object.body).arrayBuffer()),
    {
      httpMetadata: object.httpMetadata,
      customMetadata: { deletedAt: String(Date.now()) },
    },
  );
  await bucket.delete(key);
};

/** The folders directly under `prefix` (`toolchain/`, `dxos/`), following R2's pages. */
export const listFolders = async (bucket, prefix) => {
  const folders = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor, delimiter: '/' });
    folders.push(...(page.delimitedPrefixes ?? []));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return folders.sort();
};

/** Every key under `prefix`, without it, following R2's pages. */
export const listAll = async (bucket, prefix) => {
  const keys = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor });
    keys.push(...page.objects.map((object) => object.key.slice(prefix.length)));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys.sort();
};

//
// API keys (D1).
//

/** Where an authorized write's audit entry goes: one object per write, by day, under a folder no project can have. */
export const auditKey = (at, keyId) =>
  `_audit/${new Date(at).toISOString().slice(0, 10)}/${at}-${keyId}-${crypto.randomUUID().slice(0, 8)}.json`;

/**
 * Checks the request's key for `scope` on `project`. Returns `logged`, which the caller passes its
 * response through so the write is recorded in the audit table with the status it got.
 */
export const authorize = async (request, env, ctx, scope, project) => {
  // How a key is named and what its scopes allow are `Worker.Keys`, in DEUS (platform/worker/deus/keys.deus).
  const named = keys.parseKey(request.headers.get('authorization') ?? '');
  if (!named) {
    throw new HttpError(401, 'writes need an API key: Authorization: Bearer deus_<id>_<secret>');
  }
  if (!env.DB) {
    throw new HttpError(503, 'this worker has no key database');
  }
  const { id, secret } = named;
  const row = await env.DB.prepare('select * from api_keys where id = ?').bind(id).first();
  if (!row || !sameText(row.secret_hash, await sha256(new TextEncoder().encode(secret)))) {
    throw new HttpError(401, 'unknown API key');
  }
  const now = Date.now();
  if (row.revoked_at) {
    throw new HttpError(401, 'this API key was revoked');
  }
  if (row.expires_at && row.expires_at < now) {
    throw new HttpError(401, 'this API key has expired');
  }
  const scopes = JSON.parse(row.scopes);
  if (!keys.allows(scopes, scope)) {
    throw new HttpError(403, `this API key lacks the ${scope} scope`);
  }
  const projects = JSON.parse(row.projects);
  // A key names projects by address, by owner (`@dxos/*`) or, from before addresses, by folder.
  if (project && !grants(projects, project)) {
    throw new HttpError(403, `this API key cannot write to ${addressOfFolder(project) ?? project}`);
  }
  const url = new URL(request.url);
  // Written after the response, so logging never slows or fails a write. The audit log is objects in
  // the bucket, not D1 rows, so it cannot use up the key database's writes (D217); explorer files are
  // not audited, and `last_used_at` moves at most hourly.
  const logged = (response) => {
    if (scope !== 'site' && env.BUCKET) {
      const entry = { at: now, key: id, method: request.method, path: url.pathname, status: response.status };
      ctx.waitUntil(
        env.BUCKET.put(auditKey(now, id), JSON.stringify(entry), {
          httpMetadata: { contentType: 'application/json' },
        }).catch((error) => console.error(error)),
      );
    }
    if (!row.last_used_at || row.last_used_at < now - 3600 * 1000) {
      ctx.waitUntil(
        env.DB.prepare('update api_keys set last_used_at = ? where id = ?')
          .bind(now, id)
          .run()
          .catch((error) => console.error(error)),
      );
    }
    return response;
  };
  return Object.assign(logged, { keyId: id, scopes: scopes.includes('admin') ? SCOPES : scopes });
};

/** `/v1/keys`: list, mint and revoke keys; only an `admin` key may. */
const keysApi = async (request, env, ctx, rest) => {
  const logged = await authorize(request, env, ctx, 'admin');
  if (rest.length === 0 && request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'select id, label, scopes, projects, created_at, expires_at, revoked_at, last_used_at from api_keys order by created_at',
    ).all();
    return json(results.map((row) => ({ ...row, scopes: JSON.parse(row.scopes), projects: JSON.parse(row.projects) })));
  }
  if (rest.length === 0 && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : '';
    const scopes = Array.isArray(body.scopes) ? body.scopes : [];
    const projects = body.projects === undefined ? '*' : body.projects;
    // The DEUS rule reads scopes as text, which would turn `["push"]` into "push", so anything else is refused here.
    const problem = scopes.every((scope) => typeof scope === 'string')
      ? keys.mintProblem(label, scopes, SCOPES)
      : `scopes are some of ${SCOPES.join(', ')}`;
    if (problem !== undefined) {
      throw new HttpError(400, problem);
    }
    if (projects !== '*' && !(Array.isArray(projects) && projects.every(isGrantable))) {
      throw new HttpError(400, 'projects is "*" or a list of project addresses (@owner/project or @owner/*)');
    }
    const days = Number(body.expiresInDays);
    const minted = await mintKey();
    const now = Date.now();
    await env.DB.prepare(
      'insert into api_keys (id, secret_hash, label, scopes, projects, created_at, expires_at) values (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        minted.id,
        minted.secretHash,
        label,
        JSON.stringify(scopes),
        JSON.stringify(projects),
        now,
        days > 0 ? now + days * 24 * 3600 * 1000 : null,
      )
      .run();
    return logged(json({ id: minted.id, key: minted.key, label, scopes, projects }, 201));
  }
  if (rest.length === 1 && request.method === 'DELETE') {
    const { meta } = await env.DB.prepare('update api_keys set revoked_at = ? where id = ? and revoked_at is null')
      .bind(Date.now(), rest[0])
      .run();
    if (!meta?.changes) {
      throw new HttpError(404, 'no such active key');
    }
    return logged(json({ id: rest[0], revoked: true }));
  }
  throw new HttpError(405, 'method not allowed');
};

/** A new key: the secret is shown once and only its SHA-256 is kept (it is random, not a password). */
export const mintKey = async () => {
  const id = hex(crypto.getRandomValues(new Uint8Array(8)));
  const secret = hex(crypto.getRandomValues(new Uint8Array(32)));
  return { id, key: `deus_${id}_${secret}`, secretHash: await sha256(new TextEncoder().encode(secret)) };
};

//
// Helpers.
//

const gunzip = async (bytes) =>
  new Uint8Array(
    await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),
  );

export const sha256 = async (bytes) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));

/** Compares in time independent of where the texts differ. */
const sameText = (left, right) => {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index++) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
};

/** A listing is one name per line, which the CLI reads without a JSON parser. */
const lines = (names) =>
  new Response(names.map((name) => `${name}\n`).join(''), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });

export const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
