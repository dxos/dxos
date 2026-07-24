//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AppSpace } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';

export type InitializeIdentityResult = {
  identity: Identity;
  // TODO(burdon): Rename to space.
  personalSpace: Space;
};

export type InitializeIdentityOptions = {
  /** Profile display name for the generated identity, so stories show a real name (not a raw DID). */
  displayName?: string;
};

/**
 * Create an identity and a personal space.
 * Returns the identity and space for further setup.
 */
export const initializeIdentity = (
  client: Client,
  { displayName }: InitializeIdentityOptions = {},
): Effect.Effect<InitializeIdentityResult, never, never> =>
  Effect.gen(function* () {
    const identity = yield* Effect.promise(() => client.halo.createIdentity(displayName ? { displayName } : {}));
    const personalSpace = yield* Effect.promise(() =>
      client.spaces.create({}, { tags: [AppSpace.PERSONAL_SPACE_TAG] }),
    );
    yield* Effect.promise(() => personalSpace.waitUntilReady());
    return {
      identity,
      personalSpace,
    };
  });
