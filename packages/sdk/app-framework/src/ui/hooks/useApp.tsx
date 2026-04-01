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
import { ErrorBoundary, ErrorFallback, type FallbackProps } from '@dxos/react-error-boundary';
import { useAsyncEffect, useDefaultValue } from '@dxos/react-hooks';
import { ContextProtocolProvider } from '@dxos/web-context-react';

import { ActivationEvents, Capabilities } from '../../common';
import { PluginManagerContext } from '../../context';
import { type ActivationEvent, type Plugin, PluginManager } from '../../core';
import { App, PluginManagerProvider } from '../components';

const DEBUG = import.meta.env.VITE_DEBUG;

const ENABLED_KEY = 'org.dxos.app-framework.enabled';

export type StartupProgress = {
  /** Number of modules that have been activated. */
  activated: number;
  /** Total number of modules registered. */
  total: number;
  /** Fractional progress (0-1). */
  progress: number;
  /** Human-readable label for the currently activating module. */
  status?: string;
};

export type PlaceholderProps = {
  stage?: number;
  progress?: StartupProgress;
};

export type UseAppOptions = {
  pluginManager?: PluginManager.PluginManager;
  pluginLoader?: PluginManager.ManagerOptions['pluginLoader'];
  plugins?: Plugin.Plugin[];
  core?: string[];
  defaults?: string[];
  /**
   * Additional activation events to fire before startup.
   * These are fired alongside SetupReactSurface before the Startup event.
   */
  setupEvents?: ActivationEvent.ActivationEvent[];
  cacheEnabled?: boolean;
  safeMode?: boolean;
  debounce?: number;
  timeout?: number;
  fallback?: FC<FallbackProps>;
  placeholder?: FC<PlaceholderProps>;
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
 * @param params.cacheEnabled Whether to cache enabled plugins in localStorage.
 * @param params.safeMode Whether to enable safe mode, which disables optional plugins.
 * @param params.fallback Fallback component to render if an error occurs during startup.
 * @param params.placeholder Placeholder component to render during startup.
 */
export const useApp = ({
  pluginManager,
  pluginLoader: pluginLoaderProp,
  plugins: pluginsProp,
  core: coreProp,
  defaults: defaultsProp,
  setupEvents: setupEventsProp,
  placeholder,
  fallback = ErrorFallback,
  cacheEnabled = false,
  safeMode = false,
  debounce = 0,
  timeout = 30_000,
}: UseAppOptions) => {
  const plugins = useDefaultValue(pluginsProp, () => []);
  const core = useDefaultValue(coreProp, () => plugins.map(({ meta }) => meta.id));
  const defaults = useDefaultValue(defaultsProp, () => []);
  const setupEvents = useDefaultValue(setupEventsProp, () => []);

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
  const [startupProgress, setStartupProgress] = useState<StartupProgress>({
    activated: 0,
    total: 0,
    progress: 0,
  });
  // TODO(wittjosiah): Migrate to Atom.kvs for isomorphic storage.
  const cached: string[] = useMemo(() => JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]'), []);
  const enabled = useMemo(
    () => (safeMode ? [] : cacheEnabled && cached.length > 0 ? cached : defaults),
    [safeMode, cacheEnabled, cached, defaults],
  );
  const isExternalManager = !!pluginManager;
  const manager = useMemo(() => {
    const mgr = pluginManager ?? PluginManager.make({ pluginLoader, plugins, core, enabled });
    log('useApp: useMemo created/reused manager', { provided: !!pluginManager });
    return mgr;
  }, [pluginManager, pluginLoader, plugins, core, enabled]);

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
    log('useApp: effect mount');

    manager.capabilities.contribute({
      interface: Capabilities.PluginManager,
      implementation: manager,
      module: 'org.dxos.app-framework.plugin-manager',
    });

    manager.capabilities.contribute({
      interface: Capabilities.AtomRegistry,
      implementation: manager.registry,
      module: 'org.dxos.app-framework.atom-registry',
    });

    // Poll manager atoms for progress (avoids PubSub subscription race).
    const progressInterval = setInterval(() => {
      if (readyRef.current) {
        clearInterval(progressInterval);
        return;
      }
      const active = manager.getActive();
      const modules = manager.getModules();
      const total = modules.length;
      const activated = active.length;
      const lastModule = active.length > 0 ? active[active.length - 1] : undefined;
      setStartupProgress({
        activated,
        total,
        progress: total > 0 ? activated / total : 0,
        status: lastModule ? humanizeModuleId(lastModule) : undefined,
      });
    }, 100);

    const fiber = Effect.gen(function* () {
      const queue = yield* PubSub.subscribe(manager.activation);
      const listener = yield* Effect.forkDaemon(
        Queue.take(queue).pipe(
          Effect.tap(({ event, state, error: error$ }) =>
            Effect.sync(() => {
              if (event === ActivationEvents.Startup.id && state === 'activated') {
                clearTimeout(timeoutId);
                clearInterval(progressInterval);
                setReady(true);
                readyRef.current = true;
                // Trigger startup profiler dump if available.
                if (DEBUG) {
                  (globalThis as any).composer.profiler.dump();
                }
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
        ...setupEvents.map((event) => manager.activate(event)),
        manager.activate(ActivationEvents.SetupReactSurface),
        manager.activate(ActivationEvents.Startup),
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
      log('useApp: effect cleanup');
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      void runAndForwardErrors(Fiber.interrupt(fiber));
      if (!isExternalManager) {
        void runAndForwardErrors(manager.shutdown());
      }
    };
  }, [manager]);

  return useCallback(
    () => (
      <ErrorBoundary name='app' FallbackComponent={fallback}>
        <PluginManagerProvider value={manager}>
          <ContextProtocolProvider value={manager} context={PluginManagerContext}>
            <RegistryContext.Provider value={manager.registry}>
              <App
                placeholder={placeholder}
                ready={ready}
                error={error}
                debounce={debounce}
                progress={startupProgress}
              />
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

/**
 * Extracts a human-readable label from a module ID.
 * E.g., "org.dxos.plugin.markdown.module.ReactSurface" → "Markdown".
 */
const humanizeModuleId = (moduleId: string): string => {
  // Extract plugin name from pattern: org.dxos.plugin.<name>.module.<capability>
  const pluginMatch = moduleId.match(/\.plugin\.([^.]+)\./);
  if (pluginMatch) {
    const name = pluginMatch[1];
    // Convert kebab-case to title case.
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Fallback: use the last segment.
  const parts = moduleId.split('.');
  return parts[parts.length - 1];
};
