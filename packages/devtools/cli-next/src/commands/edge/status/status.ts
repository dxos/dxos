//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { createEdgeIdentity } from '@dxos/client/edge';

import { ClientService, CommandConfig } from '../../../services';

export const getStatus = () =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const identity = createEdgeIdentity(client);
    client.edge.setIdentity(identity);
    const status = yield* Effect.tryPromise(() => client.edge.getStatus());

    if (yield* CommandConfig.isJson) {
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
