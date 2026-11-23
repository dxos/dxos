//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as WnfsPlugin from '#meta';

await Harness.preload({ plugins: [ClientPlugin.make({}), WnfsPlugin.make()] });

describe('WnfsPlugin', () => {
  test('activates without errors', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), WnfsPlugin.make()],
    });

    expect(harness.manager.getActive()).toBeInstanceOf(Array);
  });
});
