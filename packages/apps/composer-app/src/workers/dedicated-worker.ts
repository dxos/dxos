//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client/worker';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import { isTauri } from '@dxos/util';

import { initAutomergeWasm } from '../util/automerge-wasm.ts';
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES, WorkerLogProcessor, initializeObservability } from '../util/index.ts';

// This worker hosts echo and can saturate its own loop, so the log sink runs in a nested
// worker of its own. The IdbLogStore is the read handle for observability exports; the
// nested worker owns writes and eviction.
const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES, evictionInterval: 0 });
const logProcessor = new WorkerLogProcessor({
  worker: new Worker(new URL('./log-writer-worker.ts', import.meta.url), { type: 'module', name: 'dxos-log-writer' }),
});
log.addProcessor(logProcessor.processor);

runDedicatedWorker({
  onBeforeStart: async (cfg) => {
    void initializeObservability(cfg, isTauri(), logStore).catch((err) => log.catch(err));
    // The runtime this worker starts hosts echo; automerge is slim-resolved and must be
    // initialized before it runs (see util/automerge-wasm.ts).
    await initAutomergeWasm();
  },
});
