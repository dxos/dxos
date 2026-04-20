//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { emitManifest } from './emit-manifest';

describe('emitManifest', () => {
  test('serializes plugin meta plus moduleFile', ({ expect }) => {
    const json = emitManifest(
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
