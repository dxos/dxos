//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Config, Console, Effect, Option } from 'effect';

import { createEdgeIdentity } from '@dxos/client/edge';

import { ClientService } from '../../../services';

export const getStatus = () =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const identity = yield* Effect.try({
      try: () => createEdgeIdentity(client),
      catch: (err) => {
        return err;
      },
    });
    client.edge.setIdentity(identity);
    const status = yield* Effect.tryPromise(() => client.edge.getStatus());

    const json = yield* Config.boolean('JSON').pipe(Config.withDefault(false));
    if (json) {
      yield* Console.log(JSON.stringify(status, null, 2));
    } else if (status.problems.length > 0) {
      for (const problem of status.problems) {
        yield* Console.error(problem);
      }
    } else {
      yield* Console.log('No problems found.');
    }
  }).pipe(
    // TODO(wittjosiah): Tagged error.
    Effect.catchSome((error) => {
      if (error instanceof Error && error.message === 'Identity not available') {
        // TODO(wittjosiah): Error coloring for logs.
        return Option.some(Console.error(error.message));
      } else {
        return Option.none();
      }
    }),
  );

// TODO(wittjosiah): Admin functionality to provide to specify an identity.
export const status = Command.make('status', {}, getStatus).pipe(
  Command.withDescription('Get the EDGE status for the current identity.'),
);
