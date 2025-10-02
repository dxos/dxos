//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-rx/rx-react';
import { effect } from '@preact/signals-core';
import React, { type FC, useCallback, useEffect, useMemo } from 'react';

import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { useAsyncEffect, useDefaultValue } from '@dxos/react-hooks';

import { Capabilities, Events } from '../common';
import { type Plugin, PluginManager, type PluginManagerOptions } from '../core';
import { ErrorBoundary, PluginManagerProvider } from '../react';

import { App } from './App';
import { DefaultFallback } from './DefaultFallback';

const ENABLED_KEY = 'dxos.org/app-framework/enabled';

export type UseAppOptions = {
  pluginManager?: PluginManager;
  pluginLoader?: PluginManagerOptions['pluginLoader'];
  plugins?: Plugin[];
  core?: string[];
  defaults?: string[];
  placeholder?: FC<{ stage: number }>;
  fallback?: ErrorBoundary['props']['fallback'];
  cacheEnabled?: boolean;
  safeMode?: boolean;
  debounce?: number;
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
  pluginLoader: _pluginLoader,
  plugins: _plugins,
  core: _core,
  defaults: _defaults,
  placeholder,
  fallback = DefaultFallback,
  cacheEnabled = false,
  safeMode = false,
  debounce = 0,
}: UseAppOptions) => {
  const plugins = useDefaultValue(_plugins, () => []);
  const core = useDefaultValue(_core, () => plugins.map(({ meta }) => meta.id));
  const defaults = useDefaultValue(_defaults, () => []);

  // TODO(wittjosiah): Provide a custom plugin loader which supports loading via url.
  const pluginLoader = useMemo(
    () =>
      _pluginLoader ??
      ((id: string) => {
        const plugin = plugins.find((plugin) => plugin.meta.id === id);
        invariant(plugin, `Plugin not found: ${id}`);
        return plugin;
      }),
    [_pluginLoader, plugins],
  );

  const state = useMemo(() => live({ ready: false, error: null }), []);
  const cached: string[] = useMemo(() => JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]'), []);
  const enabled = useMemo(
    () => (safeMode ? [] : cacheEnabled && cached.length > 0 ? cached : defaults),
    [safeMode, cacheEnabled, cached, defaults],
  );
  const manager = useMemo(
    () => pluginManager ?? new PluginManager({ pluginLoader, plugins, core, enabled }),
    [pluginManager, pluginLoader, plugins, core, enabled],
  );

  useEffect(() => {
    return manager.activation.on(({ event, state: _state, error }) => {
      // Once the app is ready the first time, don't show the fallback again.
      if (!state.ready && event === Events.Startup.id) {
        state.ready = _state === 'activated';
      }

      if (error && !state.ready && !state.error) {
        state.error = error;
      }
    });
  }, [manager, state]);

  useEffect(() => {
    effect(() => {
      cacheEnabled && localStorage.setItem(ENABLED_KEY, JSON.stringify(manager.enabled));
    });
  }, [cacheEnabled, manager]);

  useEffect(() => {
    setupDevtools(manager);
  }, [manager]);

  useAsyncEffect(async () => {
    manager.context.contributeCapability({
      interface: Capabilities.PluginManager,
      implementation: manager,
      module: 'dxos.org/app-framework/plugin-manager',
    });

    manager.context.contributeCapability({
      interface: Capabilities.RxRegistry,
      implementation: manager.registry,
      module: 'dxos.org/app-framework/rx-registry',
    });

    await Promise.all([
      // TODO(wittjosiah): Factor out such that this could be called per surface role when attempting to render.
      manager.activate(Events.SetupReactSurface),
      manager.activate(Events.Startup),
    ]);

    return () => {
      manager.context.removeCapability(Capabilities.PluginManager, manager);
      manager.context.removeCapability(Capabilities.RxRegistry, manager.registry);
    };
  }, [manager]);

  return useCallback(
    () => (
      <ErrorBoundary fallback={fallback}>
        <PluginManagerProvider value={manager}>
          <RegistryContext.Provider value={manager.registry}>
            <App placeholder={placeholder} state={state} debounce={debounce} />
          </RegistryContext.Provider>
        </PluginManagerProvider>
      </ErrorBoundary>
    ),
    [fallback, manager, placeholder, state],
  );
};

const setupDevtools = (manager: PluginManager) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.manager = manager;
};
