//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { WnfsPlugin } from '#plugin';

describe('WnfsPlugin', () => {
  test('activates without errors', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), WnfsPlugin()],
    });

    expect(harness.manager.getActive()).toBeInstanceOf(Array);
  });
});
