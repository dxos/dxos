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

/** The space's connections whose connector declares an MCP server: the only ones a chat connects. */
export const useMcpConnections = (db: Database.Database | undefined) => {
  const connectors = Hooks.useCapabilities(ConnectorSpec.Connector).flat();
  const connections = useQuery(db, Filter.type(Connection.Connection));
  return useMemo(
    () =>
      connections.flatMap((connection) => {
        const endpoint = ConnectorSpec.mcpEndpoint(connectors, connection);
        return endpoint ? [{ connection, endpoint }] : [];
      }),
    [connectors, connections],
  );
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
