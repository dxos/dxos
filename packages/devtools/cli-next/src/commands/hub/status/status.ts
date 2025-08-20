//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Config, Console, Effect } from 'effect';

export const status = Command.make(
  'status',
  {},
  Effect.fn(function* () {
    const json = yield* Config.boolean('json');
    if (json) {
      return yield* Console.log({ status: 'ok' });
    } else {
      return yield* Console.log('ok');
    }
  }),
).pipe(Command.withDescription('Stub status.'));
