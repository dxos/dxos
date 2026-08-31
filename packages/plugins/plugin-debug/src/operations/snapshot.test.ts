//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DebugPlugin } from '#plugin';
import { DebugOperation } from '#types';

describe('DebugOperation.Snapshot', () => {
  test('returns a degraded snapshot on a headless host', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [DebugPlugin()] });

    const snapshot = await harness.runPromise(Operation.invoke(DebugOperation.Snapshot, {}));

    // No deck plugin — the layout section degrades rather than failing the call.
    expect(snapshot.layout).toBeUndefined();
    // Attention is part of the harness core, so the section is present (and empty).
    expect(snapshot.attention).toEqual([]);
    expect(snapshot.planks).toEqual([]);
    expect(snapshot.surfaces).toEqual([]);
    expect(snapshot.plugins.installed).toBeGreaterThan(0);
    expect(snapshot.plugins.active).toBeGreaterThan(0);
    expect(snapshot.plugins.enabled).toBeLessThanOrEqual(snapshot.plugins.installed);
  });
});
