//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { serializeManifest } from './manifest';

describe('serializeManifest', () => {
  test('serializes plugin meta plus assets', ({ expect }) => {
    const json = serializeManifest(
      { id: 'org.example.plugin', name: 'Example', description: 'Demo', tags: ['new'], version: '1.2.3' },
      { assets: ['index.mjs', 'style.css', 'chunks/lib-abc.js'] },
    );
    expect(JSON.parse(json)).toEqual({
      id: 'org.example.plugin',
      name: 'Example',
      description: 'Demo',
      tags: ['new'],
      version: '1.2.3',
      assets: ['index.mjs', 'style.css', 'chunks/lib-abc.js'],
    });
  });
});
