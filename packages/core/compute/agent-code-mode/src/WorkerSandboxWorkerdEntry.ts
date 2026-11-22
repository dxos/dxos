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
 * The `WorkerSandbox` entry for a Cloudflare Worker Loader isolate, as `WorkerSandboxBrowserEntry` is for a Web Worker:
 * code mode's worker runtime, with its own ECHO client and the dialects' real bindings.
 *
 * A deployment bundles this module for workerd, with the Automerge wasm it imports, and hands the output to
 * `WorkerSandboxWorkerd.spawn` as its runtime. The program the spawner writes for each evaluation imports {@link serve}
 * from it and passes the model's code, compiled as that program's own function, since workerd has no `eval`.
 *
 * The channel home is two functions the host passes in: `post` carries this side's messages, and `attach` hands the
 * host the function that carries its own. `attach` stays pending while the evaluation runs, which keeps that function
 * reachable for the host until the host answers it.
 */
export const serve = async (
  init: SandboxInit,
  post: WorkerdBridge.Send,
  attach: (deliver: WorkerdBridge.Send) => Promise<void>,
  execute: Execute,
): Promise<void> => {
  installPerformanceShim();
  const end = WorkerdBridge.makeEnd(post);
  // Settles only when the host ends the evaluation; a rejection means the host went away first, which the host already
  // learns from this call failing.
  attach(async (batch) => end.receive(batch)).catch((error) =>
    log.warn('code-mode isolate lost the channel home', { error }),
  );
  await EffectEx.runPromise(Effect.scoped(runSandboxWorker(end.port, init, execute)));
};

/**
 * A Worker Loader isolate has no User Timing API, and ECHO marks every object activation with it, so the first write
 * would throw. The missing methods are filled in as no-ops that record nothing.
 */
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
