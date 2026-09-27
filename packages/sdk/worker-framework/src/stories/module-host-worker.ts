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
  value.methods !== null;

// A bad URL is reported per module rather than failing `createRuntime`, which would surface as
// `init-failed` and leave every tab without a worker.
const loadModule = (url: string): Effect.Effect<LoadedModule> =>
  Effect.tryPromise(() => import(/* @vite-ignore */ url)).pipe(
    Effect.map((exports): LoadedModule => {
      const candidate: unknown = exports.module;
      return isHostedModule(candidate) ? { url, module: candidate } : { url, error: 'missing `module` export' };
    }),
    Effect.catch((error) => Effect.succeed<LoadedModule>({ url, error: String(error.cause ?? error) })),
  );

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
          const fn = byName.get(moduleName)?.methods[method];
          if (!fn) {
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
      const loaded = yield* Effect.forEach(moduleUrls, loadModule, { concurrency: 'unbounded' });
      const handlers = makeHandlers(loaded);
      return {
        createSession: () => Rpc.serveFromContext(ModuleHostRpcs, handlers),
      };
    }),
});
