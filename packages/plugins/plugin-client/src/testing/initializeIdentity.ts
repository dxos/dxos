//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { setPersonalSpace } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';

/**
 * Create an identity and a personal space.
 * Returns the identity and space for further setup.
 */
export const initializeIdentity = (
  client: Client,
): Effect.Effect<{ identity: Identity; personalSpace: Space }, never, never> =>
  Effect.gen(function* () {
    const identity = yield* Effect.promise(() => client.halo.createIdentity());
    const personalSpace = yield* Effect.promise(() => client.spaces.create());
    yield* Effect.promise(() => personalSpace.waitUntilReady());
    // TODO: Use space tags to mark as personal space.
    setPersonalSpace(personalSpace);
    return { identity, personalSpace };
  });
