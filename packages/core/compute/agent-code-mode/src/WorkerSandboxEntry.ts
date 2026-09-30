//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as WorkerThreads from 'node:worker_threads';

import type { SandboxInit } from './WorkerSandboxProtocol.ts';
import { runSandboxWorker } from './WorkerSandboxRuntime.ts';

/** The `node:worker_threads` entry: the port and init arrive as `workerData`. */
const { port, init } = WorkerThreads.workerData as { port: MessagePort; init: SandboxInit };

Effect.runFork(
  Effect.scoped(runSandboxWorker(port, init)).pipe(
    Effect.tapCause((cause) =>
      Effect.sync(() => {
        // Nothing here can reach the host, so the exit code is the message.
        console.error('code-mode worker failed before it could report:', Cause.pretty(cause));
        process.exitCode = 1;
      }),
    ),
  ),
);
