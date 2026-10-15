//
// Copyright 2026 DXOS.org
//

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';
import { beforeEach, describe, test } from 'vitest';

import { mintKey, sha256 } from '../platform/worker/remote.mjs';
import worker, { type Bucket, type Database, type Env, type Statement } from '../platform/worker/worker.mjs';

/** An R2 binding in memory; `list` pages by two, so callers must follow the cursor. */
export const memoryBucket = (): Bucket & { keys(): string[] } => {
  const store = new Map<string, { bytes: Uint8Array; type?: string }>();
  return {
    keys: () => [...store.keys()].sort(),
    get: async (key) => {
      const entry = store.get(key);
      return entry
        ? {
            body: entry.bytes,
            httpMetadata: { contentType: entry.type },
            text: async () => new TextDecoder().decode(entry.bytes),
          }
        : null;
    },
    head: async (key) => (store.has(key) ? {} : null),
    put: async (key, value, options) => {
      store.set(key, {
        bytes: typeof value === 'string' ? new TextEncoder().encode(value) : value,
        type: options?.httpMetadata?.contentType,
      });
    },
    delete: async (key) => {
      store.delete(key);
    },
    list: async ({ prefix, cursor }) => {
      const all = [...store.keys()].filter((key) => key.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = all.slice(start, start + 2);
      const truncated = start + 2 < all.length;
      return { objects: page.map((key) => ({ key })), truncated, cursor: truncated ? String(start + 2) : undefined };
    },
  };
};

/** A D1 binding over node:sqlite, with the Worker's migrations applied. */
export const sqliteDatabase = (): Database & { sqlite: DatabaseSync } => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../platform/worker/migrations/0001_keys.sql', import.meta.url), 'utf8'));
  const statement = (sql: string, values: (string | number | null)[] = []): Statement => ({
    bind: (...next) => statement(sql, next),
    first: async <T>() => (sqlite.prepare(sql).get(...values) ?? null) as T | null,
    all: async <T>() => ({ results: sqlite.prepare(sql).all(...values) as T[] }),
    run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }),
  });
  return {
    sqlite,
    prepare: (sql) => statement(sql),
    batch: async (statements) => Promise.all(statements.map((each) => each.run())),
  };
};

/** Stores a key with `scopes` straight in the table, as the bootstrap does for the first admin key. */
export const insertKey = async (db: Database, scopes: string[], projects: string[] | '*' = '*', extra = {}) => {
  const minted = await mintKey();
  const row = { revoked_at: null, expires_at: null, ...extra };
  await db
    .prepare(
      'insert into api_keys (id, secret_hash, label, scopes, projects, created_at, expires_at, revoked_at) values (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      minted.id,
      minted.secretHash,
      'test',
      JSON.stringify(scopes),
      JSON.stringify(projects),
      Date.now(),
      row.expires_at,
      row.revoked_at,
    )
    .run();
  return minted.key;
};

const bundleOf = async (text: string) => {
  const bytes = new TextEncoder().encode(text);
  return { name: `0-${await sha256(bytes)}`, body: new Uint8Array(gzipSync(bytes)) };
};

