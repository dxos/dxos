//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import * as WorkerSandboxBrowser from './WorkerSandboxBrowser.ts';
import { runSandboxWorker } from './WorkerSandboxRuntime.ts';

export type ServeOptions = {
  /**
   * Runs before the sandbox touches ECHO — where an app initializes what its bundle defers, e.g.
   * the Automerge wasm a slim build does not load at import time.
   */
  readonly beforeStart?: () => Promise<void>;
};

/**
 * Serves one evaluation in this Web Worker: the init arrives as the first message, with the
 * channel's port transferred alongside it — a Web Worker has no `workerData`.
 *
 * Exported rather than run on import so an app's own worker module can call it after its setup.
 * The listener is attached synchronously, so the start message cannot arrive before it.
 */
export const serve = ({ beforeStart }: ServeOptions = {}): void => {
  self.addEventListener(
    'message',
    (event: MessageEvent) => {
      const [port] = event.ports;
      if (!WorkerSandboxBrowser.isBrowserWorkerStart(event.data) || port === undefined) {
        report({ type: 'fatal', reason: 'The worker was started without an init message and port.' });
        return;
      }
      const { init } = event.data;
      Effect.runFork(
        Effect.promise(() => beforeStart?.() ?? Promise.resolve()).pipe(
          Effect.andThen(Effect.scoped(runSandboxWorker(port, init))),
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
};

const report = (message: WorkerSandboxBrowser.BrowserWorkerMessage) => self.postMessage(message);
