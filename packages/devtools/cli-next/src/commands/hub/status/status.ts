//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Config, Console, Effect } from 'effect';
import { CommandConfig } from '../../../services';

export const status = Command.make(
  'status',
  {},
  Effect.fn(function* () {
    if (yield* CommandConfig.isJson) {
      return yield* Console.log({ status: 'ok' });
    } else {
      return yield* Console.log('ok');
    }
  }),
).pipe(Command.withDescription('Stub status.'));
