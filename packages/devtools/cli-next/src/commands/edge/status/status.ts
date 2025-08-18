//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Console, Effect } from 'effect';

export const status = Command.make(
  'status',
  {
    json: Options.boolean('json').pipe(Options.withDescription('Output in JSON format.')),
  },
  Effect.fn(function* ({ json }) {
    if (json) {
      return yield* Console.log({ status: 'ok' });
    } else {
      return yield* Console.log('ok');
    }
  }),
).pipe(Command.withDescription('Show EDGE services status.'));
