//
// Copyright 2025 DXOS.org
//

/// <reference lib="webworker" />

import * as OpfsWorker from '@effect/sql-sqlite-wasm/OpfsWorker';
import * as Effect from 'effect/Effect';

const DB_NAME = 'DXOS';

void Effect.runFork(OpfsWorker.run({ port: self, dbName: DB_NAME }));
