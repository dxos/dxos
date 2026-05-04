//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as PluginManifest from './plugin-manifest';

describe('PluginManifest', () => {
  describe('parse', () => {
    test('resolves entry and assets relative to manifest URL', ({ expect }) => {
      const resolved = PluginManifest.parse('https://example.com/plugins/foo/manifest.json', {
        id: 'com.example.foo',
        name: 'Foo',
        version: '1.0.0',
        assets: ['index.mjs', 'style.css', 'chunks/lib-abc.js'],
      });
      expect(resolved.id).toBe('com.example.foo');
      expect(resolved.entryUrl).toBe('https://example.com/plugins/foo/index.mjs');
      expect(resolved.assetUrls).toEqual([
        'https://example.com/plugins/foo/index.mjs',
        'https://example.com/plugins/foo/style.css',
        'https://example.com/plugins/foo/chunks/lib-abc.js',
      ]);
    });

    test('throws if the canonical entry filename is not listed in assets', ({ expect }) => {
      expect(() =>
        PluginManifest.parse('https://example.com/manifest.json', {
          id: 'a',
          name: 'A',
          version: '0.0.1',
          assets: ['style.css'],
        }),
      ).toThrow();
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
  });
});
