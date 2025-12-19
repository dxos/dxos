//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

import { CommandConfig } from '../../../services';
import { print } from '../../../util';
import { printDevice } from '../util';

export const handler = Effect.fn(function* ({ label }: { label: string }) {
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

  const updatedProfile = {
    ...device.profile,
    label,
  };

  const devicesService = client.services.services.DevicesService;
  if (!devicesService) {
    if (json) {
      yield* Console.log(JSON.stringify({ error: 'DevicesService not found' }, null, 2));
    } else {
      yield* Console.log('DevicesService not found.');
    }
    return;
  }

  const updatedDevice = yield* Effect.tryPromise(() => devicesService.updateDevice(updatedProfile));

  if (json) {
    yield* Console.log(
      JSON.stringify(
        {
          deviceKey: updatedDevice.deviceKey.toHex(),
          profile: updatedDevice.profile,
        },
        null,
        2,
      ),
    );
  } else {
    yield* Console.log(print(printDevice(updatedDevice)));
  }
});

export const update = Command.make(
  'update',
  {
    label: Options.text('label').pipe(Options.withDescription('The device label.')),
  },
  handler,
).pipe(Command.withDescription('Update device label.'));
