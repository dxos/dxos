//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as WorkerSandbox from './WorkerSandbox.ts';
import type { SandboxInit } from './WorkerSandboxProtocol.ts';

/** The first message a Web Worker sandbox receives; the channel's port travels in its transfer list. */
export type BrowserWorkerStart = { readonly type: 'start'; readonly init: SandboxInit };

/** What the worker posts on itself: only a failure it could not report over the channel. */
export type BrowserWorkerMessage = { readonly type: 'fatal'; readonly reason: string };

export const isBrowserWorkerStart = (data: unknown): data is BrowserWorkerStart =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === 'start' && 'init' in data;

const isFatal = (data: unknown): data is BrowserWorkerMessage =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === 'fatal' && 'reason' in data;

/**
 * A `WorkerSandbox` spawner for a Web Worker running `WorkerSandboxBrowserEntry`.
 *
 * The caller constructs the worker because only it can: a bundler resolves a worker's module from
 * a `new Worker(new URL('…', import.meta.url))` literal in the caller's own source. The module is
 * either `WorkerSandboxBrowserEntry` or the app's own entry calling `serve` from
 * `@dxos/agent-code-mode/browser-worker`. The `entry` a `WorkerSandbox` passes is therefore ignored.
 *
 * A Web Worker is a thread boundary, not a security boundary: it has no DOM and no `localStorage`,
 * but it shares the page's origin — its network, IndexedDB and OPFS.
 */
export const spawn =
  (createWorker: () => Worker) =>
  async (_entry: URL, init: SandboxInit): Promise<WorkerSandbox.WorkerHandle> => {
    const worker = createWorker();
    const channel = new MessageChannel();

    let announce: (reason: string | undefined) => void = () => {};
    const stopped = new Promise<string | undefined>((resolve) => {
      announce = resolve;
    });
    // A module that fails to load raises `error` on the worker; a failure before the channel opens
    // arrives as a `fatal` message. Either is the only word the host gets.
    worker.addEventListener('error', (event) => announce(event.message || 'The worker failed to load.'));
    worker.addEventListener('message', (event: MessageEvent) => {
      if (isFatal(event.data)) {
        announce(event.data.reason);
      }
    });

    const start: BrowserWorkerStart = { type: 'start', init };
    worker.postMessage(start, [channel.port2]);
    return {
      port: channel.port1,
      stopped,
      terminate: () => {
        worker.terminate();
        // A terminated Web Worker raises no event, unlike a node thread's `exit`.
        announce('The worker was terminated.');
      },
    };
  };
