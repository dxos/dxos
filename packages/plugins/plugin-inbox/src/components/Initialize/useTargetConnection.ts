//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { Connection, SyncBinding } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';

/**
 * Find the {@link Connection} bound to the given `target` object via a
 * {@link SyncBinding} relation (the binding's source is the connection that
 * authenticates sync for that target). Returns the first matching connection
 * (or `undefined` if the target is not yet bound).
 *
 * Uses ECHO's structural reverse-ref index (`targetOf`) — the relation is keyed
 * by its target endpoint — rather than scanning.
 */
export const useTargetConnection = <T extends Obj.Any>(
  target: T | undefined,
): { connection: Connection.Connection | undefined } => {
  const db = target ? Obj.getDatabase(target) : undefined;
  const connections = useQuery(
    db,
    target
      ? Query.select(Filter.id(target.id)).targetOf(SyncBinding.SyncBinding).source()
      : Query.select(Filter.nothing()),
  );
  const connection = connections.find(Connection.instanceOf);
  return { connection };
};

/**
 * Build a `sync` callback that resolves the {@link SyncBinding} for `target` and
 * invokes `operation` with a `{ binding }` payload, tracking an in-flight
 * `syncing` flag so the empty-state UI can render a spinner / disabled button
 * without each callsite repeating the boilerplate.
 *
 * `connection` exposes whether the target is bound (drives "connect vs. sync").
 *
 * Used by `InitializeMailboxAction` and `InitializeCalendarAction`.
 */
export const useTargetSync = <T extends Obj.Any>(
  target: T,
  operation: Operation.Definition<any, any>,
  notify?: Operation.NotifyOptions,
): {
  connection: Connection.Connection | undefined;
  sync: () => Promise<void>;
  syncing: boolean;
} => {
  const { connection } = useTargetConnection(target);
  const db = Obj.getDatabase(target);
  const bindings = useQuery(db, Query.select(Filter.id(target.id)).targetOf(SyncBinding.SyncBinding));
  const binding = bindings.find(SyncBinding.instanceOf);
  const { invokePromise } = useOperationInvoker();
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!binding) {
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
