//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '../../../services';

export const handler = Effect.fn(function* () {
  const client = yield* ClientService;
  const identity = client.halo.identity.get();
  if (!identity) {
    // TODO(wittjosiah): Look into @effect/printer-ansi for colored output.
    yield* Console.log('Identity not initialized.');
  } else {
    yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
    const { identityKey, profile } = identity;
    yield* Console.log(`Identity key: ${identityKey.toHex()}`);
    yield* Console.log(`Display name: ${profile?.displayName}`);
  }
});

export const identity = Command.make('identity', {}, handler).pipe(
  Command.withDescription('Get the current identity.'),
);
