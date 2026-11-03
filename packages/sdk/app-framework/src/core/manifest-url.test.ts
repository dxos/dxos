//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { afterEach, vi } from 'vitest';

import * as Plugin from './plugin.ts';

const MANIFEST_URL = 'https://composer.test/plugins/org.dxos.plugin.test/manifest.json';

const manifest = {
  plugin: { key: 'org.dxos.plugin.test', name: 'Test' },
  modules: [
    {
      id: 'Value',
      url: '../../assets/value-abc123.js',
      activatesOn: { id: 'dxn:org.dxos.test.start' },
      requires: [],
      provides: [{ identifier: 'org.dxos.test.value', arity: 'single' }],
      adapter: { url: '../../assets/adapter-def456.js', args: { name: 'value' } },
    },
    { id: 'Absolute', url: '/@fs/src/absolute.ts', requires: [], provides: [] },
  ],
};

const serve = (response: Response) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response),
  );

describe('Plugin.fetchManifest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect('resolves module and adapter URLs against the manifest URL', () =>
    Effect.gen(function* () {
      serve(Response.json(manifest));
      const loaded = yield* Plugin.fetchManifest(MANIFEST_URL);
      expect(loaded.plugin.key).toBe('org.dxos.plugin.test');
      expect(loaded.modules.map(({ url }) => url)).toEqual([
        'https://composer.test/assets/value-abc123.js',
        'https://composer.test/@fs/src/absolute.ts',
      ]);
      expect(loaded.modules[0].adapter).toEqual({
        url: 'https://composer.test/assets/adapter-def456.js',
        args: { name: 'value' },
      });
      expect(loaded.modules[0].provides).toEqual([{ identifier: 'org.dxos.test.value', arity: 'single' }]);
    }),
  );

  it.effect('fails with http-error when the manifest is missing', () =>
    Effect.gen(function* () {
      serve(new Response('not found', { status: 404 }));
      const error = yield* Plugin.fetchManifest(MANIFEST_URL).pipe(Effect.flip);
      expect(error).toBeInstanceOf(Plugin.ManifestError);
      expect(error.context).toMatchObject({ url: MANIFEST_URL, reason: 'http-error', status: 404 });
    }),
  );

  it.effect('fails with invalid when the JSON is not a manifest', () =>
    Effect.gen(function* () {
      serve(Response.json({ plugin: { key: 'org.dxos.plugin.test', name: 'Test' }, modules: [{ id: 'Value' }] }));
      const error = yield* Plugin.fetchManifest(MANIFEST_URL).pipe(Effect.flip);
      expect(error.context).toMatchObject({ url: MANIFEST_URL, reason: 'invalid' });
    }),
  );
});
