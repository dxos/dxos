//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Worker from '@dxos/worker-framework/Worker';

import * as Rpc from '../internal/rpc.ts';
import { MODULE_HOST_STORAGE_LOCK_KEY } from './module-host-constants.ts';
import {
  type HostedModule,
  type ModuleHostConfig,
  ModuleHostRpcs,
  ModuleInfo,
  ModuleInvokeError,
} from './module-host-service.ts';

type LoadedModule = { url: string; module?: HostedModule; error?: string };

const isHostedModule = (value: unknown): value is HostedModule =>
  typeof value === 'object' &&
  value !== null &&
  'name' in value &&
  typeof value.name === 'string' &&
  'methods' in value &&
  typeof value.methods === 'object' &&
  value.methods !== null &&
  Object.values(value.methods).every((method) => typeof method === 'function');

// A bad URL is reported per module rather than failing `createRuntime`, which would surface as
// `init-failed` and leave every tab without a worker.
const loadModule = (url: string): Effect.Effect<LoadedModule> =>
  Effect.tryPromise(() => import(/* @vite-ignore */ url)).pipe(
    Effect.map((exports): LoadedModule => {
      const candidate: unknown = exports.module;
      return isHostedModule(candidate)
        ? { url, module: candidate }
        : { url, error: 'missing or malformed `module` export' };
    }),
    Effect.catch((error) => Effect.succeed<LoadedModule>({ url, error: String(error.cause ?? error) })),
  );

// Invocation is routed by name, so a later module reusing a name is rejected rather than shadowing the first.
const rejectDuplicateNames = (loaded: LoadedModule[]): LoadedModule[] => {
  const seen = new Set<string>();
  return loaded.map((entry) => {
    if (!entry.module) {
      return entry;
    }
    if (seen.has(entry.module.name)) {
      return { url: entry.url, error: `duplicate module name: ${entry.module.name}` };
    }
    seen.add(entry.module.name);
    return entry;
  });
};

const makeHandlers = (loaded: LoadedModule[]) => {
  const byName = new Map(loaded.flatMap(({ module }) => (module ? [[module.name, module] as const] : [])));
  return ModuleHostRpcs.toLayer(
    Effect.succeed({
      listModules: () =>
        Effect.succeed(
          loaded.map(
            ({ url, module, error }) =>
              new ModuleInfo({ url, name: module?.name, methods: Object.keys(module?.methods ?? {}), error }),
          ),
        ),
      invoke: ({ module: moduleName, method, args }) =>
        Effect.gen(function* () {
          const methods = byName.get(moduleName)?.methods;
          // Own properties only, so inherited names like `toString` are not callable over RPC.
          const fn = methods && Object.hasOwn(methods, method) ? methods[method] : undefined;
          if (typeof fn !== 'function') {
            return yield* new ModuleInvokeError({ message: `unknown method: ${moduleName}.${method}` });
          }
          return yield* Effect.tryPromise({
            try: async () => fn(...args),
            catch: (error) => new ModuleInvokeError({ message: String(error) }),
          });
        }),
    }),
  );
};

const isModuleHostConfig = (config: Record<string, any> | undefined): config is ModuleHostConfig =>
  Array.isArray(config?.moduleUrls) && config.moduleUrls.every((url: unknown) => typeof url === 'string');

Worker.run({
  storageLockKey: MODULE_HOST_STORAGE_LOCK_KEY,
  createRuntime: ({ config }) =>
    Effect.gen(function* () {
      const moduleUrls = isModuleHostConfig(config) ? config.moduleUrls : [];
      const loaded = rejectDuplicateNames(yield* Effect.forEach(moduleUrls, loadModule, { concurrency: 'unbounded' }));
      const handlers = makeHandlers(loaded);
      return {
        createSession: () => Rpc.serveFromContext(ModuleHostRpcs, handlers),
      };
    }),
});
