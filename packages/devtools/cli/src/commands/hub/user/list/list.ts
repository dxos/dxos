//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';

import { CommandConfig } from '@dxos/cli-util';

import { formatHubError, hubApiRequest } from '../../util.ts';

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const result = yield* hubApiRequest<unknown>('GET', '/api/waitlist').pipe(
      Effect.catch((error) => Effect.fail(new Error(formatHubError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      return yield* Console.log(JSON.stringify(result, null, 2));
    }

    // TODO(burdon): Output table. Look at @effect/printer.
    const count = countEntries(result);
    return yield* Console.log(count === undefined ? 'Unexpected response.' : `${count} waitlist entries`);
  }),
).pipe(Command.withDescription('List hub users.'));

/** Narrows the untyped hub response; `undefined` when it does not carry an `entries` array. */
const countEntries = (result: unknown): number | undefined =>
  typeof result === 'object' && result !== null && 'entries' in result && Array.isArray(result.entries)
    ? result.entries.length
    : undefined;
