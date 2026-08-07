//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';

export type InitializeIdentityResult = {
  identity: Identity;
  /** The space designated as the default target for unscoped content. */
  defaultSpace: Space;
  settingsSpace: Space;
};

export type InitializeIdentityOptions = {
  /** Profile display name for the generated identity, so stories show a real name (not a raw DID). */
  displayName?: string;
};

/**
 * Create an identity and the two spaces every profile starts with, matching what the app does on
 * first run. Returns the identity and spaces for further setup.
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
    const { settingsSpace, defaultSpace } = yield* AppSpace.setupIdentitySpaces(client);

    return { identity, defaultSpace, settingsSpace };
  });
