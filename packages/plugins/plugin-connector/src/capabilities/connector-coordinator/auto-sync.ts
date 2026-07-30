//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Operation } from '@dxos/compute';
import { type Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { type Connection, type ConnectorEntry, ConnectorOperation } from '#types';

/**
 * Run the first sync for a connection whose initial sync targets were just bound, so a new
 * connection populates without the user pressing "Sync now". No-op unless the connector opts in via
 * `sync.auto`.
 *
 * Forked: a first sync walks the whole remote history, and the setup flows it hangs off (the OAuth
 * finalize handler, the sync-targets dialog submit) must return before it finishes. Failures are
 * surfaced by the sync process itself — the auth-expired toast rides on `Process.Info.error` — so
 * nothing propagates back to the caller.
 */
export const autoSyncConnection = (
  invoker: Operation.OperationService,
  db: Database.Database,
  connector: ConnectorEntry,
  connection: Connection.Connection,
): Effect.Effect<void, never> => {
  if (!connector.sync?.auto) {
    return Effect.void;
  }

  return invoker
    .invoke(ConnectorOperation.SyncConnection, { connection: Ref.make(connection) }, { spaceId: db.spaceId })
    .pipe(
      Effect.catchAll((error) => Effect.sync(() => log.warn('auto sync failed', { connectorId: connector.id, error }))),
      Effect.catchAllDefect((defect) =>
        Effect.sync(() => log.warn('auto sync defect', { connectorId: connector.id, defect })),
      ),
      Effect.forkDaemon,
      Effect.asVoid,
    );
};
