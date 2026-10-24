//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Database, Filter, Obj, Registry } from '@dxos/echo';
import { type URI } from '@dxos/keys';
import { Connection } from '@dxos/link';

/** The MCP servers a conversation can connect: the space's connections, then the registry's built-ins. */
export const mcpConnections = Effect.gen(function* () {
  const space = yield* Database.query(Filter.type(Connection.Connection)).run;
  const builtin = (yield* Registry.runQuery(Filter.type(Connection.Connection))).filter(Connection.isBuiltin);
  return [...space, ...builtin];
});

/** How the Skill Manager lists a connection: a built-in server by its key, which is what the agent passes back. */
export const describe = (connection: Connection.Connection, states: ReadonlyMap<URI.URI, boolean>) => {
  const builtin = Connection.isBuiltin(connection);
  return {
    id: builtin ? (Obj.getMeta(connection).key ?? connection.id) : connection.id,
    name: connection.name,
    connectorId: connection.connectorId,
    enabled: AiContext.isConnectionOn(states, connection),
    ...(builtin ? { builtin } : {}),
  };
};
