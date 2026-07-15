//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Connection, ConnectorOperation, isCursorForTarget } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';
import { useAtomState } from '@dxos/react-hooks';

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

/**
 * Build a `sync` callback for `target`: resolves its bound {@link Connection} and invokes
 * {@link ConnectorOperation.SyncConnection} — the same shared fan-out handler the connection settings'
 * "Sync now" and the mailbox node's context-menu action use — so the action works for any connector
 * with no per-provider branching, and picks up connector-agnostic failure handling (e.g. retagging an
 * expired credential) in one place rather than duplicating it here. Tracks an in-flight `syncing` flag
 * for the empty-state UI.
 *
 * `connection` exposes whether the target is bound (drives "connect vs. sync").
 *
 * Used by `MailboxArticle` and `CalendarArticle` for their inline "Sync" toolbar action.
 */
export const useTargetSync = <T extends Obj.Any>(
  target: T,
  notify?: Operation.NotifyOptions,
): {
  connection: Connection.Connection | undefined;
  sync: () => Promise<void>;
  /** In-flight flag as an atom so a menu builder can read it reactively via `get`. */
  syncing: Atom.Atom<boolean>;
} => {
  const { connection } = useTargetConnection(target);
  const db = Obj.getDatabase(target);
  const { invokePromise } = useOperationInvoker();
  const { atom: syncing, set: setSyncing } = useAtomState(false);

  const sync = useCallback(async () => {
    if (!connection) {
      return;
    }
    setSyncing(true);
    try {
      await invokePromise(
        ConnectorOperation.SyncConnection,
        { connection: Ref.make(connection) },
        { spaceId: db?.spaceId, notify },
      );
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, connection, db, notify, setSyncing]);

  return { connection, sync, syncing };
};
