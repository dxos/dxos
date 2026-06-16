//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { CallsPlugin } from '#plugin';

import { CallsPlugin as CallsPluginNode } from './CallsPlugin.node';
import { meta } from './meta';

describe('CallsPlugin', () => {
  // Calls own no persistent schema, so this is a load smoke test (activation rethrows on error).
  test('loads and is enabled', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), CallsPlugin()],
    });

    expect(harness.manager.getEnabled()).toContain(meta.id);
  });

  test('node variant loads and is enabled', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), CallsPluginNode()],
    });

    expect(harness.manager.getEnabled()).toContain(meta.id);
  });
});
