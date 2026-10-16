//
// Copyright 2026 DXOS.org
//

import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'vitest';

import { appFiles, hubFiles } from '../platform/worker/gen/explorer-app.mjs';
import { checkHistory } from '../platform/worker/live.mjs';
import worker, { type Bucket, type Env } from '../platform/worker/worker.mjs';
import { cliHarness } from './cli-harness.ts';

const { root, scratch, file, deus } = cliHarness('live-explorer-');

/** An R2 binding over a directory, with ranged reads, so a directory remote's packs read as the bucket's. */
const directoryBucket = (folder: string): Bucket => {
  const read = (key: string) => {
    try {
      return readFileSync(join(folder, key));
    } catch {
      return undefined;
    }
  };
  return {
    get: async (key, options) => {
      const whole = read(key);
      if (!whole) {
        return null;
      }
      const offset = options?.range?.offset ?? 0;
      const bytes = new Uint8Array(whole.subarray(offset, offset + (options?.range?.length ?? whole.length - offset)));
      return {
        body: bytes,
        size: whole.length,
        httpMetadata: {},
        uploaded: statSync(join(folder, key)).mtime,
        text: async () => new TextDecoder().decode(bytes),
      };
    },
    head: async (key) => (read(key) ? {} : null),
    put: async (key, value) => {
      mkdirSync(dirname(join(folder, key)), { recursive: true });
      writeFileSync(join(folder, key), value instanceof ArrayBuffer ? new Uint8Array(value) : value);
    },
    delete: async () => {},
    list: async ({ prefix, delimiter }) => {
      let names: string[] = [];
      try {
        names = readdirSync(join(folder, prefix));
      } catch {}
      // With a delimiter, folders come back as prefixes, as R2 groups keys past it.
      const folders = delimiter ? names.filter((name) => statSync(join(folder, prefix, name)).isDirectory()) : [];
      return {
        objects: names.filter((name) => !folders.includes(name)).map((name) => ({ key: `${prefix}${name}` })),
        delimitedPrefixes: folders.map((name) => `${prefix}${name}${delimiter}`),
      };
    },
  };
};

