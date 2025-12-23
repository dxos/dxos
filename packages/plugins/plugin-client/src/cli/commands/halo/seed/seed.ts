//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

import { CommandConfig } from '@dxos/cli-util';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.spaces.waitUntilReady());

  const identityService = client.services.services.IdentityService;
  if (!identityService) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'IdentityService not found' }, null, 2));
    } else {
      yield* Console.log('IdentityService not found.');
    }
    return;
  }

  const result = yield* Effect.tryPromise(() => identityService.createRecoveryCredential({}));

  if (json) {
    yield* Console.log(JSON.stringify({ recoveryCode: result.recoveryCode }, null, 2));
  } else {
    yield* Console.log(result.recoveryCode);
  }
});

export const seed = Command.make('seed', {}, handler).pipe(
  Command.withDescription('Generate a seedphrase that can be used for identity recovery.'),
);
