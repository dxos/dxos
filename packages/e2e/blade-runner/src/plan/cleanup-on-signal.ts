//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/**
 * Run a plan's cleanup when the process is killed rather than only when it returns.
 *
 * A `finally` does not run on `SIGTERM`, which is exactly how a run dies in CI: the job or step
 * timeout kills it, and every space and identity it created stays in a shared environment with only
 * the trace recording that they existed. Measured: a run killed by `timeout 900` against dev left
 * two spaces and five identities behind.
 */
type Cleanup = () => Promise<void>;

const registered = new Set<Cleanup>();
let installed = false;

/** Bounded: a cleanup that hangs must not stop the process from dying. */
const CLEANUP_BUDGET_MS = 60_000;

const install = (): void => {
  if (installed) {
    return;
  }
  installed = true;
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      log.warn('signal received; running cleanup before exiting', { signal, handlers: registered.size });
      void Promise.race([
        Promise.all([...registered].map(async (cleanup) => cleanup())),
        new Promise((resolve) => setTimeout(resolve, CLEANUP_BUDGET_MS)),
      ])
        .catch((err) => log.warn('cleanup on signal threw', { err }))
        .finally(() => {
          // The conventional code for the signal, so a caller still sees it was killed.
          process.exit(signal === 'SIGINT' ? 130 : 143);
        });
    });
  }
};

/**
 * Register a plan's cleanup and get back a function that unregisters it, for the normal path where
 * the plan's own `finally` has already run.
 */
export const onCleanupSignal = (cleanup: Cleanup): (() => void) => {
  install();
  registered.add(cleanup);
  return () => registered.delete(cleanup);
};
