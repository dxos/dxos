//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { type Space } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpacePlugin } from '#plugin';
import { SpaceOperation } from '#types';

describe('SpaceOperation.Create', () => {
  // `updateSpace` commits the preference on the host, so what can fail afterwards is only the local
  // snapshot catching up; the space must come back regardless, since the preference converges on its own.
  test('a failing edge replication preference does not fail the create', async ({ expect }) => {
    const harness = await createComposerTestApp({ plugins: [ClientPlugin.make({}), SpacePlugin({})] });
    await using _harness = harness;

    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesReady);

    const create = client.spaces.create.bind(client.spaces);
    client.spaces.create = async (...args: Parameters<typeof create>) =>
      withFailingEdgeReplication(await create(...args));

    const outcome = await harness.runPromise(
      Operation.invoke(SpaceOperation.Create, { name: 'Test', edgeReplication: true }).pipe(
        Effect.catchCause((cause) => Effect.succeed(Cause.squash(cause))),
      ),
    );

    expect(outcome).toMatchObject({ space: expect.anything() });
  });
});

/** A space whose edge-replication preference always rejects, standing in for a transient failure. */
const withFailingEdgeReplication = (space: Space): Space =>
  new Proxy(space, {
    get: (target, property, receiver) =>
      property === 'internal'
        ? {
            ...target.internal,
            setEdgeReplicationPreference: () => Promise.reject(new Error('edge unavailable')),
          }
        : Reflect.get(target, property, receiver),
  });
