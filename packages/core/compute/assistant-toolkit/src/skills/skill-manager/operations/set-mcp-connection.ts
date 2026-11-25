//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';

import { SetMcpConnection } from './definitions.ts';
import { describe, mcpConnections } from './mcp-connections.ts';

export default SetMcpConnection.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id, enabled }) {
      const connection = (yield* mcpConnections).find(
        (connection) => connection.id === id || Obj.getMeta(connection).key === id,
      );
      if (!connection) {
        return yield* Effect.die(new Error(`No connection or built-in MCP server ${id}.`));
      }
      const states = yield* AiContext.useCurrentBinder((binder) =>
        Effect.promise(() => binder.setConnection(AiContext.connectionRef(connection), enabled)).pipe(
          Effect.map(() => binder.getConnections()),
        ),
      ).pipe(Effect.orDie);
      return describe(connection, states);
    }),
  ),
);
