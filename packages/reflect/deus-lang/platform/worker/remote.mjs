//
// Copyright 2026 DXOS.org
//

// The replication API (D164): what `deus push` and `deus pull` talk to when a remote is an
// `https://…/v1/<project>` URL. It maps one to one onto the CLI's `Remote` ability, over the
// bucket binding, so no client needs R2 credentials. Reads are open; every write carries an API
// key whose row in the `DB` binding (D1) grants it a scope for the project.

/** A project is one folder of the bucket. */
const PROJECT = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** `<level>-<sha256>`, the name of an immutable bundle (D50, D91). */
const BUNDLE = /^[0-9]{1,3}-[0-9a-f]{64}$/;

/** A key segment: no empty, dot-only or separator-bearing parts, so a key cannot leave its folder. */
const SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,199}$/;

/** The folders beside the bundles, each written under the scope of the same name. */
export const FOLDERS = ['assets', 'inbox', 'site', 'events'];

/** Every scope a key can hold; `admin` implies the others and also manages keys. */
export const SCOPES = ['push', 'compact', ...FOLDERS, 'admin'];

const KEY = /^Bearer deus_([0-9a-f]{16})_([0-9a-f]{64})$/;

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
  const [project, area, ...rest] = parts;
  if (!PROJECT.test(project ?? '')) {
    throw new HttpError(404, 'no such project');
  }
  if (!env.BUCKET) {
    throw new HttpError(503, 'this worker has no bucket');
  }
  if (area === 'bundles') {
    return bundles(request, env, ctx, project, rest);
  }
  if (area === 'files' && FOLDERS.includes(rest[0])) {
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
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: 'application/gzip' } });
    return logged(json({ bundle: name, stored: true }, 201));
  }
  if (request.method === 'DELETE') {
    // Only compaction deletes a bundle, once strata hold everything it lists (D73).
    const logged = await authorize(request, env, ctx, 'compact', project);
    await env.BUCKET.delete(key);
    return logged(json({ bundle: name, deleted: true }));
  }
  throw new HttpError(405, 'method not allowed');
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
    const logged = await authorize(request, env, ctx, folder, project);
    const type = request.headers.get('content-type') ?? 'application/octet-stream';
    await env.BUCKET.put(key, new Uint8Array(await request.arrayBuffer()), { httpMetadata: { contentType: type } });
    return logged(json({ key: rest.join('/'), stored: true }, 201));
  }
  if (request.method === 'DELETE') {
    const logged = await authorize(request, env, ctx, folder, project);
    await env.BUCKET.delete(key);
    return logged(json({ key: rest.join('/'), deleted: true }));
  }
  throw new HttpError(405, 'method not allowed');
};

/** Every key under `prefix`, without it, following R2's pages. */
const listAll = async (bucket, prefix) => {
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

/**
 * Checks the request's key for `scope` on `project`. Returns `logged`, which the caller passes its
 * response through so the write is recorded in the audit table with the status it got.
 */
export const authorize = async (request, env, ctx, scope, project) => {
  const match = KEY.exec(request.headers.get('authorization') ?? '');
  if (!match) {
    throw new HttpError(401, 'writes need an API key: Authorization: Bearer deus_<id>_<secret>');
  }
  if (!env.DB) {
    throw new HttpError(503, 'this worker has no key database');
  }
  const [, id, secret] = match;
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
  if (!scopes.includes(scope) && !scopes.includes('admin')) {
    throw new HttpError(403, `this API key lacks the ${scope} scope`);
  }
  const projects = JSON.parse(row.projects);
  if (project && projects !== '*' && !projects.includes(project)) {
    throw new HttpError(403, `this API key cannot write to ${project}`);
  }
  const url = new URL(request.url);
  // The row is written after the response, so logging never slows or fails a write.
  return (response) => {
    ctx.waitUntil(
      env.DB.batch([
        env.DB.prepare('insert into audit (at, key_id, method, path, status) values (?, ?, ?, ?, ?)').bind(
          now,
          id,
          request.method,
          url.pathname,
          response.status,
        ),
        env.DB.prepare('update api_keys set last_used_at = ? where id = ?').bind(now, id),
      ]),
    );
    return response;
  };
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
    if (!label) {
      throw new HttpError(400, 'a key needs a label');
    }
    if (scopes.length === 0 || !scopes.every((scope) => SCOPES.includes(scope))) {
      throw new HttpError(400, `scopes are some of ${SCOPES.join(', ')}`);
    }
    if (projects !== '*' && !(Array.isArray(projects) && projects.every((project) => PROJECT.test(project)))) {
      throw new HttpError(400, 'projects is "*" or a list of project names');
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
