//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';

export type InitializeIdentityResult = {
  identity: Identity;
  // TODO(burdon): Rename to space.
  personalSpace: Space;
  settingsSpace: Space;
};

export type InitializeIdentityOptions = {
  /** Profile display name for the generated identity, so stories show a real name (not a raw DID). */
  displayName?: string;
};

/**
 * Create an identity, the hidden settings space, and the personal space it designates.
 * Returns the identity and spaces for further setup.
 */
export const initializeIdentity = (
  client: Client,
  { displayName }: InitializeIdentityOptions = {},
): Effect.Effect<InitializeIdentityResult, never, never> =>
  Effect.gen(function* () {
    // The harness boots with client initialization forked off startup; `halo`/`spaces` are
    // unreadable until it completes.
    yield* Effect.promise(() => client.waitUntilInitialized());
    const identity = yield* Effect.promise(() => client.halo.createIdentity(displayName ? { displayName } : {}));
    const settingsSpace = yield* Effect.promise(() =>
      client.spaces.create(
        { name: 'Settings' },
        { tags: [AppSpace.SETTINGS_SPACE_TAG], membershipPolicy: MembershipPolicy.LOCKED },
      ),
    );
    yield* Effect.promise(() => settingsSpace.waitUntilReady());

    const personalSpace = yield* Effect.promise(() =>
      client.spaces.create({ name: 'Personal' }, { membershipPolicy: MembershipPolicy.LOCKED }),
    );
    yield* Effect.promise(() => personalSpace.waitUntilReady());
    AppSpace.setPersonalSpaceId(settingsSpace, personalSpace.id);

    return {
      identity,
      personalSpace,
      settingsSpace,
    };
  });
