//
// Copyright 2026 DXOS.org
//

import { setLoggerFactory } from '@automerge/automerge-repo';

import { runDedicatedWorker } from '@dxos/client/worker';
import { resolveTelemetryTag } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import * as ObservabilityClientProvider from '@dxos/observability/ObservabilityClientProvider';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';
import { isTauri } from '@dxos/util';

import { initAutomergeWasm } from '../util/automerge-wasm.ts';
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

/** Longest rendering of a single logger argument kept in a record. */
const MAX_ARG_LENGTH = 500;

/** Byte arrays as their length: sync messages carry payloads that would otherwise serialize per byte. */
function jsonReplacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  // `this[key]` is the value before `toJSON`, which a Buffer uses to turn itself into an array.
  const original = this[key];
  if (ArrayBuffer.isView(original) || original instanceof ArrayBuffer) {
    return `<${original.byteLength} bytes>`;
  }
  return typeof value === 'bigint' ? value.toString() : value;
}

/** A logger argument as text: objects as JSON, since their default rendering is `[object Object]`. */
const renderArg = (arg: unknown): string => {
  if (arg instanceof Error) {
    return arg.message;
  }
  if (typeof arg === 'object' && arg !== null) {
    try {
      return JSON.stringify(arg, jsonReplacer) ?? Object.prototype.toString.call(arg);
    } catch {
      return Object.prototype.toString.call(arg);
    }
  }
  return String(arg);
};

/**
 * Routes automerge-repo's subduction loggers into `@dxos/log`, so the e2e log capture records sync rounds.
 * Every other namespace keeps the library default: `debug` output stays off in a worker, the rest reaches the console.
 */
const captureSubductionLogs = () =>
  setLoggerFactory((namespace) => {
    if (!namespace.startsWith('automerge-repo:subduction')) {
      const prefix = `[${namespace}]`;
      return {
        debug: () => {},
        info: (message, ...args) => console.info(prefix, message, ...args),
        warn: (message, ...args) => console.warn(prefix, message, ...args),
        error: (message, ...args) => console.error(prefix, message, ...args),
      };
    }

    const context = (args: unknown[]) => ({
      namespace,
      args: args.map((arg) => renderArg(arg).slice(0, MAX_ARG_LENGTH)),
    });
    return {
      debug: (message, ...args) => log.debug(message, context(args)),
      info: (message, ...args) => log.info(message, context(args)),
      warn: (message, ...args) => log.warn(message, context(args)),
      error: (message, ...args) => log.error(message, context(args)),
    };
  });

let observability: ReturnType<typeof initializeObservability> | undefined;

runDedicatedWorker({
  onBeforeStart: async (cfg) => {
    if (resolveTelemetryTag(cfg) === 'e2e') {
      captureSubductionLogs();
    }
    observability = initializeObservability(cfg, isTauri(), logStore, undefined, {
      post: (message) => observabilityWorker.postMessage(message),
    });
    observability.catch((err) => log.catch(err));
    // The runtime this worker starts hosts echo; automerge is slim-resolved and must be
    // initialized before it runs (see util/automerge-wasm.ts).
    await initAutomergeWasm();
  },
  onStart: async (host) => {
    const instance = await observability;
    if (instance) {
      await EffectEx.runPromise(
        instance.addDataProvider(ObservabilityClientProvider.Client.identityManagerProvider(host.identityManager)),
      );
    }
  },
});
