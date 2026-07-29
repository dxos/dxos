//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { useConnector } from '#hooks';

import { Connection, ConnectorOperation } from '../types';

export type UseSyncConnectionResult = {
  /** True when the connection's connector exposes a `sync` operation. Drives sync button visibility. */
  readonly available: boolean;
  /** True while a sync is in flight. */
  readonly syncing: boolean;
  /**
   * Invokes {@link ConnectorOperation.SyncConnection} which fans out over every
   * external-sync cursor authenticated by the connection. No-op when `available` is false.
   */
  readonly sync: () => Promise<void>;
};

/**
 * Trigger a sync for every external-sync cursor authenticated by a {@link Connection}.
 * Delegates to the {@link ConnectorOperation.SyncConnection} operation so the
 * same fan-out logic is shared with the graph-builder action.
 */
export const useSyncConnection = (connection: Connection.Connection | undefined): UseSyncConnectionResult => {
  const { invokePromise } = useOperationInvoker();
  const connector = useConnector(connection?.connectorId);
  const db = connection ? Obj.getDatabase(connection) : undefined;
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!connection || !connector?.sync) {
      return;
    }
    setSyncing(true);
    try {
      await invokePromise(
        ConnectorOperation.SyncConnection,
        { connection: Ref.make(connection) },
        { spaceId: db?.spaceId },
      );
    } catch (err) {
      log.catch(err);
    } finally {
      setSyncing(false);
    }
  }, [connection, connector, invokePromise, db]);

  return {
    available: !!connector?.sync,
    syncing,
    sync,
  };
};
