//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type CapabilityManager } from '@dxos/app-framework';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';

import { ConnectorSpec } from '#types';

import { SyncRoutineMissingError } from '../../errors';
import { runConnectionSync } from '../../util';

/**
 * Run the first sync for a connection whose initial sync targets were just bound, so a new
 * connection populates without the user pressing "Sync now". No-op unless the connector opts in via
 * `sync.auto`. Runs through {@link runConnectionSync}, so a trigger-declaring connector's sync is
 * driven by its routine's trigger (the dispatcher carries continuation for the unbounded first sync);
 * a missing routine — the user cancelled the create-routine form — skips the auto sync entirely.
 *
 * Forked: a first sync walks the whole remote history, and the setup flows it hangs off (the OAuth
 * finalize handler, the sync-targets dialog submit) must return before it finishes. Failures are
 * surfaced by the sync process itself — the auth-expired toast rides on `Process.Info.error` — so
 * nothing propagates back to the caller.
 */
export const autoSyncConnection = (
  invoker: Operation.OperationService,
  capabilities: CapabilityManager.CapabilityManager,
  db: Database.Database,
  connector: ConnectorSpec.ConnectorEntry,
  connection: Connection.Connection,
): Effect.Effect<void, never> => {
  if (!connector.sync?.auto) {
    return Effect.void;
  }

  return runConnectionSync({ connection, connector, spaceId: db.spaceId }).pipe(
    Effect.provide(Database.layer(db)),
    Effect.provideService(Operation.Service, invoker),
    Effect.provideService(Capability.Service, capabilities),
    Effect.catchIf(
      (error): error is SyncRoutineMissingError => error instanceof SyncRoutineMissingError,
      () => Effect.sync(() => log.info('no sync routine; skipping auto sync', { connectorId: connector.id })),
    ),
    Effect.catch((error) => Effect.sync(() => log.warn('auto sync failed', { connectorId: connector.id, error }))),
    Effect.catchDefect((defect) =>
      Effect.sync(() => log.warn('auto sync defect', { connectorId: connector.id, defect })),
    ),
    Effect.forkDetach,
    Effect.asVoid,
  );
};
