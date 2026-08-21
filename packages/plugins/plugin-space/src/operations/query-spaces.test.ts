//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpacePlugin } from '#plugin';
import { SpaceOperation } from '#types';

describe('SpaceOperation.QuerySpaces', () => {
  test('lists the spaces the identity can work in, by name', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin.make({}), SpacePlugin({})] });

    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesReady);
    await client.spaces.create({ name: 'Notes' });

    const { spaces } = await harness.runPromise(Operation.invoke(SpaceOperation.QuerySpaces, {}));

    const notes = spaces.find((space) => space.name === 'Notes');
    expect(notes).toBeDefined();
    // Private until shared, which is what tells a caller whether a write is visible to anyone else.
    expect(notes?.memberCount).toBe(1);
    // Every listed space is addressable as a target.
    expect(spaces.every((space) => space.spaceId.length > 0)).toBe(true);
  });
});
