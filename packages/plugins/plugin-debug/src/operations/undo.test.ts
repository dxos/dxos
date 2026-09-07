//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DebugPlugin } from '#plugin';
import { DebugOperation } from '#types';

describe('DebugOperation.Undo', () => {
  test('fails when there is nothing to undo', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [DebugPlugin()] });

    await expect(harness.runPromise(Operation.invoke(DebugOperation.Undo, {}))).rejects.toThrow('Nothing to undo');
  });
});
