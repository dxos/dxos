//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';

import { formatEdgeError } from '../util';

export const handler = Effect.fn(function* ({ force }: { force: boolean }) {
  if (!force) {
    yield* Console.error('This action is irreversible and will delete all owned spaces. Pass --force to confirm.');
    return;
  }

  const client = yield* ClientService;
  const identity = client.halo.identity.get();
  if (!identity) {
    yield* Console.error('Identity not initialized.');
    return;
  }

  const edgeIdentity = createEdgeIdentity(client);
  client.edge.http.setIdentity(edgeIdentity);
  const result = yield* Effect.tryPromise({
    try: () => client.edge.http.deleteIdentity(identity.identityKey.toHex()),
    catch: (error) => new Error(formatEdgeError(error)),
  });
  yield* Console.log(JSON.stringify(result, null, 2));
});

export const del = Command.make(
  'delete',
  {
    force: Options.boolean('force').pipe(
      Options.withDescription('Confirm irreversible deletion.'),
      Options.withDefault(false),
    ),
  },
  handler,
).pipe(Command.withDescription('Delete the current identity on EDGE (irreversible, deletes all owned spaces).'));
