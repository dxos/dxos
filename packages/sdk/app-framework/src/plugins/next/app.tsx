//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import React from 'react';
import { type ReactNode } from 'react';

import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';

import { Capabilities, Events } from './common';
import { topologicalSort } from './helpers';
import { PluginManager, type PluginManagerOptions } from './manager';
import { type Plugin } from './plugin';
import { PluginManagerProvider } from './react';
import { ErrorBoundary } from '../plugin-surface';

const ENABLED_KEY = 'dxos.org/app-framework/enabled';

export type HostPluginParams = {
  pluginLoader?: PluginManagerOptions['pluginLoader'];
  plugins?: Plugin[];
  core?: string[];
  defaults?: string[];
  fallback?: ErrorBoundary['props']['fallback'];
  placeholder?: ReactNode;
  cacheEnabled?: boolean;
};

export const createApp = ({
  pluginLoader: _pluginLoader,
  plugins: available = [],
  core = [],
  defaults = [],
  fallback = DefaultFallback,
  placeholder = null,
  cacheEnabled = false,
}: HostPluginParams) => {
  // TODO(wittjosiah): Provide a custom plugin loader which supports loading via url.
  const pluginLoader =
    _pluginLoader ??
    ((id: string) => {
      const plugin = available.find((plugin) => plugin.meta.id === id);
      invariant(plugin, `Plugin not found: ${id}`);
      return plugin;
    });

  const state = create({ ready: false, error: null });
  const plugins = getEnabledPlugins({ available, core, defaults, cacheEnabled });
  const manager = new PluginManager({ pluginLoader, plugins, core });
  manager.context.contributeCapability(Capabilities.PluginManager, manager);

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

  void manager.activate(Events.Startup);

  return () => (
    <ErrorBoundary fallback={fallback}>
      <App placeholder={placeholder} manager={manager} state={state} />
    </ErrorBoundary>
  );
};

const getEnabledPlugins = ({
  available,
  core,
  defaults,
  cacheEnabled,
}: {
  available: Plugin[];
  core: string[];
  defaults: string[];
  cacheEnabled: boolean;
}) => {
  const cached: string[] = JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]');
  const enabled = cacheEnabled && cached.length > 0 ? cached : defaults;
  return available.filter((plugin) => enabled.includes(plugin.meta.id) || core.includes(plugin.meta.id));
};

type AppProps = Required<Pick<HostPluginParams, 'placeholder'>> & {
  manager: PluginManager;
  state: { ready: boolean; error: unknown };
};

const App = ({ placeholder, manager, state }: AppProps) => {
  if (state.error) {
    // This trigger the error boundary to provide UI feedback for the startup error.
    throw state.error;
  }

  // TODO(wittjosiah): Consider using Suspense instead?
  if (!state.ready) {
    return <>{placeholder}</>;
  }

  const reactContexts = manager.context.requestCapabilities(Capabilities.ReactContext);
  const reactRoots = manager.context.requestCapabilities(Capabilities.ReactRoot);

  const ComposedContext = composeContexts(reactContexts);
  return (
    <PluginManagerProvider value={manager}>
      <ComposedContext>
        {reactRoots.map(({ id, root: Component }) => (
          <Component key={id} />
        ))}
      </ComposedContext>
    </PluginManagerProvider>
  );
};

/**
 * Fallback does not use tailwind or theme.
 */
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
  return topologicalSort(contexts)
    .map(({ context }) => context)
    .reduce((Acc, Next) => ({ children }) => (
      <Acc>
        <Next>{children}</Next>
      </Acc>
    ));
};
