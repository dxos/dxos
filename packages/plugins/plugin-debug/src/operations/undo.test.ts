//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as DebugPlugin from '#meta';
import { DebugOperation } from '#types';

await Harness.preload({ plugins: [DebugPlugin.make()] });

describe('DebugOperation.Undo', () => {
  test('fails when there is nothing to undo', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DebugPlugin.make()] });

    await expect(harness.runPromise(Operation.invoke(DebugOperation.Undo, {}))).rejects.toThrow('Nothing to undo');
  });
});
