//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';

import { CommandConfig } from '@dxos/cli-util';
import { FormBuilder, print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { toPublicKey } from '@dxos/protocols/buf';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  const identity = client.halo.identity.get();
  const device = client.halo.device;

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          identityKey: toPublicKey(identity?.identityKey)?.toHex(),
          deviceKey: toPublicKey(device?.deviceKey)?.toHex(),
        },
        null,
        2,
      ),
    );
  } else {
    const builder = FormBuilder.make({ title: 'HALO Keys' }).pipe(
      FormBuilder.option('identityKey', Option.fromNullishOr(toPublicKey(identity?.identityKey)?.truncate())),
      FormBuilder.option('deviceKey', Option.fromNullishOr(toPublicKey(device?.deviceKey)?.truncate())),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const keys = Command.make('keys', {}, handler).pipe(Command.withDescription('Show HALO keys.'));
