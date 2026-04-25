//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { serializeManifest } from './manifest';

describe('serializeManifest', () => {
  test('serializes plugin meta plus moduleFile', ({ expect }) => {
    const json = serializeManifest(
      { id: 'org.example.plugin', name: 'Example', description: 'Demo', tags: ['new'] },
      { moduleFile: 'plugin.mjs' },
    );
    expect(JSON.parse(json)).toEqual({
      id: 'org.example.plugin',
      name: 'Example',
      description: 'Demo',
      tags: ['new'],
      moduleFile: 'plugin.mjs',
    });
  });
});
