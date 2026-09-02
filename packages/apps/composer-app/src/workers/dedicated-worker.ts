//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client/worker';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import * as ObservabilityClientProvider from '@dxos/observability/ObservabilityClientProvider';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';
import { isTauri } from '@dxos/util';

import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES, WorkerLogProcessor, initializeObservability } from '../util';
import { initAutomergeWasm } from '../util/automerge-wasm';

// This worker hosts echo and can saturate its own loop, so the log sink runs in a nested
// worker of its own. The IdbLogStore is the read handle for observability exports; the
// nested worker owns writes and eviction.
const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES, evictionInterval: 0 });
const observabilityWorker = new Worker(new URL('./observability-worker', import.meta.url), {
  type: 'module',
  name: 'dxos-observability',
});
const logProcessor = new WorkerLogProcessor({
  worker: observabilityWorker,
  traceContext: ObservabilityExtension.Otel.activeTraceContext,
});
log.addProcessor(logProcessor.processor);

// Resolved in `onBeforeStart`, read in `onStart`: the identity provider needs the runtime's services,
// which do not exist until it has started.
let observability: ReturnType<typeof initializeObservability> | undefined;

runDedicatedWorker({
  onBeforeStart: async (cfg) => {
    observability = initializeObservability(cfg, isTauri(), logStore, undefined, {
      post: (message) => observabilityWorker.postMessage(message),
    });
    observability.catch((err) => log.catch(err));
    // The runtime this worker starts hosts echo; automerge is slim-resolved and must be
    // initialized before it runs (see util/automerge-wasm.ts).
    await initAutomergeWasm();
  },
  // This realm has its own tracer and tags, so the identity has to be observed here too; the tab's
  // provider tags only the tab's spans.
  onStart: async (host) => {
    const instance = await observability;
    if (instance) {
      await EffectEx.runPromise(
        instance.addDataProvider(ObservabilityClientProvider.Client.identityManagerProvider(host.identityManager)),
      );
    }
  },
});
