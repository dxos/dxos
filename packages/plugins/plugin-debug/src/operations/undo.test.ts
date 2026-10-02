//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import * as Harness from '@dxos/plugin-testing/Harness';

import { DebugPlugin } from '#plugin';
import { DebugOperation } from '#types';

describe('DebugOperation.Undo', () => {
  test('fails when there is nothing to undo', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DebugPlugin()] });

    await expect(harness.runPromise(Operation.invoke(DebugOperation.Undo, {}))).rejects.toThrow('Nothing to undo');
  });
});
