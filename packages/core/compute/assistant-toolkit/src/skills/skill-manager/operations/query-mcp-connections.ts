//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import { QueryMcpConnections } from './definitions.ts';
import { describe, mcpConnections } from './mcp-connections.ts';

export default QueryMcpConnections.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const binder = yield* Harness.binder.pipe(Effect.orDie);
      yield* Effect.promise(() => binder.sync());
      const states = binder.getConnections();
      return (yield* mcpConnections).map((connection) => describe(connection, states));
    }),
  ),
);
