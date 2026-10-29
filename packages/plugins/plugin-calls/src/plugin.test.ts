//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as CallsPlugin from '#meta';

import { CallsNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), CallsPlugin.make()] });

describe('CallsPlugin', () => {
  // Calls own no persistent schema, so this is a load smoke test (activation rethrows on error).
  test('loads and is enabled', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), CallsPlugin.make()],
    });

    expect(harness.manager.getEnabled()).toContain(CallsNamespace.key);
  });
});
