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
  /** The space designated as the default target for unscoped content, and first in `client.spaces.get()`. */
  defaultSpace: Space;
  settingsSpace: Space;
};

export type InitializeIdentityOptions = {
  /** Profile display name for the generated identity, so stories show a real name (not a raw DID). */
  displayName?: string;
};

/**
 * Create an identity and the spaces every profile starts with, matching what the app does on first
 * run. Returns the identity and spaces for further setup.
 *
 * Only the identity is this helper's own work: the spaces come from
 * {@link AppSpace.setupIdentitySpaces}, the same call the app's identity-created module makes, so
 * a story's profile cannot drift from a real one.
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
    const spaces = yield* AppSpace.setupIdentitySpaces(client);

    return { identity, ...spaces };
  });
