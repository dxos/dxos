//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

import * as Effect from 'effect/Effect';

import * as OpfsWorker from '@dxos/sql-sqlite/OpfsWorker';

/**
 * SQLite runs here, not on the page: OPFS sync access handles exist only in a worker. The database
 * itself — queries, hydration, reactivity — stays on the main thread and reaches this over
 * postMessage, which is what lets React bind to it directly.
 */

const DB_NAME = 'ECHO_SQLITE_DEMO';

void Effect.runFork(OpfsWorker.run({ port: self, dbName: DB_NAME }));
