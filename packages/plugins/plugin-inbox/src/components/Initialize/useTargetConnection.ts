//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Connection, Cursor } from '@dxos/link';
import * as Binding from '@dxos/plugin-connector/Binding';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

/**
 * Find the {@link Connection} bound to the given `target` object via an external-sync
 * {@link Cursor} (the cursor's `spec.source` access token authenticates sync for that target).
 * Returns the connection of the target's live binding, or `undefined` when the target is unbound —
 * including when its cursor outlived the connection it was authenticated by (see
 * {@link Binding.find}), which is the same state the Connect action keys on.
 */
export const useTargetConnection = <T extends Obj.Any>(
  target: T | undefined,
): { connection: Connection.Connection | undefined } => {
  const db = target ? Obj.getDatabase(target) : undefined;
  const cursors = useQuery(db, Filter.type(Cursor.Cursor));
  const connections = useQuery(db, Filter.type(Connection.Connection));
  return useMemo(
    () => ({ connection: target ? Binding.find(cursors, connections, target)?.connection : undefined }),
    [target, cursors, connections],
  );
};

/**
 * The {@link ConnectorSpec.ConnectorEntry} backing `connection`, resolved from the registered `Connector` capability
 * list. `connectors` is resolved by the container (this hook lives under `components/`, which must not
 * call capability hooks) and threaded down via `useSyncTrigger` — see the properties-panel wiring.
 */
export const useConnectorEntry = (
  connection: Connection.Connection | undefined,
  connectors: readonly ConnectorSpec.ConnectorEntry[][] = [],
): ConnectorSpec.ConnectorEntry | undefined => {
  return useMemo(
    () => connectors.flat().find((entry) => entry.id === connection?.connectorId),
    [connectors, connection],
  );
};
