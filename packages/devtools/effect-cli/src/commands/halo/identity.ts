//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { ClientService } from '../../services';

export const identity = Command.make('identity', {}, () =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const identity = client.halo.identity.get();
    if (!identity) {
      yield* Console.log('Identity not initialized.');
    } else {
      yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
      const { identityKey, profile } = identity;
      yield* Console.log('Identity key:', identityKey.toHex());
      yield* Console.log('Display name:', profile?.displayName);
    }
  }),
);
