//
// Copyright 2026 DXOS.org
//

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'vitest';

import { appFiles } from '../platform/worker/gen/explorer-app.mjs';
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
      return { body: bytes, size: whole.length, httpMetadata: {}, text: async () => new TextDecoder().decode(bytes) };
    },
    head: async (key) => (read(key) ? {} : null),
    put: async (key, value) => {
      mkdirSync(dirname(join(folder, key)), { recursive: true });
      writeFileSync(join(folder, key), value instanceof ArrayBuffer ? new Uint8Array(value) : value);
    },
    delete: async () => {},
    list: async ({ prefix }) => {
      let names: string[] = [];
      try {
        names = readdirSync(join(folder, prefix));
      } catch {}
      return { objects: names.map((name) => ({ key: `${prefix}${name}` })) };
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
      // What a causal shows never changes, so it is kept in the bucket after the first request.
      expect(readdirSync(join(bucket, 'toolchain', 'live', head)).sort()).toEqual(['chain.json', 'def', 'index.json']);
      // What the Worker read is kept as one snapshot, so a cold isolate starts from it.
      expect(readdirSync(join(bucket, 'toolchain', 'live'))).toContain('files.json.gz');
      const change = await get(`/v1/toolchain/live/${head}/change/${head}.json`);
      expect(change.message).toBe(site(`change/${head}.json`).message);
    },
  );

  test('the Worker ships the explorer app as platform/explorer has it', ({ expect }) => {
    // `node scripts/build-worker.mjs` rewrites the module after the app changes.
    for (const name of ['index.html', 'app.js', 'app.css'] as const) {
      expect(appFiles[name], name).toBe(readFileSync(join(root, 'platform/explorer', name), 'utf8'));
    }
  });
});
