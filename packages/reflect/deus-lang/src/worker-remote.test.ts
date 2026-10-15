//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';
import { beforeEach, describe, test } from 'vitest';

import { mintKey, sha256 } from '../platform/worker/remote.mjs';
import worker, { type Bucket, type Database, type Env, type Statement } from '../platform/worker/worker.mjs';

/** An R2 binding in memory; `list` pages by two, so callers must follow the cursor. */
export const memoryBucket = (): Bucket & { keys(): string[] } => {
  const store = new Map<string, { bytes: Uint8Array; type?: string; etag: string }>();
  let writes = 0;
  return {
    keys: () => [...store.keys()].sort(),
    get: async (key, options) => {
      const entry = store.get(key);
      if (!entry) {
        return null;
      }
      const offset = options?.range?.offset ?? 0;
      const length = options?.range?.length ?? entry.bytes.length - offset;
      const bytes = entry.bytes.subarray(offset, offset + length);
      return {
        body: bytes,
        etag: entry.etag,
        size: entry.bytes.length,
        range: options?.range ? { offset, length } : undefined,
        httpMetadata: { contentType: entry.type },
        text: async () => new TextDecoder().decode(bytes),
      };
    },
    head: async (key) => (store.has(key) ? {} : null),
    put: async (key, value, options) => {
      // Conditional writes as R2 makes them: `If-None-Match: *` creates only, `etagMatches` replaces only that version.
      const current = store.get(key);
      const onlyIf = options?.onlyIf;
      if (
        onlyIf instanceof Headers
          ? onlyIf.get('if-none-match') === '*' && current
          : onlyIf?.etagMatches !== undefined && current?.etag !== onlyIf.etagMatches
      ) {
        return null;
      }
      const etag = String(++writes);
      store.set(key, {
        bytes: typeof value === 'string' ? new TextEncoder().encode(value) : value,
        type: options?.httpMetadata?.contentType,
        etag,
      });
      return { etag };
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
  const migrations = new URL('../platform/worker/migrations/', import.meta.url);
  for (const name of readdirSync(migrations).sort()) {
    sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }
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

const hash = (digit: string) => digit.repeat(64);

/** The header a push sends: the head it claims and the heads it builds on. */
const claim = (head: string, ...bases: string[]) => ({
  'x-deus-claim': `main ${head} ${bases.length === 0 ? '-' : bases.join(',')}`,
});

const bundleOf = async (text: string) => {
  const bytes = new TextEncoder().encode(text);
  return { name: `0-${await sha256(bytes)}`, body: new Uint8Array(gzipSync(bytes)) };
};

/** A pack as Pack.Spec lays it out (D180), built here independently of the CLI's `Pack.index`. */
const packOf = async (lines: string[]) => {
  const encoder = new TextEncoder();
  const text = encoder.encode(`DEUSLN1\n${lines.map((line) => `${line}\n`).join('')}`);
  const records: { key: number[]; kind: number; offset: number; length: number }[] = [];
  let offset = encoder.encode('DEUSLN1\n').length;
  for (const line of lines) {
    const length = encoder.encode(line).length;
    const [kind, id] = line.split(' ');
    if (kind === 'obj' || kind === 'meta') {
      const keyHex = /^[0-9a-f]{64}$/.test(id) ? id : await sha256(encoder.encode(id));
      const key = Array.from({ length: 32 }, (_, index) => parseInt(keyHex.slice(index * 2, index * 2 + 2), 16));
      records.push({ key, kind: kind === 'obj' ? 1 : 2, offset, length });
    }
    offset += length + 1;
  }
  const order = (left: (typeof records)[number], right: (typeof records)[number]) => {
    const differs = left.key.findIndex((byte, index) => byte !== right.key[index]);
    return differs >= 0 ? left.key[differs] - right.key[differs] : left.kind - right.kind;
  };
  records.sort(order);
  const index = new Uint8Array(1024 + 48 * records.length);
  const view = new DataView(index.buffer);
  for (let byte = 0; byte < 256; byte++) {
    view.setUint32(byte * 4, records.filter((record) => record.key[0] <= byte).length);
  }
  records.forEach((record, at) => {
    const start = 1024 + 48 * at;
    index.set(record.key, start);
    view.setUint32(start + 36, record.offset);
    view.setUint32(start + 40, record.length);
    index[start + 44] = record.kind;
  });
  return { text, index };
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
      call(`/v1/toolchain/bundles/${bundle.name}`, {
        method: 'PUT',
        body: bundle.body,
        key,
        headers: claim(hash('1')),
      });
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

  test('a push moves the head only from the head it builds on', async ({ expect }) => {
    const key = await insertKey(db, ['push']);
    const push = async (text: string, headers: Record<string, string>) => {
      const bundle = await bundleOf(text);
      return call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'PUT', body: bundle.body, key, headers });
    };
    const head = async () => ({ causal: await (await bucket.get('toolchain/heads/main'))?.text() });
    expect((await push('(bundle 0)', {})).status).toBe(428);
    expect((await push('(bundle 0)', { 'x-deus-claim': 'main nonsense -' })).status).toBe(400);
    expect((await push('(bundle 1)', claim(hash('1')))).status).toBe(201);
    expect((await push('(bundle 2)', claim(hash('2'), hash('1')))).status).toBe(201);
    expect(await head()).toEqual({ causal: hash('2') });

    // Another session that pulled before the last push is refused and told what to do; nothing is stored.
    const stale = await push('(bundle 3)', claim(hash('3'), hash('1')));
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ head: hash('2') });
    expect(bucket.keys().filter((key) => key.includes('/bundles/'))).toHaveLength(2);
    // The first push of a branch that already has a head is stale too.
    expect((await push('(bundle 4)', claim(hash('4')))).status).toBe(409);
    // A retried push whose head already moved (its store failed) goes through.
    expect((await push('(bundle 2 again)', claim(hash('2'), hash('1')))).status).toBe(201);
    // A merge of concurrent heads names every head it joins.
    expect((await push('(bundle 5)', claim(hash('5'), hash('9'), hash('2')))).status).toBe(201);
    expect(await head()).toEqual({ causal: hash('5') });
    // Compaction re-claims existing heads, so a compact key may omit the claim.
    expect(
      (
        await call(`/v1/toolchain/bundles/${(await bundleOf('(bundle c)')).name}`, {
          method: 'PUT',
          body: (await bundleOf('(bundle c)')).body,
          key: await insertKey(db, ['push', 'compact']),
        })
      ).status,
    ).toBe(201);
  });

  test('heads move in the bucket, so pushes work when D1 takes no writes (D181)', async ({ expect }) => {
    const key = await insertKey(db, ['push']);
    // A head D1 recorded before D181 is where the branch is.
    db.sqlite
      .prepare('insert into heads (project, branch, causal, updated_at, key_id) values (?, ?, ?, ?, ?)')
      .run('toolchain', 'main', hash('1'), 0, 'old');
    // D1's daily row writes are used up: every write fails.
    const prepare = db.prepare;
    db.prepare = (sql) => {
      const statement = prepare(sql);
      return /^\s*(insert|update)/i.test(sql)
        ? {
            ...statement,
            bind: () => ({ ...statement, run: async () => Promise.reject(new Error('D1_ERROR: row write limit')) }),
          }
        : statement;
    };
    const push = async (text: string, headers: Record<string, string>) => {
      const bundle = await bundleOf(text);
      return call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'PUT', body: bundle.body, key, headers });
    };
    expect((await push('(bundle stale)', claim(hash('2')))).status).toBe(409);
    expect((await push('(bundle 2)', claim(hash('2'), hash('1')))).status).toBe(201);
    expect(await (await bucket.get('toolchain/heads/main'))?.text()).toBe(hash('2'));
    expect((await push('(bundle 3)', claim(hash('3'), hash('1')))).status).toBe(409);
    expect((await push('(bundle 3)', claim(hash('3'), hash('2')))).status).toBe(201);
  });

  test('only a compact key deletes bundles', async ({ expect }) => {
    const bundle = await bundleOf('(bundle a)');
    await call(`/v1/toolchain/bundles/${bundle.name}`, {
      method: 'PUT',
      body: bundle.body,
      key: await insertKey(db, ['push']),
      headers: claim(hash('1')),
    });
    const remove = (key: string) => call(`/v1/toolchain/bundles/${bundle.name}`, { method: 'DELETE', key });
    expect((await remove(await insertKey(db, ['push']))).status).toBe(403);
    expect(bucket.keys()).toEqual([`toolchain/bundles/${bundle.name}`, 'toolchain/heads/main']);
    expect((await remove(await insertKey(db, ['compact']))).status).toBe(200);
    expect(bucket.keys()).toEqual(['toolchain/heads/main']);
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

  test('the explorer serves the version HEAD names, pinned for the whole page', async ({ expect }) => {
    const put = (key: string, body: string) => bucket.put(`toolchain/site/${key}`, body);
    await put('def/a.json', 'def a');
    await put('v/0000000000000001/index.html', '<html><head></head>one</html>');
    await put('v/0000000000000001/meta.json', 'meta one');
    await put('v/0000000000000002/index.html', '<html><head></head>two</html>');
    await put('v/0000000000000002/meta.json', 'meta two');
    await put('HEAD', '0000000000000001\n');

    const page = await call('/');
    expect(await page.text()).toBe('<html><head><base href="/v/0000000000000001/" /></head>one</html>');
    // A push that moves HEAD meanwhile changes nothing for a page that has already loaded.
    await put('HEAD', '0000000000000002');
    expect(await (await call('/v/0000000000000001/meta.json')).text()).toBe('meta one');
    expect((await call('/v/0000000000000001/meta.json')).headers.get('cache-control')).toContain('immutable');
    // Pages named by hash are shared by every version, and so is the write API.
    expect(await (await call('/v/0000000000000001/def/a.json')).text()).toBe('def a');
    expect(await (await call('/v/0000000000000001/api/me')).json()).toMatchObject({ signIn: false });
    expect((await call('/v/0000000000000001/missing.json')).status).toBe(404);
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

  test('finds objects and names through pack indexes (D180)', async ({ expect }) => {
    const key = await insertKey(db, ['push']);
    const bundle = await bundleOf('(bundle packed)');
    const [root, child, part, causal, term, top] = ['1', '2', '3', '4', '5', '6'].map(hash);
    const pack = await packOf([
      `branch main ${causal}`,
      'obj #Option (type "#Option")',
      `obj ${root} (ns (n "top" (term "${top}")) (sub "A" "${child}"))`,
      `obj ${child} (ns (part "${part}"))`,
      `obj ${part} (ns (n "b" (term "${term}")))`,
      `obj ${causal} (causal (ns "${root}") (parents) (msg "m"))`,
      `obj ${term} (term "é ✓ \\"quoted\\"")`,
      `obj ${top} (term 1)`,
      `obj ${top}.1 (term 2)`,
      `meta ${term} (meta (doc "ünï"))`,
    ]);
    const put = (path: string, body: Uint8Array) => call(`/v1/toolchain/${path}`, { method: 'PUT', body, key });
    // A pack only describes a bundle the remote holds, and its index goes up last.
    expect((await put(`packs/${bundle.name}`, pack.text)).status).toBe(409);
    expect((await put(`bundles/${bundle.name}`, bundle.body)).status).toBe(428);
    expect(
      (
        await call(`/v1/toolchain/bundles/${bundle.name}`, {
          method: 'PUT',
          body: bundle.body,
          key,
          headers: claim(causal),
        })
      ).status,
    ).toBe(201);
    expect((await put(`packs/${bundle.name}.idx`, pack.index)).status).toBe(409);
    expect((await put(`packs/${bundle.name}`, new TextEncoder().encode('(bundle)'))).status).toBe(400);
    expect((await put(`files/packs/${bundle.name}`, pack.text)).status).toBe(201);
    expect((await put(`packs/${bundle.name}.idx`, pack.index.subarray(0, 1024 + 47))).status).toBe(400);
    expect((await put(`packs/${bundle.name}.idx`, pack.index)).status).toBe(201);
    expect(await (await call('/v1/toolchain/files/packs/')).text()).toBe(`${bundle.name}\n${bundle.name}.idx\n`);

    // Lookups read ranges only: no whole pack or index is fetched.
    const reads: { key: string; ranged: boolean }[] = [];
    const get = bucket.get;
    bucket.get = async (path, options) => {
      reads.push({ key: path, ranged: options?.range !== undefined });
      return get(path, options);
    };
    expect(await (await call(`/v1/toolchain/objects/${term}`)).text()).toBe('(term "é ✓ \\"quoted\\"")');
    expect(await (await call(`/v1/toolchain/meta/${term}`)).text()).toBe('(meta (doc "ünï"))');
    expect(await (await call('/v1/toolchain/objects/%23Option')).text()).toBe('(type "#Option")');
    expect(await (await call(`/v1/toolchain/objects/${top}.1`)).text()).toBe('(term 2)');
    expect((await call(`/v1/toolchain/objects/${hash('9')}`)).status).toBe(404);
    expect(await (await call('/v1/toolchain/names/main/A.b')).json()).toEqual({
      name: 'A.b',
      branch: 'main',
      head: causal,
      entry: `(term "${term}")`,
      hash: term,
      text: '(term "é ✓ \\"quoted\\"")',
    });
    expect(await (await call('/v1/toolchain/names/main/top')).json()).toMatchObject({ hash: top, text: '(term 1)' });
    expect((await call('/v1/toolchain/names/main/A.c')).status).toBe(404);
    expect(reads.filter((read) => read.key.includes('/packs/') && !read.ranged)).toEqual([]);

    // Any client can read a pack in ranges.
    const ranged = await call(`/v1/toolchain/packs/${bundle.name}`, { headers: { range: 'bytes=0-6' } });
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get('content-range')).toBe(`bytes 0-6/${pack.text.length}`);
    expect(await ranged.text()).toBe('DEUSLN1');
  });

  test('projects are addressed as @owner/project, with the toolchain at its old URLs too (D184)', async ({
    expect,
  }) => {
    const put = (path: string, bundle: { name: string; body: Uint8Array }, key: string, ...bases: string[]) =>
      call(`/v1/${path}/bundles/${bundle.name}`, {
        method: 'PUT',
        body: bundle.body,
        key,
        headers: claim(hash(bases.length === 0 ? '1' : '2'), ...bases),
      });
    const a = await bundleOf('(bundle a)');
    const b = await bundleOf('(bundle b)');

    // A new project lives at <owner>/<project>/, and its key writes nowhere else.
    const demo = await insertKey(db, ['push'], ['@acme/demo']);
    expect((await put('@acme/demo', a, demo)).status).toBe(201);
    expect(await bucket.head(`acme/demo/bundles/${a.name}`)).toBeTruthy();
    expect(await (await call('/v1/@acme/demo/bundles')).text()).toBe(`${a.name}\n`);
    expect((await put('@acme/other', a, demo)).status).toBe(403);
    expect((await put('@dxos/toolchain', a, demo)).status).toBe(403);
    expect((await put('toolchain', a, demo)).status).toBe(403);

    // The toolchain keeps its folder: /v1/toolchain and /v1/@dxos/toolchain are one project, and a
    // key granted either name writes to it.
    expect((await put('@dxos/toolchain', a, await insertKey(db, ['push'], ['toolchain']))).status).toBe(201);
    expect((await put('toolchain', b, await insertKey(db, ['push'], ['@dxos/toolchain']), hash('1'))).status).toBe(201);
    expect(await (await call('/v1/toolchain/bundles')).text()).toBe(
      await (await call('/v1/@dxos/toolchain/bundles')).text(),
    );
    expect(await bucket.head(`toolchain/bundles/${b.name}`)).toBeTruthy();

    // Owners are GitHub logins and projects slugs, lowercase.
    for (const path of ['@Acme/demo', '@acme/-demo', '@acme', '@ac_me/demo', '@acme/demo-']) {
      expect((await call(`/v1/${path}/bundles`)).status, path).toBe(404);
    }

    // Keys are minted for addresses.
    const admin = await insertKey(db, ['admin']);
    const mint = (projects: string[]) =>
      call('/v1/keys', {
        method: 'POST',
        key: admin,
        body: JSON.stringify({ label: 'x', scopes: ['push'], projects }),
      });
    expect((await mint(['@acme/demo', 'toolchain'])).status).toBe(201);
    expect((await mint(['@acme'])).status).toBe(400);
    expect((await mint(['@acme/demo/Cli'])).status).toBe(400);

    // Each project's explorer is served at /@owner/project/, and a definition's name opens the page.
    await bucket.put('acme/demo/site/v/0000000000000001/index.html', '<html><head></head>demo</html>');
    await bucket.put('acme/demo/site/v/0000000000000001/meta.json', 'demo meta');
    await bucket.put('acme/demo/site/HEAD', '0000000000000001');
    await bucket.put('toolchain/site/v/0000000000000002/index.html', '<html><head></head>toolchain</html>');
    await bucket.put('toolchain/site/HEAD', '0000000000000002');
    const demoPage = '<html><head><base href="/@acme/demo/v/0000000000000001/" /></head>demo</html>';
    expect(await (await call('/@acme/demo/')).text()).toBe(demoPage);
    expect(await (await call('/@acme/demo/Cli.dispatch')).text()).toBe(demoPage);
    expect(await (await call('/@acme/demo/v/0000000000000001/meta.json')).text()).toBe('demo meta');
    expect((await call('/@acme/demo/missing.json')).status).toBe(404);
    expect((await call('/@acme/nothing/')).status).toBe(404);
    expect((await call('/@Acme/demo/')).status).toBe(404);
    expect(await (await call('/@dxos/toolchain/')).text()).toContain(
      '<base href="/@dxos/toolchain/v/0000000000000002/" />',
    );
    expect(await (await call('/')).text()).toContain('<base href="/v/0000000000000002/" />');
    expect(await (await call('/Cli.dispatch')).text()).toContain('toolchain');
  });
});
