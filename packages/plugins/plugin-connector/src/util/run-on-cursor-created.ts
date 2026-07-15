//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, type Obj } from '@dxos/echo';
import { type Cursor } from '@dxos/link';
import { log } from '@dxos/log';

import { type Connection, type ConnectorEntry } from '../types';

/**
 * Runs a connector's {@link ConnectorEntry.onCursorCreated} hook for a newly-created cursor, if
 * declared. Failures are logged and swallowed so a connector's sync-setup hook never breaks the
 * bind/reconcile flow that created the cursor.
 */
export const runOnCursorCreated = (
  connector: ConnectorEntry,
  input: {
    connection: Connection.Connection;
    cursor: Cursor.ExternalCursor;
    target: Obj.Unknown;
    db: Database.Database;
  },
): Effect.Effect<void, never> => {
  if (!connector.onCursorCreated) {
    return Effect.void;
  }
  return connector.onCursorCreated(input).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => log.warn('onCursorCreated failed', { connectorId: connector.id, error })),
    ),
    Effect.catchAllDefect((defect) =>
      Effect.sync(() => log.warn('onCursorCreated defect', { connectorId: connector.id, defect })),
    ),
  );
};
