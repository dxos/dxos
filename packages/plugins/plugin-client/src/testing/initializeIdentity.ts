//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { setPersonalSpace } from '@dxos/app-toolkit';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';

/**
 * Create an identity and a personal space.
 * Returns the identity and space for further setup.
 */
export const initializeIdentity = (
  client: Client,
): Effect.Effect<{ identity: Identity; defaultSpace: Space }, never, never> =>
  Effect.gen(function* () {
    const identity = yield* Effect.promise(() => client.halo.createIdentity());
    const defaultSpace = yield* Effect.promise(() => client.spaces.create());
    yield* Effect.promise(() => defaultSpace.waitUntilReady());
    // TODO: Use space tags to mark as personal space.
    setPersonalSpace(defaultSpace);
    return { identity, defaultSpace };
  });
