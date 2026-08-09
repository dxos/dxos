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

import { EdgeReplicationError } from '../errors';
import { SpaceOperation } from './definitions';

describe('SpaceOperation.Create', () => {
  // `updateSpace` commits the preference on the host, so what can fail afterwards is only the local
  // snapshot catching up. Failing the create on that discarded a space that already existed and left
  // the dialog on a generic error — measured on firefox in CI run 31313863039. The space must come
  // back regardless; the preference converges on its own.
  test('a failing edge replication preference does not fail the create', async ({ expect }) => {
    const harness = await createComposerTestApp({ plugins: [ClientPlugin({}), SpacePlugin({})] });
    await using _harness = harness;

    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesReady);

    const create = client.spaces.create.bind(client.spaces);
    client.spaces.create = async (...args: Parameters<typeof create>) =>
      withFailingEdgeReplication(await create(...args));

    const outcome = await harness.runPromise(
      Operation.invoke(SpaceOperation.Create, { name: 'Test', edgeReplication: true }).pipe(
        Effect.catchAllCause((cause) => Effect.succeed(Cause.squash(cause))),
      ),
    );

    expect(outcome).not.toBeInstanceOf(EdgeReplicationError);
    expect((outcome as { space?: Space }).space).toBeDefined();
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
