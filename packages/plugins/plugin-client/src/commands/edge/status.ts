//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Command from 'effect/unstable/cli/Command';

import { CommandConfig } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';

export const getStatus = () =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const identity = createEdgeIdentity(client);
    client.edge.http.setIdentity(identity);
    const status = yield* Effect.tryPromise(() => client.edge.http.getStatus(Context.default()));

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
    // TODO(wittjosiah): Error coloring for logs.
    Effect.catchIf(
      (error) => error instanceof Error && error.message === 'Identity not available',
      (error) => Console.error((error as Error).message),
    ),
  );

// TODO(wittjosiah): Admin functionality to provide to specify an identity.
export const status = Command.make('status', {}, getStatus).pipe(
  Command.withDescription('Get the EDGE status for the current identity.'),
);
