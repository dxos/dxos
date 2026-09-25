//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { WnfsPlugin } from '#plugin';

describe('WnfsPlugin', () => {
  test('activates without errors', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), WnfsPlugin()],
    });

    expect(harness.manager.getActive()).toBeInstanceOf(Array);
  });
});
