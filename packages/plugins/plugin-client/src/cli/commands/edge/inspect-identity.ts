//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';

export const handler = Effect.fn(function* () {
  const client = yield* ClientService;
  const identity = client.halo.identity.get();
  if (!identity) {
    yield* Console.error('Identity not initialized.');
    return;
  }

  const edgeIdentity = createEdgeIdentity(client);
  client.edge.http.setIdentity(edgeIdentity);
  const result = yield* Effect.tryPromise(() => client.edge.http.inspectIdentity(identity.identityKey.toHex()));
  yield* Console.log(JSON.stringify(result, null, 2));
});

export const inspectIdentity = Command.make('inspect-identity', {}, handler).pipe(
  Command.withDescription('Inspect the current identity on EDGE.'),
);
