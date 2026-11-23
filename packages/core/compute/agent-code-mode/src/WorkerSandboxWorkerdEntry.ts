//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import * as WorkerdBridge from './WorkerdBridge.ts';
import type { SandboxInit } from './WorkerSandboxProtocol.ts';
import { type Execute, runSandboxWorker } from './WorkerSandboxRuntime.ts';

/**
 * The `WorkerSandbox` entry for a Worker Loader isolate, as `WorkerSandboxBrowserEntry` is for a Web Worker. The
 * program `WorkerSandboxWorkerd.spawn` writes calls it with the model's code compiled in. `post` carries this side's
 * messages; `attach` hands the host its own, and stays pending so the host can reach it until the evaluation ends.
 */
export const serve = async (
  init: SandboxInit,
  post: WorkerdBridge.Send,
  attach: (deliver: WorkerdBridge.Send) => Promise<void>,
  execute: Execute,
): Promise<void> => {
  installPerformanceShim();
  const port = new WorkerdBridge.Port(post);
  // Settles when the host ends the evaluation; a rejection means the host went away.
  attach(async (batch) => port.receive(batch)).catch((error) =>
    log.warn('code-mode isolate lost the channel home', { error }),
  );
  await EffectEx.runPromise(Effect.scoped(runSandboxWorker(port, init, execute)));
};

/** A Worker Loader isolate has no User Timing API, which ECHO calls on every object activation: no-ops fill it in. */
const installPerformanceShim = (): void => {
  const performance = globalThis.performance;
  const fills: Record<string, () => unknown> = {
    mark: () => undefined,
    measure: () => undefined,
    clearMarks: () => undefined,
    clearMeasures: () => undefined,
    getEntriesByType: () => [],
    getEntriesByName: () => [],
  };
  for (const [name, fill] of Object.entries(fills)) {
    if (typeof Reflect.get(performance, name) !== 'function') {
      Reflect.set(performance, name, fill);
    }
  }
};
