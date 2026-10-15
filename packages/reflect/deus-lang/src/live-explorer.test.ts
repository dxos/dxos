//
// Copyright 2026 DXOS.org
//

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, test } from 'vitest';

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
      writeFileSync(join(folder, key), value);
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
        file('area.deus', '/-- The area of a square. -/\ndef area (side : Int) : Int := side * side\n'),
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
        const response = await worker.fetch(new Request(`https://deus.test${path}`), env, { waitUntil: () => {} });
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
      const map = index.names.find((entry: { name: string }) => entry.name === 'List.map');
      expect(await get(`/v1/toolchain/live/${head}/def/${map.hash}.json`)).toEqual(site(`def/${map.hash}.json`));
      // What a causal shows never changes, so it is kept in the bucket after the first request.
      expect(readdirSync(join(bucket, 'toolchain', 'live', head)).sort()).toEqual(['def', 'index.json']);
      const change = await get(`/v1/toolchain/live/${head}/change/${head}.json`);
      expect(change.message).toBe(site(`change/${head}.json`).message);
    },
  );
});
