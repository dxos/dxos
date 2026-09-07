//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
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
    expect(snapshot.toasts).toEqual([]);
    expect(snapshot.plugins.installed).toBeGreaterThan(0);
    expect(snapshot.plugins.active).toBeGreaterThan(0);
    expect(snapshot.plugins.enabled).toBeLessThanOrEqual(snapshot.plugins.installed);
  });

  test('reports the spaces and the errors logged since a timestamp', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), SpacePlugin({}), DebugPlugin()],
    });
    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesReady);

    const before = Date.now();
    log.error('snapshot test error');
    const snapshot = await harness.runPromise(Operation.invoke(DebugOperation.Snapshot, { since: before }));

    expect(snapshot.spaces.length).toBeGreaterThan(0);
    expect(snapshot.spaces.some((space) => space.default)).toBe(true);
    expect(snapshot.spaces.every((space) => space.state === 'SPACE_READY')).toBe(true);
    expect(snapshot.errors.map((error) => error.message)).toContain('snapshot test error');

    const later = await harness.runPromise(Operation.invoke(DebugOperation.Snapshot, { since: Date.now() }));
    expect(later.errors).toEqual([]);
  });
});
