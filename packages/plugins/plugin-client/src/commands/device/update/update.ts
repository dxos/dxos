//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';

import { CommandConfig } from '@dxos/cli-util';
import { print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { buf } from '@dxos/protocols/buf';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { DeviceSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { DeviceProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Device } from '@dxos/protocols/proto/dxos/client/services';

import { printDevice } from '../util';

export const handler = Effect.fn(function* ({ label }: { label: string }) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
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

  const updatedDevice = decodeCompat<Device>(
    DeviceSchema,
    buf.toBinary(
      DeviceSchema,
      yield* Effect.tryPromise(() =>
        devicesService.updateDevice(
          buf.fromBinary(DeviceProfileDocumentSchema, encodeCompat(DeviceProfileDocumentSchema, updatedProfile)),
        ),
      ),
    ),
  );

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
    label: Options.string('label').pipe(Options.withDescription('The device label.')),
  },
  handler,
).pipe(Command.withDescription('Update device label.'));
