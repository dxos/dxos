//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { Common } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type Key } from '@dxos/echo';

export const handler = Effect.fn(function* ({ spaceId }: { spaceId: Key.SpaceId }) {
  const client = yield* ClientService;
  const identity = createEdgeIdentity(client);
  client.edge.http.setIdentity(identity);
  const result = yield* Effect.tryPromise(() => client.edge.http.inspectSpace(spaceId));
  yield* Console.log(JSON.stringify(result, null, 2));
});

export const inspectSpace = Command.make(
  'inspect-space',
  {
    spaceId: Common.spaceId,
  },
  handler,
).pipe(Command.withDescription('Inspect a space on EDGE.'));
