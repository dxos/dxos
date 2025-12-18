//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

import { CommandConfig } from '../../../services';
import { FormBuilder, print } from '../../../util';

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
    const builder = FormBuilder.of({ title: 'HALO Keys' });
    if (identity) {
      builder.set({ key: 'identityKey', value: identity.identityKey.truncate() });
    }
    if (device) {
      builder.set({ key: 'deviceKey', value: device.deviceKey.truncate() });
    }
    yield* Console.log(print(builder.build()));
  }
});

export const keys = Command.make('keys', {}, handler).pipe(Command.withDescription('Show HALO keys.'));
