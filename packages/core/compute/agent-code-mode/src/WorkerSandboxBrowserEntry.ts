//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import * as WorkerSandboxBrowser from './WorkerSandboxBrowser.ts';
import { runSandboxWorker } from './WorkerSandboxRuntime.ts';

/**
 * The Web Worker entry: the init arrives as the first message, with the channel's port transferred
 * alongside it — a Web Worker has no `workerData`.
 */
self.addEventListener(
  'message',
  (event: MessageEvent) => {
    const [port] = event.ports;
    if (!WorkerSandboxBrowser.isBrowserWorkerStart(event.data) || port === undefined) {
      report({ type: 'fatal', reason: 'The worker was started without an init message and port.' });
      return;
    }
    Effect.runFork(
      Effect.scoped(runSandboxWorker(port, event.data.init)).pipe(
        Effect.tapCause((cause) =>
          // Nothing can reach the host over the channel, so the failure goes to the worker itself,
          // which is what the host watches from before the channel opens.
          Effect.sync(() => report({ type: 'fatal', reason: Cause.pretty(cause) })),
        ),
      ),
    );
  },
  { once: true },
);

const report = (message: WorkerSandboxBrowser.BrowserWorkerMessage) => self.postMessage(message);
