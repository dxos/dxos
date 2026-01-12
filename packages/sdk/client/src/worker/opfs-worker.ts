//
// Copyright 2025 DXOS.org
//

import * as OpfsWorker from '@effect/sql-sqlite-wasm/OpfsWorker';
import * as Effect from 'effect/Effect';

const DB_NAME = 'DXOS';

// OpfsWorker.run uses self (the worker global) as the message port.
// SqliteClient in main thread posts messages directly to this worker.
void Effect.runFork(OpfsWorker.run({ port: self as unknown as MessagePort, dbName: DB_NAME }));
