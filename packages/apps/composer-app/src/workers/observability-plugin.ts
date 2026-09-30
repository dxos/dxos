//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { WorkerCapabilities, WorkerEvents } from '@dxos/app-framework/worker';
import { IdentityContract } from '@dxos/client-services';
import { Hook } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import * as ObservabilityClientProvider from '@dxos/observability/ObservabilityClientProvider';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';
import { isTauri } from '@dxos/util';

import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES, WorkerLogProcessor, initializeObservability } from '../util/index.ts';

// Installed as the module is imported — before any plugin activates — so the worker's whole boot is
// captured. The worker hosts echo and can saturate its own loop, so the log sink runs in a nested
// worker of its own; the IdbLogStore is the read handle for observability exports, the nested worker
// owns writes and eviction.
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

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.composer.workerObservability'), name: 'Worker Observability' });

const Observability = Capability.inlineModule(
  'Observability',
  { activatesOn: WorkerEvents.Startup, requires: [WorkerCapabilities.Host], provides: [] },
  Effect.fnUntraced(function* () {
    const host = yield* Capability.get(WorkerCapabilities.Host);
    const observability = initializeObservability(host.config, isTauri(), logStore, undefined, {
      post: (message) => observabilityWorker.postMessage(message),
    });
    observability.catch((err) => log.catch(err));
    yield* Hook.on(WorkerEvents.StackReady, ({ stack }) =>
      Effect.gen(function* () {
        const instance = yield* Effect.promise(() => observability);
        if (!instance) {
          return;
        }
        const identityManager = yield* stack
          .getServiceResolver()
          .resolve(IdentityContract.ManagerService, {})
          .pipe(Effect.orDie, Effect.scoped);
        yield* instance.addDataProvider(ObservabilityClientProvider.Client.identityManagerProvider(identityManager));
      }).pipe(
        // Telemetry must never keep the worker from serving its tabs.
        Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))),
      ),
    ).pipe(Effect.provideService(Hook.Controller, host.hooks));
  }),
);

/** Composer's worker observability: the log sink, telemetry, and the identity it reports under. */
export default Plugin.define(meta).pipe(Plugin.addModule(Observability), Plugin.make);
