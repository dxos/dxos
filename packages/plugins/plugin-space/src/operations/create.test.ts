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
  // `Process.fromOperation` runs handlers under `Effect.orDie`, so every failure reaches the caller
  // as a defect — which is why `CreateSpaceDialog` has to catch the cause, not just the error. What
  // this pins is the other half: the edge-replication step ran under `Effect.promise`, so the cause
  // carried a bare rejection with nothing naming the step it came from.
  test('a failing edge replication preference surfaces as EdgeReplicationError', async ({ expect }) => {
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

    expect(outcome).toBeInstanceOf(EdgeReplicationError);
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
