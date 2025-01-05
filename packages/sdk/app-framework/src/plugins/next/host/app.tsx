//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';
import React, { useEffect, useMemo, useState } from 'react';
import { type ReactNode } from 'react';

import { invariant } from '@dxos/invariant';

import { PluginProvider } from './PluginContext';
import { PluginManager } from './manager';
import { type Plugin } from './plugin';
import { ErrorBoundary } from '../../plugin-surface';
import { Contributions, Events } from '../common';
import { topologicalSort } from '../helpers';

const ENABLED_KEY = 'dxos.org/app-framework/enabled';

export type HostPluginParams = {
  plugins: Plugin[];
  core: string[];
  defaults?: string[];
  fallback?: ErrorBoundary['props']['fallback'];
  placeholder?: ReactNode;
};

export const createApp = ({
  plugins: available,
  core,
  defaults = [],
  fallback = DefaultFallback,
  placeholder = null,
}: HostPluginParams) => {
  // TODO(wittjosiah): Allow custom plugin loader and provide one which supports loading via url.
  const pluginLoader = (id: string) => {
    const plugin = available.find((plugin) => plugin.meta.id === id);
    invariant(plugin, `Plugin not found: ${id}`);
    return plugin;
  };

  const plugins = getEnabledPlugins(available, defaults);
  const manager = new PluginManager({ pluginLoader, plugins, core });
  void manager.activate(Events.Startup);

  effect(() => {
    localStorage.setItem(ENABLED_KEY, JSON.stringify(manager.enabled));
  });

  return () => <App placeholder={placeholder} fallback={fallback} manager={manager} />;
};

const getEnabledPlugins = (available: Plugin[], defaults: string[]) => {
  const cached: string[] = JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]');
  const enabled = cached.length > 0 ? cached : defaults;
  return available.filter((plugin) => enabled.includes(plugin.meta.id));
};

type AppProps = Required<Pick<HostPluginParams, 'placeholder' | 'fallback'>> & {
  manager: PluginManager;
};

const App = ({ placeholder, fallback, manager }: AppProps) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    return manager.activation.on(({ event, state, error }) => {
      if (event === Events.Startup.id) {
        setReady(state === 'activated');
        setError(error);
      }
    });
  }, [manager]);

  if (error) {
    throw error;
  }

  if (!ready) {
    return <>{placeholder}</>;
  }

  const reactContexts = manager.context.requestCapability(Contributions.ReactContext);
  const reactRoots = manager.context.requestCapability(Contributions.ReactRoot);

  const ComposedContext = useMemo(
    () => composeContexts(reactContexts),
    [JSON.stringify(reactContexts.map(({ id }) => id))],
  );

  return (
    <ErrorBoundary fallback={fallback}>
      <PluginProvider value={manager}>
        <ComposedContext>
          {reactRoots.map(({ id, root: Component }) => (
            <Component key={id} />
          ))}
        </ComposedContext>
      </PluginProvider>
    </ErrorBoundary>
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

const composeContexts = (contexts: Contributions.ReactContext[]) => {
  return topologicalSort(contexts)
    .map(({ context }) => context)
    .reduce((Acc, Next) => ({ children }) => (
      <Acc>
        <Next>{children}</Next>
      </Acc>
    ));
};
