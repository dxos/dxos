//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Effect } from 'effect';

import { ClientService } from '../../services';

export const identity = Command.make('identity', {}, () =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const identity = client.halo.identity.get();
    if (!identity) {
      // TODO(wittjosiah): Look into @effect/printer-ansi for colored output.
      yield* Effect.log('Identity not initialized.');
    } else {
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      const { identityKey, profile } = identity;
      yield* Effect.log('Identity key:', identityKey.toHex());
      yield* Effect.log('Display name:', profile?.displayName);
    }
  }),
);
