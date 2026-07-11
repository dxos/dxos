//
// Copyright 2025 DXOS.org
//

/// <reference lib="webworker" />

import * as Effect from 'effect/Effect';

import * as OpfsWorker from '@dxos/sql-sqlite/OpfsWorker';

// CAUTION: this worker claims an exclusive OPFS lock on `DB_NAME`. Wiring it up directly via
// `createOpfsWorker` (HOST mode) spins up one independent instance per browser tab, and a second
// tab's instance will lock out (see the failure-mode comment on `OpfsWorker.run`). Multi-tab
// persistence needs `Runtime.Client.ServicesMode.DEDICATED_WORKER` + a coordinator `SharedWorker`
// so only one elected leader's worker touches OPFS.
// TODO(mykola): Factor out.
const DB_NAME = 'DXOS';

void Effect.runFork(OpfsWorker.run({ port: self, dbName: DB_NAME }));
