//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';

/**
 * Create an identity and wait for the default space to be ready.
 * Returns the identity and default space for further setup.
 */
export const initializeIdentity = (
  client: Client,
): Effect.Effect<{ identity: Identity; defaultSpace: Space }, never, never> =>
  Effect.gen(function* () {
    const identity = yield* Effect.promise(() => client.halo.createIdentity());
    yield* Effect.promise(() => client.spaces.waitUntilReady());
    const defaultSpace = client.spaces.default;
    yield* Effect.promise(() => defaultSpace.waitUntilReady());
    return { identity, defaultSpace };
  });
