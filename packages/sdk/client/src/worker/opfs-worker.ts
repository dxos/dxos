//
// Copyright 2025 DXOS.org
//

import * as OpfsWorker from '@effect/sql-sqlite-wasm/OpfsWorker';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';

const DB_NAME = 'DXOS';

type WorkerMessage = { type: 'kill' };

// OpfsWorker.run uses self (the worker global) as the message port.
// SqliteClient in main thread posts messages directly to this worker.
const fiber = Effect.runFork(
  OpfsWorker.run({ port: self as unknown as MessagePort, dbName: DB_NAME }),
);

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  if (event.data?.type === 'kill') {
    await Effect.runPromise(Fiber.interrupt(fiber));
    self.close();
  }
};
