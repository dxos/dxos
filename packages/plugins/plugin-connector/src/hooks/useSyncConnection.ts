//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useQuery } from '@dxos/react-client/echo';

import { useConnector } from '#hooks';

import { Connection, SyncBinding } from '../types';

export type UseSyncConnectionResult = {
  /** True when the connection's connector exposes a `sync` operation. Drives sync button visibility. */
  readonly available: boolean;
  /** Number of {@link SyncBinding} relations sourced by this connection. */
  readonly bindingCount: number;
  /** True while a sync is in flight. */
  readonly syncing: boolean;
  /**
   * Invokes `connector.sync` once per {@link SyncBinding} sourced by the
   * connection. No-op when `available` is false or there are no bindings.
   */
  readonly sync: () => Promise<void>;
};

/**
 * Trigger a sync for every {@link SyncBinding} sourced by a {@link Connection}.
 * Resolves the connection's connector, queries its bindings, and invokes
 * `connector.sync({ binding })` for each. Toasts are emitted by the sync
 * operation itself so every caller gets the same feedback; per-binding
 * `lastSyncAt`/`lastError` updates show up reactively in the surface.
 */
export const useSyncConnection = (connection: Connection.Connection | undefined): UseSyncConnectionResult => {
  const { invokePromise } = useOperationInvoker();
  const connector = useConnector(connection?.connectorId);
  const db = connection ? Obj.getDatabase(connection) : undefined;
  const bindings = useQuery(
    db,
    connection
      ? Query.select(Filter.id(connection.id)).sourceOf(SyncBinding.SyncBinding)
      : Query.select(Filter.nothing()),
  );
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!connection || !connector?.sync || bindings.length === 0) {
      return;
    }
    const op = connector.sync;
    setSyncing(true);
    try {
      for (const binding of bindings) {
        const result = await invokePromise(op, { binding: Ref.make(binding) }, { spaceId: db?.spaceId });
        if (result.error) {
          throw result.error;
        }
      }
    } catch (err) {
      log.catch(err);
    } finally {
      setSyncing(false);
    }
  }, [connection, connector, bindings, invokePromise, db]);

  return {
    available: !!connector?.sync,
    bindingCount: bindings.length,
    syncing,
    sync,
  };
};
