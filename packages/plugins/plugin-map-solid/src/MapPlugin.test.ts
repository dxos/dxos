//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';

import { MapPlugin } from '#plugin';

import { meta } from './meta';

describe('MapPlugin', () => {
  test('plugin initializes without error', async ({ expect }) => {
    // The node variant has no surface modules, so SetupReactSurface firing harmlessly is fine.
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), MapPlugin()],
    });
    expect(harness.manager.getEnabled()).toContain(meta.profile.key);
  });
});
