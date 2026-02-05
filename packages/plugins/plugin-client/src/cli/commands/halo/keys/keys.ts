//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { FormBuilder, print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.spaces.waitUntilReady());

  const identity = client.halo.identity.get();
  const device = client.halo.device;

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          identityKey: identity?.identityKey.toHex(),
          deviceKey: device?.deviceKey.toHex(),
        },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.make({ title: 'HALO Keys' }).pipe(
      FormBuilder.option('identityKey', Option.fromNullable(identity?.identityKey.truncate())),
      FormBuilder.option('deviceKey', Option.fromNullable(device?.deviceKey.truncate())),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const keys = Command.make('keys', {}, handler).pipe(Command.withDescription('Show HALO keys.'));
