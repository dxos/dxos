//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { IdentityContract } from '@dxos/client-services';
import { runDedicatedWorker } from '@dxos/client/worker';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import * as ObservabilityClientProvider from '@dxos/observability/ObservabilityClientProvider';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';
import { layerMemory } from '@dxos/sql-sqlite/platform';
import { isTauri } from '@dxos/util';

import { initEchoHostWasm } from '../util/automerge-wasm.ts';
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES, WorkerLogProcessor, initializeObservability } from '../util/index.ts';

// This worker hosts echo and can saturate its own loop, so the log sink runs in a nested
// worker of its own. The IdbLogStore is the read handle for observability exports; the
// nested worker owns writes and eviction.
const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES, evictionInterval: 0 });
const observabilityWorker = new Worker(new URL('./observability-worker.ts', import.meta.url), {
  type: 'module',
  name: 'dxos-observability',
});
const logProcessor = new WorkerLogProcessor({
  worker: observabilityWorker,
  traceContext: ObservabilityExtension.Otel.activeTraceContext,
});
log.addProcessor(logProcessor.processor);

let observability: ReturnType<typeof initializeObservability> | undefined;

/**
 * `VITE_DX_STORAGE=memory` keeps the database in memory instead of OPFS, for webviews that cannot hand a worker
 * an OPFS sync access handle — WebKitGTK, so the Linux desktop app — where the app otherwise cannot open at all.
 * Nothing survives a reload; it is for demos and automated runs, never a shipped build.
 */
const sqliteLayer = import.meta.env.VITE_DX_STORAGE === 'memory' ? layerMemory : undefined;
if (sqliteLayer) {
  log.warn('database is in memory (VITE_DX_STORAGE=memory): nothing survives a reload');
}

runDedicatedWorker({
  sqliteLayer,
  onBeforeStart: async (cfg) => {
    observability = initializeObservability(cfg, isTauri(), logStore, undefined, {
      post: (message) => observabilityWorker.postMessage(message),
    });
    observability.catch((err) => log.catch(err));
    // The runtime this worker starts hosts echo; automerge is slim-resolved and must be
    // initialized before it runs (see util/automerge-wasm.ts).
    await initEchoHostWasm();
  },
  onStart: async (stack) => {
    const instance = await observability;
    if (instance) {
      const identityManager = await EffectEx.runPromise(
        stack.getServiceResolver().resolve(IdentityContract.ManagerService, {}).pipe(Effect.orDie, Effect.scoped),
      );
      await EffectEx.runPromise(
        instance.addDataProvider(ObservabilityClientProvider.Client.identityManagerProvider(identityManager)),
      );
    }
  },
});
