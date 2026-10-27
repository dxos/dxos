//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { createTestApp } from '@dxos/app-framework/testing';

import * as MapPlugin from '#meta';

import { MapNamespace } from './namespace.ts';

describe('MapPlugin', () => {
  test('plugin initializes without error', async ({ expect }) => {
    // The node variant has no surface modules, so SetupReactSurface firing harmlessly is fine.
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin.make(), MapPlugin.make()],
    });
    expect(harness.manager.getEnabled()).toContain(MapNamespace.key);
  });
});
