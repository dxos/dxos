//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as PluginManifest from './plugin-manifest.ts';

describe('PluginManifest', () => {
  describe('parse', () => {
    test('resolves entry and assets relative to manifest URL', ({ expect }) => {
      const resolved = PluginManifest.parse('https://example.com/plugins/foo/manifest.json', {
        key: 'com.example.foo',
        name: 'Foo',
        version: '1.0.0',
        assets: ['index.mjs', 'style.css', 'chunks/lib-abc.js'],
      });
      expect(resolved.key).toBe('com.example.foo');
      expect(resolved.dev).toBe(false);
      expect(resolved.entryUrl).toBe('https://example.com/plugins/foo/index.mjs');
      expect(resolved.assetUrls).toEqual([
        'https://example.com/plugins/foo/index.mjs',
        'https://example.com/plugins/foo/style.css',
        'https://example.com/plugins/foo/chunks/lib-abc.js',
      ]);
    });

    test('throws if it lists neither modules nor the entry module in assets', ({ expect }) => {
      expect(() =>
        PluginManifest.parse('https://example.com/manifest.json', {
          key: 'a',
          name: 'A',
          version: '0.0.1',
          assets: ['style.css'],
        }),
      ).toThrow();
    });

    test('a manifest that lists its modules defines the plugin without an entry module', ({ expect }) => {
      const resolved = PluginManifest.parse('https://example.com/plugins/foo/manifest.json', {
        key: 'com.example.foo',
        name: 'Foo',
        description: 'A plugin.',
        version: '1.0.0',
        assets: ['operations-abc.mjs'],
        modules: [
          {
            id: 'Operations',
            url: './operations-abc.mjs',
            activatesOn: { type: 'one-of', events: [{ id: 'dxn:com.example.foo.event.start' }] },
            requires: [],
            provides: [{ identifier: 'org.dxos.app-framework.capability.operationHandler', arity: 'multi' }],
            environments: ['browser', 'workerd'],
          },
        ],
      });
      expect(resolved.definition?.plugin).toEqual({ key: 'com.example.foo', name: 'Foo', description: 'A plugin.' });
      expect(resolved.definition?.modules).toMatchObject([{ id: 'Operations', url: './operations-abc.mjs' }]);
    });

    test('throws on missing required fields', ({ expect }) => {
      expect(() =>
        PluginManifest.parse('https://example.com/manifest.json', {
          name: 'A',
          version: '0.0.1',
          assets: ['index.mjs'],
        }),
      ).toThrow();
    });

    test('devEntry flips dev mode and resolves the entry against the manifest URL', ({ expect }) => {
      const resolved = PluginManifest.parse('http://localhost:3967/manifest.json', {
        key: 'com.example.foo',
        name: 'Foo',
        version: '0.0.0-dev',
        assets: [],
        devEntry: 'src/plugin.tsx',
      });
      expect(resolved.dev).toBe(true);
      expect(resolved.entryUrl).toBe('http://localhost:3967/src/plugin.tsx');
      expect(resolved.assetUrls).toEqual([]);
    });

    test('devEntry waives the canonical-entry-in-assets requirement', ({ expect }) => {
      // No `index.mjs` in assets — would throw without devEntry.
      expect(() =>
        PluginManifest.parse('http://localhost:3967/manifest.json', {
          key: 'a',
          name: 'A',
          version: '0.0.0-dev',
          assets: [],
          devEntry: 'src/plugin.tsx',
        }),
      ).not.toThrow();
    });
  });
});