describe('replication API', () => {
  const origin = 'https://deus.test';
  let env: Env;
  let bucket: ReturnType<typeof memoryBucket>;
  let db: ReturnType<typeof sqliteDatabase>;
  let pending: Promise<unknown>[];

  beforeEach(() => {
    bucket = memoryBucket();
    db = sqliteDatabase();
    pending = [];
    env = { PREFIX: 'toolchain', BUCKET: bucket, DB: db };
  });

  const call = async (path: string, init: RequestInit & { key?: string } = {}) => {
    const headers = new Headers(init.headers);
    if (init.key) {
      headers.set('authorization', `Bearer ${init.key}`);
    }
    const response = await worker.fetch(new Request(`${origin}${path}`, { ...init, headers }), env, {
      waitUntil: (promise) => pending.push(promise),
    });
    await Promise.all(pending);
    return response;
  };

  test('reads are open and writes need a key with the right scope', async ({ expect }) => {
    const bundle = await bundleOf('(bundle a)');
    const put = (key?: string) =>
      call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'PUT', body: bundle.body, key });
    expect((await put()).status).toBe(401);
    expect((await put('deus_0000000000000000_' + '0'.repeat(64))).status).toBe(401);
    expect((await put(await insertKey(db, ['site']))).status).toBe(403);
    expect((await put(await insertKey(db, ['push'], ['other']))).status).toBe(403);
    expect((await put(await insertKey(db, ['push'], '*', { revoked_at: Date.now() }))).status).toBe(401);
    expect((await put(await insertKey(db, ['push'], '*', { expires_at: Date.now() - 1 }))).status).toBe(401);
    const pusher = await insertKey(db, ['push'], ['toolchain']);
    expect((await put(pusher)).status).toBe(201);
    // A second put of the same bundle is not an error: bundles are content-named (D50).
    expect(await (await put(pusher)).json()).toEqual({ bundle: bundle.name, stored: false });

    const listing = await call('/v1/toolchain/bundles');
    expect(await listing.text()).toBe(`${bundle.name}\n`);
    const fetched = await call(`/v1/toolchain/bundles/${bundle.name}`);
    expect(fetched.headers.get('cache-control')).toContain('immutable');
    expect(new Uint8Array(await fetched.arrayBuffer())).toEqual(new Uint8Array(bundle.body));

    // Every authorized write leaves an audit row and marks its key used.
    const audit = db.sqlite.prepare('select method, path from audit').all();
    expect(audit).toHaveLength(2);
    expect(audit[0]).toEqual({ method: 'PUT', path: `/v1/toolchain/bundles/${bundle.name}` });
  });

  test('a bundle must hash to its name', async ({ expect }) => {
    const key = await insertKey(db, ['push']);
    const bundle = await bundleOf('(bundle a)');
    const other = await bundleOf('(bundle b)');
    const response = await call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'PUT', body: other.body, key });
    expect(response.status).toBe(400);
    expect((await call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'PUT', body: 'plain', key })).status).toBe(
      400,
    );
    expect((await call('/v1/toolchain/bundles/not-a-bundle', { method: 'PUT', body: other.body, key })).status).toBe(
      404,
    );
    expect(bucket.keys()).toEqual([]);
  });

  test('only a compact key deletes bundles', async ({ expect }) => {
    const bundle = await bundleOf('(bundle a)');
    await call(`/v1/toolchain/bundles/${bundle.name}`, {
      method: 'PUT',
      body: bundle.body,
      key: await insertKey(db, ['push']),
    });
    const remove = (key: string) => call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'DELETE', key });
    expect((await remove(await insertKey(db, ['push']))).status).toBe(403);
    expect(bucket.keys()).toHaveLength(1);
    expect((await remove(await insertKey(db, ['compact']))).status).toBe(200);
    expect(bucket.keys()).toEqual([]);
  });

  test('files are written under the scope of their folder and listed across pages', async ({ expect }) => {
    const site = await insertKey(db, ['site']);
    for (const name of ['index.html', 'meta.json', 'def/a.json']) {
      const response = await call(`/v1/toolchain/files/site/${name}`, {
        method: 'PUT',
        body: name,
        headers: { 'content-type': 'text/plain' },
        key: site,
      });
      expect(response.status).toBe(201);
    }
    expect((await call('/v1/toolchain/files/assets/x', { method: 'PUT', body: 'x', key: site })).status).toBe(403);
    expect((await call('/v1/toolchain/files/site/.hidden', { method: 'PUT', body: 'x', key: site })).status).toBe(400);
    expect((await call('/v1/toolchain/files/other/x', { method: 'PUT', body: 'x', key: site })).status).toBe(404);
    expect(await (await call('/v1/toolchain/files/site/')).text()).toBe('def/a.json\nindex.html\nmeta.json\n');
    expect(await (await call('/v1/toolchain/files/site/meta.json')).text()).toBe('meta.json');
    // The explorer of PREFIX reads the same files.
    const page = await call('/');
    expect(await page.text()).toBe('index.html');
    expect(page.headers.get('content-type')).toBe('text/plain');
  });

  test('an admin key mints, lists and revokes keys', async ({ expect }) => {
    const admin = await insertKey(db, ['admin']);
    expect((await call('/v1/keys', { key: await insertKey(db, ['push']) })).status).toBe(403);
    const created = await call('/v1/keys', {
      method: 'POST',
      key: admin,
      body: JSON.stringify({ label: 'threads', scopes: ['push', 'site'], projects: ['toolchain'] }),
    });
    expect(created.status).toBe(201);
    const { id, key } = await created.json();
    expect(key).toMatch(/^deus_[0-9a-f]{16}_[0-9a-f]{64}$/);
    const listed = await (await call('/v1/keys', { key: admin })).json();
    expect(listed.map((row: { label: string }) => row.label)).toContain('threads');
    expect(JSON.stringify(listed)).not.toContain(key.slice(22));

    const bundle = await bundleOf('(bundle a)');
    const put = () => call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'PUT', body: bundle.body, key });
    expect((await call(`/v1/keys/${id}`, { method: 'DELETE', key: admin })).status).toBe(200);
    expect((await put()).status).toBe(401);
    const invalid = await call('/v1/keys', {
      method: 'POST',
      key: admin,
      body: JSON.stringify({ label: 'x', scopes: ['everything'] }),
    });
    expect(invalid.status).toBe(400);
  });
});
