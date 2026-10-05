//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as PluginWorker from '@dxos/app-framework/PluginWorker';
import { IdentityContract } from '@dxos/client-services';
import { STORAGE_LOCK_KEY } from '@dxos/client/lock-key';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import * as ObservabilityClientProvider from '@dxos/observability/ObservabilityClientProvider';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';
import { isTauri } from '@dxos/util';

import { initEchoHostWasm } from '../util/automerge-wasm.ts';
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES, WorkerLogProcessor, initializeObservability } from '../util/index.ts';

/**
 * Echo's hot paths log at verbose per document and message, and every forwarded line costs a postMessage;
 * `dxlog` or `runtime.client.log.filter` raises it.
 */
const DB_WORKER_LOG_FILTER = 'info';

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
  logFilter: log.runtimeConfig.options.filter ?? DB_WORKER_LOG_FILTER,
  traceContext: ObservabilityExtension.Otel.activeTraceContext,
});
log.addProcessor(logProcessor.processor);

let observability: ReturnType<typeof initializeObservability> | undefined;

// The services this worker serves come from the plugins the tab lists in `runtime.client.workerPlugins`
// (see main.tsx); observability stays here, set up before any plugin loads.
PluginWorker.run({
  storageLockKey: STORAGE_LOCK_KEY,
  onBeforeStart: Effect.fnUntraced(function* (config) {
    const logFilter = config.get('runtime.client.log.filter');
    if (logFilter) {
      logProcessor.setFilter(logFilter);
    }
    observability = initializeObservability(config, isTauri(), logStore, undefined, {
      post: (message) => observabilityWorker.postMessage(message),
    });
    observability.catch((err) => log.catch(err));
    // The stack this worker builds hosts echo; automerge is slim-resolved and must be
    // initialized before it runs (see util/automerge-wasm.ts).
    yield* Effect.promise(() => initEchoHostWasm());
  }),
  onStart: Effect.fnUntraced(function* (stack) {
    const pending = observability;
    const instance = pending && (yield* Effect.promise(() => pending));
    if (!instance) {
      return;
    }
    const identityManager = yield* stack
      .getServiceResolver()
      .resolve(IdentityContract.ManagerService, {})
      .pipe(Effect.orDie, Effect.scoped);
    yield* instance.addDataProvider(ObservabilityClientProvider.Client.identityManagerProvider(identityManager));
  }),
});
