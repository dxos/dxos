//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { Filter, Obj } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, Connector, type ConnectorEntry, isCursorForTarget } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';

/**
 * Find the {@link Connection} bound to the given `target` object via an external-sync
 * {@link Cursor} (the cursor's `spec.source` access token authenticates sync for that target).
 * Returns the first matching connection (or `undefined` if the target is not yet bound).
 *
 * The cursor no longer relates to `Connection` directly (that coupling was removed), so this scans
 * every cursor in the space, finds the one targeting `target`, then matches its access token against
 * every `Connection` — fuzzy if a token is ever shared across connections.
 */
export const useTargetConnection = <T extends Obj.Any>(
  target: T | undefined,
): { connection: Connection.Connection | undefined } => {
  const db = target ? Obj.getDatabase(target) : undefined;
  const cursors = useQuery(db, Filter.type(Cursor.Cursor));
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connection = useMemo(() => {
    if (!target) {
      return undefined;
    }
    const cursor = cursors.find(
      (candidate): candidate is Cursor.ExternalCursor =>
        Cursor.isExternal(candidate) && isCursorForTarget(candidate, target),
    );
    if (!cursor) {
      return undefined;
    }
    return connections.find((candidate) => candidate.accessToken.uri === cursor.spec.source.uri);
  }, [target, cursors, connections]);
  return { connection };
};

/** The {@link ConnectorEntry} backing `connection`, resolved from the registered {@link Connector} capability list. */
export const useConnectorEntry = (connection: Connection.Connection | undefined): ConnectorEntry | undefined => {
  const connectorEntries = useCapabilities(Connector);
  return useMemo(
    () => connectorEntries.flat().find((entry) => entry.id === connection?.connectorId),
    [connectorEntries, connection],
  );
};
