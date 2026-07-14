//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { Cursor } from '@dxos/cursor';
import { Filter, Obj, Ref } from '@dxos/echo';
import { Connection, Connector, CursorsQuery, isCursorForTarget } from '@dxos/plugin-connector';
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
  const cursors = useQuery(db, CursorsQuery);
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

/**
 * Build a `sync` callback for `target`: resolves its external-sync cursor and the `sync` operation of
 * the bound connection's {@link Connector} entry, then invokes that op with a `{ binding }` payload —
 * so the action works for any connector that contributes a `sync` op, with no per-provider branching.
 * Tracks an in-flight `syncing` flag for the empty-state UI.
 *
 * `connection` exposes whether the target is bound (drives "connect vs. sync").
 *
 * Used by `InitializeMailboxAction` and `InitializeCalendarAction`.
 */
export const useTargetSync = <T extends Obj.Any>(
  target: T,
  notify?: Operation.NotifyOptions,
): {
  connection: Connection.Connection | undefined;
  sync: () => Promise<void>;
  syncing: boolean;
} => {
  const { connection } = useTargetConnection(target);
  const connectors = useCapabilities(Connector).flat();
  const operation = connection
    ? connectors.find((connector) => connector.id === connection.connectorId)?.sync
    : undefined;
  const db = Obj.getDatabase(target);
  const cursors = useQuery(db, CursorsQuery);
  const binding = cursors.find((candidate) => isCursorForTarget(candidate, target));
  const { invokePromise } = useOperationInvoker();
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!binding || !operation) {
      return;
    }
    setSyncing(true);
    try {
      await invokePromise(operation, { binding: Ref.make(binding) }, { spaceId: db?.spaceId, notify });
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, binding, operation, db, notify]);

  return { connection, sync, syncing };
};
