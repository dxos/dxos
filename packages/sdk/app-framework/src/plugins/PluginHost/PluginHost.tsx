//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

import { LocalStorageStore } from '@dxos/local-storage';

import { PluginContainer } from './PluginContainer';
import { type PluginContext, PluginProvider } from './PluginContext';
import { type Plugin, type PluginDefinition, type PluginMeta } from './plugin';
import { ErrorBoundary } from '../SurfacePlugin';

export type BootstrapPluginsParams = {
  plugins: Record<string, () => Promise<PluginDefinition>>;
  // Ordered list of plugins.
  meta: PluginMeta[];
  core: string[];
  defaults?: string[];
  fallback?: ErrorBoundary['props']['fallback'];
  placeholder?: ReactNode;
};

export type PluginHostProvides = {
  plugins: PluginContext;
};

export const parsePluginHost = (plugin: Plugin) =>
  (plugin.provides as PluginHostProvides).plugins ? (plugin as Plugin<PluginHostProvides>) : undefined;

const PLUGIN_HOST = 'dxos.org/plugin/host';

/**
 * Bootstraps an application by initializing plugins and rendering root components.
 */
export const PluginHost = ({
  plugins,
  meta,
  core,
  defaults = [],
  fallback = DefaultFallback,
  placeholder = null,
}: BootstrapPluginsParams): PluginDefinition<PluginHostProvides> => {
  const state = new LocalStorageStore<PluginContext>(PLUGIN_HOST, {
    ready: false,
    core,
    enabled: [...defaults],
    plugins: [],
    available: meta.filter(({ id }) => !core.includes(id)),
    setPlugin: (id: string, enabled: boolean) => {
      if (enabled) {
        state.values.enabled.push(id);
      } else {
        const index = state.values.enabled.findIndex((enabled) => enabled === id);
        index !== -1 && state.values.enabled.splice(index, 1);
      }
    },
  });

  // Register and load values.
  state.prop({ key: 'enabled', type: LocalStorageStore.json<string[]>() });

  return {
    meta: {
      id: PLUGIN_HOST,
      name: 'Plugin host',
    },
    provides: {
      plugins: state.values,
      context: ({ children }) => {
        return <PluginProvider value={state.values}>{children}</PluginProvider>;
      },
      root: () => {
        return (
          <ErrorBoundary fallback={fallback}>
            <PluginContainer plugins={plugins} core={core} state={state.values} placeholder={placeholder} />
          </ErrorBoundary>
        );
      },
    },
  };
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
