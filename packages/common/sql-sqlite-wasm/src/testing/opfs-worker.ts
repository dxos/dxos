//
// Copyright 2025 DXOS.org
//

/// <reference lib="webworker" />

import * as Effect from 'effect/Effect';

import * as OpfsWorker from '@dxos/sql-sqlite/OpfsWorker';

const DB_NAME = 'DXOS';

void Effect.runFork(OpfsWorker.run({ port: self, dbName: DB_NAME }));
