//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, type ConnectorEntry, isCursorForTarget } from '@dxos/plugin-connector';
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
  const cursor = useMemo(
    () =>
      target
        ? cursors.find(
            (candidate): candidate is Cursor.ExternalCursor =>
              Cursor.isExternal(candidate) && isCursorForTarget(candidate, target),
          )
        : undefined,
    [target, cursors],
  );
  const connections = useQuery(
    db,
    cursor ? Filter.type(Connection.Connection, { accessToken: cursor.spec.source }) : Filter.nothing(),
  );
  return { connection: connections[0] };
};

/**
 * The {@link ConnectorEntry} backing `connection`, resolved from the registered `Connector` capability
 * list. `connectors` is resolved by the container (this hook lives under `components/`, which must not
 * call capability hooks) and threaded down via `useSyncTrigger` — see the properties-panel wiring.
 */
export const useConnectorEntry = (
  connection: Connection.Connection | undefined,
  connectors: readonly ConnectorEntry[][] = [],
): ConnectorEntry | undefined => {
  return useMemo(
    () => connectors.flat().find((entry) => entry.id === connection?.connectorId),
    [connectors, connection],
  );
};
