//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';

export const handler = Effect.fn(function* (options: { humanize: boolean; truncate: boolean }) {
  const client = yield* ClientService;
  const data = yield* Effect.tryPromise(() => client.diagnostics(options));
  yield* Console.log(JSON.stringify(data, null, 2));
});

export const diagnostics = Command.make(
  'diagnostics',
  {
    humanize: Options.boolean('humanize').pipe(Options.withDescription('Humanize keys.'), Options.withDefault(false)),
    truncate: Options.boolean('truncate').pipe(Options.withDescription('Truncate keys.'), Options.withDefault(false)),
  },
  handler,
).pipe(Command.withDescription('Create diagnostics report.'));
