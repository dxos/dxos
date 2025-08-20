//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { Common } from '../../options';

export const status = Command.make(
  'status',
  {
    json: Common.json,
  },
  Effect.fn(function* ({ json }) {
    if (json) {
      return yield* Console.log({ status: 'ok' });
    } else {
      return yield* Console.log('ok');
    }
  }),
).pipe(Command.withDescription('Stub status.'));
