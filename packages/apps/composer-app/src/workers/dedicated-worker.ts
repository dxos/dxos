//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client/worker';
import { log } from '@dxos/log';
import { WorkerLogStore } from '@dxos/log-store-idb';
import { isTauri } from '@dxos/util';

import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES, initializeObservability } from '../util';
import { initAutomergeWasm } from '../util/automerge-wasm';

// This worker hosts echo and can saturate its own loop, so the log sink runs in a nested
// worker of its own. SharedWorker is unavailable inside workers — dedicated is the only option.
const logStore = new WorkerLogStore({
  dbName: LOG_STORE_DB_NAME,
  maxBytes: LOG_STORE_MAX_BYTES,
  worker: new Worker(new URL('./log-writer-worker', import.meta.url), { type: 'module', name: 'dxos-log-writer' }),
});
log.addProcessor(logStore.processor);

runDedicatedWorker({
  onBeforeStart: async (cfg) => {
    void initializeObservability(cfg, isTauri(), logStore).catch((err) => log.catch(err));
    // The runtime this worker starts hosts echo; automerge is slim-resolved and must be
    // initialized before it runs (see util/automerge-wasm.ts).
    await initAutomergeWasm();
  },
});
