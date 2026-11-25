//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import { QueryMcpConnections } from './definitions.ts';
import { describe, mcpConnections } from './mcp-connections.ts';

export default QueryMcpConnections.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const states = yield* AiContext.useCurrentBinder((binder) =>
        Effect.promise(() => binder.sync()).pipe(Effect.map(() => binder.getConnections())),
      ).pipe(Effect.orDie);
      return (yield* mcpConnections).map((connection) => describe(connection, states));
    }),
  ),
);
