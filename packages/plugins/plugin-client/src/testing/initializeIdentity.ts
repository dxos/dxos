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
  /** The space story/test content is seeded into, and the first entry in `client.spaces`. */
  defaultSpace: Space;
  /** Only created when `settingsSpace` is requested. */
  settingsSpace?: Space;
};

export type InitializeIdentityOptions = {
  /** Profile display name for the generated identity, so stories show a real name (not a raw DID). */
  displayName?: string;
  /**
   * Create the settings space first and designate the content space, as the app does on first run.
   * Opt in only when the subject under test reads app configuration or resolves the *designated*
   * default space: doing it the app's way puts the settings space ahead of the content space in
   * `client.spaces`, so `useSpaces()[0]` is no longer the space the story seeded.
   */
  settingsSpace?: boolean;
};

/**
 * Create an identity and one empty space to seed content into.
 *
 * Deliberately not the app's first-run shape: a story wants the least setup that still exercises its
 * subject, and the space it seeds being simply the first space keeps the story's own lookup a
 * one-liner. Pass `settingsSpace` for the cases that genuinely need the pair.
 */
export const initializeIdentity = (
  client: Client,
  { displayName, settingsSpace }: InitializeIdentityOptions = {},
): Effect.Effect<InitializeIdentityResult, never, never> =>
  Effect.gen(function* () {
    // The harness boots with client initialization forked off startup; `halo`/`spaces` are
    // unreadable until it completes.
    yield* Effect.promise(() => client.waitUntilInitialized());
    const identity = yield* Effect.promise(() => client.halo.createIdentity(displayName ? { displayName } : {}));

    if (settingsSpace) {
      const spaces = yield* AppSpace.setupIdentitySpaces(client);
      return { identity, ...spaces };
    }

    // Created before anything else so it is `client.spaces[0]`: plugin-space still adds a settings
    // space of its own on `SpacesReady`, and a story's `useSpaces()[0]` is only the seeded space
    // while that one lands second.
    //
    // Tagged as the pre-settings-space default, which is exactly this profile's shape: without a
    // designation `resolveDefaultSpace` parks forever, so the `SpacesReady` activation never
    // completes and is always interrupted at teardown.
    const defaultSpace = yield* Effect.promise(() => client.spaces.create({}, { tags: [AppSpace.PERSONAL_SPACE_TAG] }));
    yield* Effect.promise(() => defaultSpace.waitUntilReady());

    return { identity, defaultSpace };
  });
