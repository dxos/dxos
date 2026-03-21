//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Key } from '@dxos/echo';

import { formatEdgeError } from '../util';

const spaceIdArg = Args.text({ name: 'spaceId' }).pipe(Args.withSchema(Key.SpaceId));

export const handler = Effect.fn(function* (spaceId: Key.SpaceId, force: boolean) {
  if (!force) {
    yield* Console.error('This action is irreversible. Pass --force to confirm.');
    return;
  }

  const client = yield* ClientService;
  const identity = createEdgeIdentity(client);
  client.edge.http.setIdentity(identity);
  const result = yield* Effect.tryPromise({
    try: () => client.edge.http.deleteSpace(spaceId),
    catch: (error) => new Error(formatEdgeError(error)),
  });
  yield* Console.log(JSON.stringify(result, null, 2));
});

export const del = Command.make(
  'delete',
  {
    spaceId: spaceIdArg,
    force: Options.boolean('force').pipe(
      Options.withDescription('Confirm irreversible deletion.'),
      Options.withDefault(false),
    ),
  },
  ({ spaceId, force }) => handler(spaceId, force),
).pipe(Command.withDescription('Delete a space on EDGE (irreversible).'));
