//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { type PropsWithChildren, type ReactNode } from 'react';

import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';

import { Capabilities, Events } from './common';
import { PluginManager, type PluginManagerOptions, type Plugin } from './core';
import { topologicalSort } from './helpers';
import { ErrorBoundary, PluginManagerProvider, useCapabilities } from './react';

const ENABLED_KEY = 'dxos.org/app-framework/enabled';

export type CreateAppOptions = {
  pluginManager?: PluginManager;
  pluginLoader?: PluginManagerOptions['pluginLoader'];
  plugins?: Plugin[];
  core?: string[];
  defaults?: string[];
  placeholder?: ReactNode;
  fallback?: ErrorBoundary['props']['fallback'];
  cacheEnabled?: boolean;
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
 * const App = createApp({ plugins, core, default, fallback });
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
 */
export const createApp = ({
  pluginManager,
  pluginLoader: _pluginLoader,
  plugins = [],
  core = plugins.map(({ meta }) => meta.id),
  defaults = [],
  placeholder = null,
  fallback = DefaultFallback,
  cacheEnabled = false,
}: CreateAppOptions) => {
  // TODO(wittjosiah): Provide a custom plugin loader which supports loading via url.
  const pluginLoader =
    _pluginLoader ??
    ((id: string) => {
      const plugin = plugins.find((plugin) => plugin.meta.id === id);
      invariant(plugin, `Plugin not found: ${id}`);
      return plugin;
    });

  const state = create({ ready: false, error: null });
  const cached: string[] = JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]');
  const enabled = cacheEnabled && cached.length > 0 ? cached : defaults;
  const manager = pluginManager ?? new PluginManager({ pluginLoader, plugins, core, enabled });

  manager.activation.on(({ event, state: _state, error }) => {
    if (event === Events.Startup.id) {
      state.ready = _state === 'activated';
    }

    if (error && !state.ready && !state.error) {
      state.error = error;
    }
  });

  effect(() => {
    cacheEnabled && localStorage.setItem(ENABLED_KEY, JSON.stringify(manager.enabled));
  });

  manager.context.contributeCapability({
    interface: Capabilities.PluginManager,
    implementation: manager,
    module: 'dxos.org/app-framework/plugin-manager',
  });

  setupDevtools(manager);

  // TODO(wittjosiah): Factor out such that this could be called per surface role when attempting to render.
  void manager.activate(Events.SetupSurfaces);
  void manager.activate(Events.Startup);

  return () => (
    <ErrorBoundary fallback={fallback}>
      <PluginManagerProvider value={manager}>
        <App placeholder={placeholder} state={state} />
      </PluginManagerProvider>
    </ErrorBoundary>
  );
};

type AppProps = Required<Pick<CreateAppOptions, 'placeholder'>> & {
  state: { ready: boolean; error: unknown };
};

const App = ({ placeholder, state }: AppProps) => {
  const reactContexts = useCapabilities(Capabilities.ReactContext);
  const reactRoots = useCapabilities(Capabilities.ReactRoot);

  if (state.error) {
    // This trigger the error boundary to provide UI feedback for the startup error.
    throw state.error;
  }

  // TODO(wittjosiah): Consider using Suspense instead?
  if (!state.ready) {
    return <>{placeholder}</>;
  }

  const ComposedContext = composeContexts(reactContexts);
  return (
    <ComposedContext>
      {reactRoots.map(({ id, root: Component }) => (
        <Component key={id} />
      ))}
    </ComposedContext>
  );
};

// Default fallback does not use tailwind or theme.
const DefaultFallback = ({ error }: { error: Error }) => {
  return (
    <div style={{ padding: '1rem' }}>
      {/* TODO(wittjosiah): Link to docs for replacing default. */}
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0' }}>{error.message}</h1>
      <pre>{error.stack}</pre>
    </div>
  );
};

const composeContexts = (contexts: Capabilities.ReactContext[]) => {
  if (contexts.length === 0) {
    return ({ children }: PropsWithChildren) => <>{children}</>;
  }

  return topologicalSort(contexts)
    .map(({ context }) => context)
    .reduce((Acc, Next) => ({ children }) => (
      <Acc>
        <Next>{children}</Next>
      </Acc>
    ));
};

const setupDevtools = (manager: PluginManager) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.manager = manager;
};
