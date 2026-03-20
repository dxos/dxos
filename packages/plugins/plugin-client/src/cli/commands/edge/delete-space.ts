//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { Common } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type Key } from '@dxos/echo';

export const handler = Effect.fn(function* ({ spaceId, force }: { spaceId: Key.SpaceId; force: boolean }) {
  if (!force) {
    yield* Console.error('This action is irreversible. Pass --force to confirm.');
    return;
  }

  const client = yield* ClientService;
  const identity = createEdgeIdentity(client);
  client.edge.http.setIdentity(identity);
  const result = yield* Effect.tryPromise(() => client.edge.http.deleteSpace(spaceId));
  yield* Console.log(JSON.stringify(result, null, 2));
});

export const deleteSpace = Command.make(
  'delete-space',
  {
    spaceId: Common.spaceId,
    force: Options.boolean('force').pipe(
      Options.withDescription('Confirm irreversible deletion.'),
      Options.withDefault(false),
    ),
  },
  handler,
).pipe(Command.withDescription('Delete a space on EDGE (irreversible).'));
