//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { Plugin } from '../core';
import { type BuildMeta, serializeManifest } from './manifest';

// Build a `BuildMeta` (runtime `Meta` plus the build-time `version`, which may be a
// non-semver dev tag and so lives outside the `key` DXN).
const buildMeta = (options: Plugin.MakeMetaOptions, version: string): BuildMeta => ({
  ...Plugin.makeMeta(options).profile,
  version,
});

describe('serializeManifest', () => {
  test('serializes plugin meta plus assets', ({ expect }) => {
    const json = serializeManifest(
      buildMeta({ key: DXN.make('org.example.plugin'), name: 'Example', description: 'Demo', tags: ['new'] }, '1.2.3'),
      { assets: ['index.mjs', 'style.css', 'chunks/lib-abc.js'] },
    );
    expect(JSON.parse(json)).toEqual({
      key: 'org.example.plugin',
      name: 'Example',
      description: 'Demo',
      tags: ['new'],
      version: '1.2.3',
      assets: ['index.mjs', 'style.css', 'chunks/lib-abc.js'],
    });
  });

  test('includes devEntry when supplied (dev-server manifest)', ({ expect }) => {
    const json = serializeManifest(buildMeta({ key: DXN.make('org.example.plugin'), name: 'Example' }, '0.0.0-dev'), {
      assets: [],
      devEntry: 'src/plugin.tsx',
    });
    expect(JSON.parse(json)).toEqual({
      key: 'org.example.plugin',
      name: 'Example',
      version: '0.0.0-dev',
      assets: [],
      devEntry: 'src/plugin.tsx',
    });
  });

  test('omits devEntry from the output when undefined', ({ expect }) => {
    const json = serializeManifest(buildMeta({ key: DXN.make('org.example.plugin'), name: 'Example' }, '1.0.0'), {
      assets: ['index.mjs'],
    });
    expect(Object.keys(JSON.parse(json))).not.toContain('devEntry');
  });
});
