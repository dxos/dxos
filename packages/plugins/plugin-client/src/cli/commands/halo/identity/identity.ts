//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

import { CommandConfig } from '@dxos/cli-util';
import { print } from '@dxos/cli-util';
import { printIdentity } from '../util';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  const identity = client.halo.identity.get();
  if (!identity) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'Identity not initialized' }, null, 2));
    } else {
      yield* Console.log('Identity not initialized.');
    }
  } else {
    yield* Effect.tryPromise(() => client.spaces.waitUntilReady());
    if (json) {
      yield* Console.log(
        JSON.stringify(
          {
            identityKey: identity.identityKey.toHex(),
            displayName: identity.profile?.displayName,
          },
          null,
          2,
        ),
      );
    } else {
      yield* Console.log(print(printIdentity(identity)));
    }
  }
});

export const identity = Command.make('identity', {}, handler).pipe(
  Command.withDescription('Get the current identity.'),
);
