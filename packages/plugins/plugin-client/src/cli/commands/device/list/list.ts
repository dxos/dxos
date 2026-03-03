//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { printList } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

import { mapDevices, printDevices } from '../util';

export const handler = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.spaces.waitUntilReady());

  const devices = client.halo.devices.get();

  if (json) {
    yield* Console.log(JSON.stringify(mapDevices(devices), null, 2));
  } else {
    const formatted = printDevices(devices);
    yield* Console.log(printList(formatted));
  }
});

export const list = Command.make('list', {}, handler).pipe(Command.withDescription('List devices.'));
