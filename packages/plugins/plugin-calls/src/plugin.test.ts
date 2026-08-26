//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { CallsPlugin } from '#plugin';

describe('CallsPlugin', () => {
  // Calls own no persistent schema, so this is a load smoke test (activation rethrows on error).
  test('loads and is enabled', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), CallsPlugin()],
    });

    expect(harness.manager.getEnabled()).toContain(meta.profile.key);
  });
});
