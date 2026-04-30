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

const ENABLED_KEY = 'org.dxos.app-framework.enabled';

export type StartupProgress = {
  /** Number of modules that have been activated. */
  activated: number;
  /** Total number of modules registered. */
  total: number;
  /** Fractional progress (0-1). */
  progress: number;
  /**
   * Raw activation event key (e.g. `org.dxos.app-framework.event.startup`)
   * when the in-flight activation is event-level. Mutually exclusive with
   * {@link module}.
   */
  event?: string;
  /**
   * Raw module id (e.g. `org.dxos.plugin.observability.module.ReactSurface`)
   * when the in-flight activation is module-level. Mutually exclusive with
   * {@link event}.
   */
  module?: string;
  /**
   * Pre-humanized label for either {@link event} or {@link module}, supplied
   * for consumers that want a sensible default. Hosts that prefer to render
   * their own label can read the raw {@link event}/{@link module} fields and
   * ignore this — the framework leaves the policy choice (which transitions
   * to surface, how to format them, whether to drop sub-modules entirely)
   * to the host's `Placeholder`.
   */
  humanizedName?: string;
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

    const fiber = Effect.gen(function* () {
      const queue = yield* PubSub.subscribe(manager.activation);
      const listener = yield* Effect.forkDaemon(
        Queue.take(queue).pipe(
          Effect.tap(({ event, state, module, error: error$ }) =>
            Effect.sync(() => {
              if (event === ActivationEvents.Startup.id && state === 'activated') {
                clearTimeout(timeoutId);
                setReady(true);
                readyRef.current = true;
                // Trigger startup profiler dump if available.
                (globalThis as any).composer?.profiler?.dump();
                // Notify any host observability layer that startup completed.
                // A `CustomEvent` keeps this generic — app-framework doesn't
                // import a provider, and consumers can capture the startup
                // summary without us picking one.
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('app-framework:startup-activated'));
                }
                return;
              }
              // `activating` is the start-of-load signal. Surface the raw
              // `module` (or `event`) plus a pre-humanized label so the
              // host placeholder can decide what to render — show
              // everything, suppress noisy sub-modules, group by plugin,
              // or apply its own formatting. We intentionally do NOT touch
              // these fields on `activated`: pairing the two would cause
              // back-to-back identical updates to the host's effect, which
              // the boot loader treats as a re-trigger because
              // `progress.progress` moved. Leaving the label alone on
              // completion keeps it accurate ("now activating X") until
              // the next module starts.
              if (module && state === 'activating' && !readyRef.current) {
                setStartupProgress((current) => ({
                  ...current,
                  event: undefined,
                  module,
                  humanizedName: humanizeModuleId(module),
                }));
              }
              // Update the activation count when a module commits. The
              // ring's fraction comes from this; `event`/`module`/
              // `humanizedName` were set by the matching `activating`
              // message above and are left alone so the count can advance
              // without re-firing the host's status callback.
              if (module && state === 'activated' && !readyRef.current) {
                const active = manager.getActive();
                const total = manager.getModules().length;
                setStartupProgress((current) => ({
                  ...current,
                  activated: active.length,
                  total,
                  progress: total > 0 ? active.length / total : 0,
                }));
              }
              // Event-level `activating` (no `module`) — fired at the start
              // of `_activateModulesForEvent` and recursively for each
              // before/after event. Surfaces a label during the gap before
              // the first module-level message lands; subsequent module
              // updates immediately overwrite this with a more specific
              // label.
              if (event && !module && state === 'activating' && !readyRef.current) {
                setStartupProgress((current) => ({
                  ...current,
                  event,
                  module: undefined,
                  humanizedName: humanizeEventKey(event),
                }));
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
      void runAndForwardErrors(Fiber.interrupt(fiber));
      if (!isExternalManager) {
        void runAndForwardErrors(manager.shutdown());
      }
    };
  }, [manager]);

  const progressRef = useRef(startupProgress);
  progressRef.current = startupProgress;

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
                progress={progressRef.current}
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
 *
 * Module IDs follow `org.dxos.plugin.<plugin-slug>.module.<module-name>`,
 * where `<plugin-slug>` is kebab-case and `<module-name>` is either an
 * explicit string (often kebab-case, e.g. `'observability'`, `'namespace'`)
 * or a capability tag in PascalCase from `Capability.getModuleTag(...)`
 * (e.g. `'ReactSurface'`, `'AppGraphBuilder'`). The output is
 * `"Title Case Plugin: kebab-module"` so the visible status names both the
 * plugin and the aspect being activated, helping disambiguate the multiple
 * modules a plugin contributes.
 *
 * Examples:
 *   - "org.dxos.plugin.markdown.module.ReactSurface" → "Markdown: react-surface"
 *   - "org.dxos.plugin.observability.module.AppGraphBuilder" → "Observability: app-graph-builder"
 *   - "org.dxos.plugin.observability.module.observability" → "Observability"
 *     (the module name matches the plugin slug — collapsed to avoid
 *     "Observability: observability" noise.)
 */
const humanizeModuleId = (moduleId: string): string => {
  const match = moduleId.match(/\.plugin\.([^.]+)\.module\.(.+)$/);
  if (!match) {
    // Fallback: use the last segment.
    const parts = moduleId.split('.');
    return parts[parts.length - 1];
  }
  const [, pluginSlug, moduleName] = match;
  const pluginLabel = pluginSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  // Normalise the module name to kebab-case so PascalCase capability tags
  // ("ReactSurface") read consistently with explicit kebab IDs
  // ("operation-handler"). The two-step substitution handles consecutive
  // uppercase runs (`URLLoader` → `url-loader`) without splitting them
  // mid-acronym.
  const moduleLabel = moduleName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
  // Capability modules whose name matches the plugin slug (e.g. the
  // observability plugin's `observability` capability module) would render
  // as "Observability: observability" — drop the redundant suffix.
  if (moduleLabel === pluginSlug) {
    return pluginLabel;
  }
  return `${pluginLabel}: ${moduleLabel}`;
};

/**
 * Extracts a human-readable label from an activation event key.
 * E.g., "org.dxos.app-framework.event.setup-react-surface" → "Setup React Surface".
 */
const humanizeEventKey = (eventKey: string): string => {
  // Strip a leading specifier (composite key form: "<id>:<specifier>").
  const id = eventKey.split(':')[0];
  // Match the trailing segment after `.event.`.
  const match = id.match(/\.event\.(.+)$/);
  const slug = match ? match[1] : (id.split('.').pop() ?? id);
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
