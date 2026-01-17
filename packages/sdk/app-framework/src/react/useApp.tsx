//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';
import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useAsyncEffect, useDefaultValue } from '@dxos/react-hooks';
import { ContextProtocolProvider } from '@dxos/web-context-react';

import * as Common from '../common';
import { PluginManagerContext } from '../context';
import { type Plugin, PluginManager } from '../core';

import { App } from './App';
import { DefaultFallback } from './DefaultFallback';
import { ErrorBoundary } from './ErrorBoundary';
import { PluginManagerProvider } from './PluginManagerProvider';

const ENABLED_KEY = 'dxos.org/app-framework/enabled';

export type UseAppOptions = {
  pluginManager?: PluginManager.PluginManager;
  pluginLoader?: PluginManager.ManagerOptions['pluginLoader'];
  plugins?: Plugin.Plugin[];
  core?: string[];
  defaults?: string[];
  placeholder?: FC<{ stage: number }>;
  fallback?: ErrorBoundary['props']['fallback'];
  cacheEnabled?: boolean;
  safeMode?: boolean;
  debounce?: number;
  timeout?: number;
};

/**
 * Expected usage is for this to be the entrypoint of the application.
 * Initializes plugins and renders the root components.
 *
 * @example
 * const plugins = [LayoutPlugin(), MyPlugin()];
 * const core = [LayoutPluginId];
 * const default = [MyPluginId];
 * const fallback = <div>Initializing Plugins...</div>;
 * const App = useApp({ plugins, core, default, fallback });
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>,
 * );
 *
 * @param params.pluginLoader A function which loads new plugins.
 * @param params.plugins All plugins available to the application.
 * @param params.core Core plugins which will always be enabled.
 * @param params.defaults Default plugins are enabled by default but can be disabled by the user.
 * @param params.placeholder Placeholder component to render during startup.
 * @param params.fallback Fallback component to render if an error occurs during startup.
 * @param params.cacheEnabled Whether to cache enabled plugins in localStorage.
 * @param params.safeMode Whether to enable safe mode, which disables optional plugins.
 */
export const useApp = ({
  pluginManager,
  pluginLoader: pluginLoaderProp,
  plugins: pluginsProp,
  core: coreProp,
  defaults: defaultsProp,
  placeholder,
  fallback = DefaultFallback,
  cacheEnabled = false,
  safeMode = false,
  debounce = 0,
  timeout = 30_000,
}: UseAppOptions) => {
  const plugins = useDefaultValue(pluginsProp, () => []);
  const core = useDefaultValue(coreProp, () => plugins.map(({ meta }) => meta.id));
  const defaults = useDefaultValue(defaultsProp, () => []);

  // TODO(wittjosiah): Provide a custom plugin loader which supports loading via url.
  const pluginLoader = useMemo(
    () =>
      pluginLoaderProp ??
      ((id: string) =>
        Effect.sync(() => {
          const plugin = plugins.find((plugin) => plugin.meta.id === id);
          invariant(plugin, `Plugin not found: ${id}`);
          return plugin;
        })),
    [pluginLoaderProp, plugins],
  );

  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const errorRef = useRef<unknown>(null);
  const [error, setError] = useState<unknown>(null);
  // TODO(wittjosiah): Migrate to Atom.kvs for isomorphic storage.
  const cached: string[] = useMemo(() => JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]'), []);
  const enabled = useMemo(
    () => (safeMode ? [] : cacheEnabled && cached.length > 0 ? cached : defaults),
    [safeMode, cacheEnabled, cached, defaults],
  );
  const manager = useMemo(
    () => pluginManager ?? PluginManager.make({ pluginLoader, plugins, core, enabled }),
    [pluginManager, pluginLoader, plugins, core, enabled],
  );

  useEffect(() => {
    if (!cacheEnabled) {
      return;
    }
    return manager.registry.subscribe(manager.enabled, (value) => {
      localStorage.setItem(ENABLED_KEY, JSON.stringify(value));
    });
  }, [cacheEnabled, manager]);

  useEffect(() => {
    setupDevtools(manager);
  }, [manager]);

  useAsyncEffect(async () => {
    manager.context.contributeCapability({
      interface: Common.Capability.PluginManager,
      implementation: manager,
      module: 'dxos.org/app-framework/plugin-manager',
    });

    manager.context.contributeCapability({
      interface: Common.Capability.AtomRegistry,
      implementation: manager.registry,
      module: 'dxos.org/app-framework/atom-registry',
    });

    const fiber = Effect.gen(function* () {
      const queue = yield* PubSub.subscribe(manager.activation);
      const listener = yield* Effect.forkDaemon(
        Queue.take(queue).pipe(
          Effect.tap(({ event, state, error: error$ }) =>
            Effect.sync(() => {
              if (event === Common.ActivationEvent.Startup.id && state === 'activated') {
                clearTimeout(timeoutId);
                setReady(true);
                readyRef.current = true;
              }
              if (error$ && !readyRef.current) {
                setError(error$);
                errorRef.current = error$;
              }
            }),
          ),
          Effect.forever,
        ),
      );

      yield* Effect.all([
        manager.activate(Common.ActivationEvent.SetupReactSurface),
        manager.activate(Common.ActivationEvent.Startup),
      ]);

      return yield* Fiber.join(listener);
    }).pipe(Effect.scoped, Effect.runFork);

    // Set up a timeout for startup.
    const timeoutId = setTimeout(() => {
      if (!readyRef.current && !errorRef.current) {
        log.warn('startup timeout diagnostic', {
          eventsFired: manager.getEventsFired(),
          activeModules: manager.getActive(),
          pendingReset: manager.getPendingReset(),
        });
        void runAndForwardErrors(Fiber.interrupt(fiber));
        setError(new Error(`Startup timed out after ${timeout}ms`));
      }
    }, timeout);

    return () => {
      clearTimeout(timeoutId);
      void runAndForwardErrors(Fiber.interrupt(fiber));
      manager.context.removeCapability(Common.Capability.PluginManager, manager);
      manager.context.removeCapability(Common.Capability.AtomRegistry, manager.registry);
    };
  }, [manager]);

  return useCallback(
    () => (
      <ErrorBoundary fallback={fallback}>
        <PluginManagerProvider value={manager}>
          <ContextProtocolProvider value={manager} context={PluginManagerContext}>
            <RegistryContext.Provider value={manager.registry}>
              <App placeholder={placeholder} ready={ready} error={error} debounce={debounce} />
            </RegistryContext.Provider>
          </ContextProtocolProvider>
        </PluginManagerProvider>
      </ErrorBoundary>
    ),
    [fallback, manager, placeholder, ready, error],
  );
};

const setupDevtools = (manager: PluginManager.PluginManager) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.manager = manager;
};
