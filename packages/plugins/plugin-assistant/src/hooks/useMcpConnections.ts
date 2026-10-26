//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type AiContext } from '@dxos/assistant';
import { type Database, Filter, type URI } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

/**
 * The MCP servers a chat can connect: the space's connections whose connector declares one, then the
 * built-in servers plugins ship, which live in the registry.
 */
export const useMcpConnections = (db: Database.Database | undefined) => {
  const connectors = Hooks.useCapabilities(ConnectorSpec.Connector).flat();
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const builtins = useBuiltinMcpServers(db);
  return useMemo(
    () =>
      [...connections, ...builtins].flatMap((connection) => {
        const endpoint = ConnectorSpec.mcpEndpoint(connectors, connection);
        return endpoint ? [{ connection, endpoint }] : [];
      }),
    [connectors, connections, builtins],
  );
};

const queryBuiltins = (db: Database.Database | undefined): Connection.Connection[] =>
  db?.graph.registry.query(Filter.type(Connection.Connection)).runSync().filter(Connection.isBuiltin) ?? [];

const useBuiltinMcpServers = (db: Database.Database | undefined): Connection.Connection[] => {
  const [builtins, setBuiltins] = useState(() => queryBuiltins(db));
  useEffect(() => {
    setBuiltins(queryBuiltins(db));
    return db?.graph.registry.changed.on(() => setBuiltins(queryBuiltins(db)));
  }, [db]);
  return builtins;
};

/** The conversation's per-connection MCP switches, live with the binder. */
export const useConnectionStates = (context: AiContext.Binder | undefined): ReadonlyMap<URI.URI, boolean> => {
  const [states, setStates] = useState<ReadonlyMap<URI.URI, boolean>>(() => context?.getConnections() ?? new Map());
  useEffect(() => {
    setStates(context?.getConnections() ?? new Map());
    return context?.subscribeConnections(setStates);
  }, [context]);
  return states;
};
