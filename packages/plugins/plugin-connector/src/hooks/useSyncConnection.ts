//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useState } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';

import { useConnector } from '#hooks';

import * as Binding from '../Binding';

export type UseSyncConnectionResult = {
  /** True when the connection's connector exposes a `sync` operation. Drives sync button visibility. */
  readonly available: boolean;
  /** True while a sync is in flight. */
  readonly syncing: boolean;
  /**
   * Runs the account's sync — through its sync routine's trigger when the connector declares a
   * schedule (the dispatcher drives continuation), directly otherwise. A missing routine opens the
   * seeded create-routine form instead; saving re-runs the sync. No-op when `available` is false.
   */
  readonly sync: () => Promise<void>;
};

/**
 * Trigger a sync for every external-sync cursor authenticated by a {@link Connection}.
 * Delegates to {@link Binding.syncOrOfferRoutine} so the graph-builder actions, the target's sync
 * button, and this hook share one code path (and one recreation offer).
 */
export const useSyncConnection = (connection: Connection.Connection | undefined): UseSyncConnectionResult => {
  const invoker = useOperationInvoker();
  const manager = usePluginManager();
  const connector = useConnector(connection?.connectorId);
  const db = connection ? Obj.getDatabase(connection) : undefined;
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!connection || !connector?.sync || !db) {
      return;
    }
    setSyncing(true);
    try {
      await Binding.syncOrOfferRoutine({ connection, connector, db }).pipe(
        Effect.provideService(Operation.Service, invoker),
        Effect.provideService(Capability.Service, manager.capabilities),
        EffectEx.runPromise,
      );
    } catch (err) {
      log.catch(err);
    } finally {
      setSyncing(false);
    }
  }, [connection, connector, invoker, manager, db]);

  return {
    available: !!connector?.sync,
    syncing,
    sync,
  };
};
