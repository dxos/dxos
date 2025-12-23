//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { DeviceType } from '@dxos/protocols/proto/dxos/halo/credentials';

import { CommandConfig } from '@dxos/cli-util';
import { print } from '@dxos/cli-util';
import { printDevice } from '../util';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.spaces.waitUntilReady());

  const device = client.halo.device;
  if (!device) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'No device found' }, null, 2));
    } else {
      yield* Console.log('No device found.');
    }
    return;
  }

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          deviceKey: device.deviceKey.toHex(),
          profile: {
            ...device.profile,
            type: device.profile?.type ? DeviceType[device.profile?.type] : 'UNKNOWN',
          },
        },
        null,
        2,
      ),
    );
  } else {
    yield* Console.log(print(printDevice(device)));
  }
});

export const info = Command.make('info', {}, handler).pipe(Command.withDescription('Show device info.'));
