//
// Copyright 2026 DXOS.org
//

// The replication API (D164): what `deus push` and `deus pull` talk to when a remote is an
// `https://…/v1/@owner/project` URL (D184; `/v1/<folder>` for projects older than addresses). It maps one to one onto the CLI's `Remote` ability, over the
// bucket binding, so no client needs R2 credentials. Reads are open; every write carries an API
// key whose row in the `DB` binding (D1) grants it a scope for the project.

import { projectAt } from './address.mjs';
import * as bundlesApi from './gen/bundles.js';
import * as filesApi from './gen/files.js';
import * as heads from './gen/heads.js';
import * as keyAdminApi from './gen/keyadmin.js';
import * as keys from './gen/keys.js';
import * as paths from './gen/paths.js';
import { live, projectSummaries } from './live.mjs';
import { nameAt, names, objects, packs } from './packs.mjs';

/** The folders beside the bundles, each written under the scope of the same name; which a request may name, and the
 * scope that writes each, are `Worker.Paths` in DEUS (platform/worker/deus/paths.deus). */
export const FOLDERS = ['assets', 'inbox', 'site', 'events'];

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
  if (area === 'files' && paths.isFolder(rest[0] ?? '')) {
    return files(request, env, ctx, project, rest[0], rest.slice(1));
  }
  throw new HttpError(404, 'not found');
};

//
// Bundles.
//

/** `/v1/<project>/bundles/…` is `Worker.Bundles.serve`, in DEUS (platform/worker/deus/bundles.deus). */
const bundles = (request, env, ctx, project, rest) =>
  bundlesApi.serve(
    request,
    env.BUCKET,
    project,
    rest,
    env.VERIFY_BUNDLES !== '0',
    (scope) => authorize(request, env, ctx, scope, project),
    (logged) => moveHead(request, env, project, logged),
  );

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

/**
 * Moves the branch head a push claims, or answers why not (D167): `Worker.Heads.gate`, in DEUS
 * (platform/worker/deus/heads.deus). The bundle is stored only after the head moves, and a retry of the same push
 * finds the head already there, so a failed store never blocks the branch. The compare-and-swap is an R2 conditional
 * write (D181); heads are read through `readHead` (which knows the D1 heads from before D181) and epochs through
 * `requiredEpoch` (which caches).
 */
const moveHead = (request, env, project, logged) =>
  heads.gate(
    request,
    env.BUCKET,
    project,
    logged,
    (name) => readHead(env, project, name),
    (causal) => requiredEpoch(env.BUCKET, project, causal),
  );

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

/** `/v1/<project>/headlog/<branch>`: every head the branch had, oldest first (`Worker.Heads.serveLog`). */
const headLog = (request, env, project, rest) => heads.serveLog(request, env.BUCKET, project, rest);

//
// Files beside the bundles: assets, the explorer's inbox and site, analytics events.
//

/** `/v1/<project>/files/<folder>/…` is `Worker.Files.serve`, in DEUS (platform/worker/deus/files.deus). */
const files = (request, env, ctx, project, folder, rest) =>
  filesApi.serve(request, env.BUCKET, project, folder, rest, (scope) => authorize(request, env, ctx, scope, project));

/**
 * Deletes `<project>/<folder>/<name>` by moving it to `<project>/trash/<folder>/<name>`, which no client
 * can write or delete (`Worker.R2.toTrash`).
 */
export const toTrash = (bucket, project, folder, name) => filesApi.toTrash(bucket, project, folder, name);

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

/** Every key under `prefix`, without it, in order, following R2's pages (`Worker.R2.listAll`). */
export const listAll = (bucket, prefix) => filesApi.listAll(bucket, prefix);

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
  const now = Date.now();
  // Whether the row lets this request through, and why not, is `Worker.Keys.judge`, in DEUS.
  const verdict = keys.judge(row ?? null, await sha256(new TextEncoder().encode(secret)), now, scope, project ?? '');
  if (verdict.status !== 0) {
    throw new HttpError(verdict.status, verdict.message);
  }
  const scopes = JSON.parse(row.scopes);
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

/** `/v1/keys`: list, mint and revoke keys; only an `admin` key may (`Worker.KeyAdmin.serve`, in DEUS). */
const keysApi = (request, env, ctx, rest) =>
  keyAdminApi.serve(request, env.DB, rest, SCOPES, (scope) => authorize(request, env, ctx, scope));

/**
 * A new key: the secret is shown once and only its SHA-256 is kept (it is random, not a password)
 * (`Worker.KeyAdmin.mint`).
 */
export const mintKey = () => keyAdminApi.mint();

//
// Helpers.
//

export const sha256 = async (bytes) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));

export const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