describe('live explorer (D192)', () => {
  test(
    'the Worker draws the explorer from the pushed codebase as deus explore does',
    { timeout: 300_000 },
    async ({ expect }) => {
      const bucket = join(scratch, 'bucket');
      const c = ['--codebase', join(scratch, 'codebase')];
      deus('init', '--empty', ...c);
      deus('project', 'init', 'https://dxos.org/deus/toolchain', ...c);
      deus('remote', 'add', 'origin', join(bucket, 'toolchain'), ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), '--message', 'prelude', ...c);
      deus(
        'add',
        file(
          'area.deus',
          [
            '/-- The area of a square. -/',
            'def area (side : Int) : Int := side * side',
            'def isEven (n : Int) : Bool := if n == 0 then true else isOdd (n - 1)',
            'def isOdd (n : Int) : Bool := if n == 0 then false else isEven (n - 1)',
            '',
          ].join('\n'),
        ),
        '--message',
        'area',
        ...c,
      );
      deus(
        'update',
        file(
          'Area.Spec.mdl',
          [
            '---',
            'name: Area.Spec',
            '---',
            '',
            '# Areas',
            '',
            '```mdl',
            'req R-1: a square of side two covers four',
            '  by: area',
            '```',
            '',
          ].join('\n'),
        ),
        ...c,
      );
      deus('task', 'new', 'Squares', '--link', 'area', '--by', 'tester', ...c);
      expect(deus('push', ...c).code).toBe(0);
      // A directory remote keeps its head in its bundles; the bucket keeps it beside them (D181).
      const head = readFileSync(join(scratch, 'codebase', 'branches', 'main'), 'utf8').trim();
      mkdirSync(join(bucket, 'toolchain', 'heads'), { recursive: true });
      writeFileSync(join(bucket, 'toolchain', 'heads', 'main'), head);
      process.env.DEUS_HOME = root;
      expect(deus('explore', '--out', join(scratch, 'site'), ...c)).toMatchObject({ stderr: '', code: 0 });
      // Who made a change is this store's provenance, which bundles do not carry yet (task 778cdac2).
      const site = (path: string) =>
        JSON.parse(readFileSync(join(scratch, 'site', path), 'utf8'), (key, value) =>
          key === 'by' ? undefined : value,
        );

      const env = { BUCKET: directoryBucket(bucket), PREFIX: 'toolchain' } as Env;
      const get = async (path: string) => {
        const pending: Promise<unknown>[] = [];
        const response = await worker.fetch(new Request(`https://deus.test${path}`), env, {
          waitUntil: (promise: Promise<unknown>) => pending.push(promise),
        });
        await Promise.all(pending);
        expect(response.status, path).toBe(200);
        return response.json();
      };
      expect(await get('/v1/toolchain/live/main')).toEqual({ branch: 'main', causal: head });
      const index = await get(`/v1/toolchain/live/${head}/index.json`);
      for (const part of ['names', 'tasks', 'comments', 'events', 'features']) {
        expect(index[part], part).toEqual(site(`${part}.json`));
      }
      // `origin.main` tracks the remote in the pushing store; the bucket's branches are its heads.
      expect(index.meta).toEqual({ ...site('meta.json'), branches: ['main'] });

      const area = index.names.find((entry: { name: string }) => entry.name === 'area');
      expect(await get(`/v1/toolchain/live/${head}/def/${area.hash}.json`)).toEqual(site(`def/${area.hash}.json`));
      // A member of a recursive group is named by its group's hash and its position.
      const member = index.names.find((entry: { hash: string }) => /\.[0-9]+$/.test(entry.hash));
      expect(await get(`/v1/toolchain/live/${head}/def/${member.hash}.json`)).toEqual(site(`def/${member.hash}.json`));
      // A builtin's page shows its declaration; its object lives under `objects/#B/`.
      const bool = await get(`/v1/toolchain/live/${head}/def/_Bool.json`);
      expect(bool).toEqual(site('def/_Bool.json'));
      expect(bool.html).toContain('Bool');
      const map = index.names.find((entry: { name: string }) => entry.name === 'List.map');
      expect(await get(`/v1/toolchain/live/${head}/def/${map.hash}.json`)).toEqual(site(`def/${map.hash}.json`));
      // A spec document's page is the document and its blocks (D196); a name that is no document is not found.
      const doc = await get(`/v1/toolchain/live/${head}/doc/Area.Spec.json`);
      // Read as written: `site` drops `by` keys, which here are the requirement's own `by:`.
      expect(doc).toEqual(JSON.parse(readFileSync(join(scratch, 'site', 'doc', 'Area.Spec.json'), 'utf8')));
      expect(doc.blocks).toEqual([
        {
          type: 'req',
          id: 'R-1',
          title: 'a square of side two covers four',
          line: expect.any(Number),
          props: { by: 'area' },
        },
      ]);
      const unknown = await worker.fetch(
        new Request(`https://deus.test/v1/toolchain/live/${head}/doc/Nothing.Spec.json`),
        env,
        {
          waitUntil: () => {},
        },
      );
      expect(unknown.status).toBe(404);
      // What a causal shows never changes, so it is kept in the bucket after the first request.
      expect(readdirSync(join(bucket, 'toolchain', 'live', head)).sort()).toEqual([
        'chain.json',
        'def',
        'doc',
        'index.json',
        'summary.json',
      ]);
      // What the Worker read is kept as one snapshot, so a cold isolate starts from it.
      expect(readdirSync(join(bucket, 'toolchain', 'live'))).toContain('files.json.gz');
      const change = await get(`/v1/toolchain/live/${head}/change/${head}.json`);
      expect(change.message).toBe(site(`change/${head}.json`).message);
    },
  );

  test(
    'a pushed head is drawn by the queue: its index, then every definition page',
    { timeout: 300_000 },
    async ({ expect }) => {
      const bucket = join(scratch, 'bucket');
      const head = readFileSync(join(bucket, 'toolchain', 'heads', 'main'), 'utf8').trim();
      rmSync(join(bucket, 'toolchain', 'live', head), { recursive: true, force: true });
      const sent: { body: { project: string; causal?: string } }[] = [];
      const env = {
        BUCKET: directoryBucket(bucket),
        PREFIX: 'toolchain',
        LIVE_QUEUE: {
          send: async (body: { project: string }) => void sent.push({ body }),
          sendBatch: async (messages: { body: { project: string; causal: string } }[]) => void sent.push(...messages),
        },
      } as Env;
      const deliver = async (body: object) => {
        const pending: Promise<unknown>[] = [];
        let acked = false;
        await worker.queue({ messages: [{ body, ack: () => (acked = true) }] }, env, {
          waitUntil: (promise: Promise<unknown>) => pending.push(promise),
        });
        await Promise.all(pending);
        expect(acked).toBe(true);
      };
      await deliver({ project: 'toolchain' });
      const index = JSON.parse(readFileSync(join(bucket, 'toolchain', 'live', head, 'index.json'), 'utf8'));
      const chunks = sent.filter((message) => message.body.causal === head);
      expect(chunks.length).toBe(Math.ceil(index.names.length / 200));
      for (const chunk of chunks) {
        await deliver(chunk.body);
      }
      const drawn = readdirSync(join(bucket, 'toolchain', 'live', head, 'def'));
      const pages = new Set(index.names.map((entry: { hash: string }) => `${entry.hash.replace(/^#/, '_')}.json`));
      expect(new Set(drawn)).toEqual(pages);
    },
  );

  test(
    "a definition's page at a head not drawn yet is the last head's, while the head's own is drawn",
    { timeout: 300_000 },
    async ({ expect }) => {
      const bucket = join(scratch, 'bucket');
      const c = ['--codebase', join(scratch, 'codebase')];
      const before = readFileSync(join(bucket, 'toolchain', 'heads', 'main'), 'utf8').trim();
      deus('add', file('cube.deus', 'def cube (side : Int) : Int := side * area side\n'), '--message', 'cube', ...c);
      expect(deus('push', ...c).code).toBe(0);
      const head = readFileSync(join(scratch, 'codebase', 'branches', 'main'), 'utf8').trim();
      writeFileSync(join(bucket, 'toolchain', 'heads', 'main'), head);
      const env = { BUCKET: directoryBucket(bucket), PREFIX: 'toolchain' } as Env;
      const fetchPage = async (causal: string, hash: string) => {
        const pending: Promise<unknown>[] = [];
        const response = await worker.fetch(
          new Request(`https://deus.test/v1/toolchain/live/${causal}/def/${hash}.json`),
          env,
          {
            waitUntil: (promise: Promise<unknown>) => pending.push(promise),
          },
        );
        return { response, settled: Promise.all(pending) };
      };
      const liveHead = async () =>
        (
          await worker.fetch(new Request('https://deus.test/v1/toolchain/live/main'), env, { waitUntil: () => {} })
        ).json();
      // Until the queue draws the new head's index, the explorer shows the head it drew last.
      expect(await liveHead()).toEqual({ branch: 'main', causal: before, drawing: head });
      const appPage = async () =>
        (await worker.fetch(new Request('https://deus.test/index.html'), env, { waitUntil: () => {} })).text();
      expect(await appPage()).toContain(`/live/${before}"`);
      const index = JSON.parse(readFileSync(join(bucket, 'toolchain', 'live', before, 'index.json'), 'utf8'));
      const area = index.names.find((entry: { name: string }) => entry.name === 'area');
      const earlier = readFileSync(join(bucket, 'toolchain', 'live', before, 'def', `${area.hash}.json`), 'utf8');

      const first = await fetchPage(head, area.hash);
      expect(first.response.headers.get('x-deus-drawn-at')).toBe(before);
      expect(first.response.headers.get('cache-control')).toBe('public, max-age=60');
      expect(await first.response.text()).toBe(earlier);
      await first.settled;
      // This head's page was drawn meanwhile, and it knows the new user.
      const own = JSON.parse(readFileSync(join(bucket, 'toolchain', 'live', head, 'def', `${area.hash}.json`), 'utf8'));
      expect(own.users.map((user: { name: string }) => user.name)).toContain('cube');
      const second = await fetchPage(head, area.hash);
      expect(second.response.headers.get('x-deus-drawn-at')).toBeNull();
      expect(await second.response.json()).toEqual(own);
      const stored: Promise<unknown>[] = [];
      const drawn = await worker.fetch(new Request(`https://deus.test/v1/toolchain/live/${head}/index.json`), env, {
        waitUntil: (promise: Promise<unknown>) => stored.push(promise),
      });
      expect(drawn.status).toBe(200);
      await Promise.all(stored);
      expect(await liveHead()).toEqual({ branch: 'main', causal: head });
      expect(await appPage()).toContain(`/live/${head}"`);

      // A change to a doc comment alone changes metadata, not the definition; the next head shows the new doc.
      deus(
        'update',
        file('area.deus', '/-- The area a square covers. -/\ndef area (side : Int) : Int := side * side\n'),
        ...c,
      );
      expect(deus('push', ...c).code).toBe(0);
      const documented = readFileSync(join(scratch, 'codebase', 'branches', 'main'), 'utf8').trim();
      expect(documented).not.toBe(head);
      writeFileSync(join(bucket, 'toolchain', 'heads', 'main'), documented);
      // A fresh binding, as an isolate that has not cached the pack index from before this push.
      env.BUCKET = directoryBucket(bucket);
      await (
        await fetchPage(documented, area.hash)
      ).settled;
      const redrawn = JSON.parse(
        readFileSync(join(bucket, 'toolchain', 'live', documented, 'def', `${area.hash}.json`), 'utf8'),
      );
      expect(redrawn.doc).toContain('The area a square covers.');
    },
  );

  test('KV keeps the shown head for a minute and drawn pages for a week', { timeout: 120_000 }, async ({ expect }) => {
    const bucket = join(scratch, 'bucket');
    const kept = new Map<string, { value: string; ttl?: number }>();
    const env = {
      BUCKET: directoryBucket(bucket),
      PREFIX: 'toolchain',
      CACHE: {
        get: async (key: string) => kept.get(key)?.value ?? null,
        put: async (key: string, value: string, options?: { expirationTtl?: number }) =>
          void kept.set(key, { value, ttl: options?.expirationTtl }),
      },
    } as Env;
    const get = async (path: string) => {
      const pending: Promise<unknown>[] = [];
      const response = await worker.fetch(new Request(`https://deus.test${path}`), env, {
        waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      });
      await Promise.all(pending);
      return response.text();
    };
    const shown = JSON.parse(await get('/v1/toolchain/live/main'));
    expect(kept.get('head:toolchain:main')).toEqual({ value: JSON.stringify(shown), ttl: 60 });
    const index = await get(`/v1/toolchain/live/${shown.causal}/index.json`);
    expect(kept.get(`toolchain/live/${shown.causal}/index.json`)).toEqual({ value: index, ttl: 604_800 });
    // Once kept, both are answered from KV.
    kept.set('head:toolchain:main', { value: JSON.stringify({ branch: 'main', causal: 'kept' }) });
    expect(JSON.parse(await get('/v1/toolchain/live/main')).causal).toBe('kept');
    kept.set(`toolchain/live/${shown.causal}/index.json`, { value: '{"kept":true}' });
    expect(await get(`/v1/toolchain/live/${shown.causal}/index.json`)).toBe('{"kept":true}');
    // The app's files are served without looking up a head.
    expect(await get('/app.js')).toContain('DEUS_LIVE');

    // The front page lists the projects with their counts, from a summary of each shown head (D200).
    kept.delete('head:toolchain:main');
    expect(await get('/')).toContain('hub.js');
    const projects = JSON.parse(await get('/v1/_projects'));
    // KV holds a stand-in for this index (above), so the drawn one is read from the bucket.
    const drawnIndex = JSON.parse(readFileSync(join(bucket, 'toolchain', 'live', shown.causal, 'index.json'), 'utf8'));
    expect(projects).toEqual([
      {
        address: '@dxos/toolchain',
        causal: shown.causal,
        branch: 'main',
        definitions: drawnIndex.meta.definitions,
        tasks: drawnIndex.meta.tasks,
        open: drawnIndex.meta.open,
        features: drawnIndex.meta.features ?? 0,
        namespaces: expect.any(Array),
        summaryVersion: 2,
        kinds: expect.objectContaining({
          term: drawnIndex.names.filter((entry: { kind: string }) => entry.kind === 'term').length,
        }),
      },
    ]);
    expect(kept.get('projects')?.ttl).toBe(60);
  });

  test(
    'a pushed head is checked to descend from the head before it (D201)',
    { timeout: 120_000 },
    async ({ expect }) => {
      const bucket = join(scratch, 'bucket');
      const env = { BUCKET: directoryBucket(bucket), PREFIX: 'toolchain' } as Env;
      const head = readFileSync(join(bucket, 'toolchain', 'heads', 'main'), 'utf8').trim();
      // Drawing the head's index keeps its first-parent chain beside it, which gives its ancestors.
      const pending: Promise<unknown>[] = [];
      await worker.fetch(new Request(`https://deus.test/v1/toolchain/live/${head}/index.json`), env, {
        waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      });
      await Promise.all(pending);
      const chain: string[] = JSON.parse(readFileSync(join(bucket, 'toolchain', 'live', head, 'chain.json'), 'utf8'));
      const log = (at: number, causal: string, previous: string | null) => {
        mkdirSync(join(bucket, 'toolchain', 'headlog', 'main'), { recursive: true });
        writeFileSync(
          join(bucket, 'toolchain', 'headlog', 'main', `${String(at).padStart(13, '0')}-${causal}`),
          JSON.stringify({ causal, previous }),
        );
      };
      log(1, head, chain[2]);
      expect(await checkHistory(env, 'toolchain', 'main', head)).toMatchObject({ ok: true, previous: chain[2] });
      // A head whose history does not reach the previous one is what a push that drops history leaves.
      const elsewhere = 'f'.repeat(64);
      log(2, chain[1], elsewhere);
      const lost = await checkHistory(env, 'toolchain', 'main', chain[1]);
      expect(lost).toMatchObject({ ok: false, previous: elsewhere });
      expect(lost.why).toContain('dropped its history');
      expect(JSON.parse(readFileSync(join(bucket, 'toolchain', 'checks', `${chain[1]}.json`), 'utf8')).ok).toBe(false);
    },
  );

  test('the Worker ships the explorer app as platform/explorer has it', ({ expect }) => {
    // `node scripts/build-worker.mjs` rewrites the module after the app changes.
    for (const name of ['index.html', 'app.js', 'app.css'] as const) {
      expect(appFiles[name], name).toBe(readFileSync(join(root, 'platform/explorer', name), 'utf8'));
    }
    for (const name of ['hub.html', 'hub.js'] as const) {
      expect(hubFiles[name], name).toBe(readFileSync(join(root, 'platform/explorer', name), 'utf8'));
    }
  });
});
