//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useState } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Database, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { SpaceOperation } from '@dxos/plugin-space';

import { useConnector } from '#hooks';

import { SyncRoutineMissingError } from '../errors';
import { SyncTemplateId } from '../templates/sync';
import { runConnectionSync } from '../util';

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
 * Delegates to {@link runConnectionSync} so the graph-builder action, the target's sync button, and
 * this hook share one code path (and one recreation offer).
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
      await runConnectionSync({ connection, connector, spaceId: db.spaceId }).pipe(
        Effect.catchIf(
          (error): error is SyncRoutineMissingError => error instanceof SyncRoutineMissingError,
          // The account's routine is missing (deleted, or declined at creation): reopen the seeded
          // create-routine form; saving re-runs the sync the user just pressed.
          () =>
            invoker.invoke(SpaceOperation.OpenCreateObject, {
              target: db,
              typename: Type.getTypename(Routine.Routine),
              initialFormValues: { templateId: SyncTemplateId, subject: connection },
              navigable: false,
              onCreateObject: () => void sync(),
            }),
        ),
        Effect.provide(Database.layer(db)),
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
