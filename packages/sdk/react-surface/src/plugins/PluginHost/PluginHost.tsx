//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React, { type FC, type PropsWithChildren, type ReactNode } from 'react';

import { log } from '@dxos/log';

import { type PluginContext, PluginProvider } from './PluginContext';
import { type Plugin, type PluginDefinition, type PluginProvides } from './plugin';

export type BootstrapPluginsParams = {
  plugins: PluginDefinition[];
  fallback?: ReactNode | FC<{ initializing: PluginDefinition[]; loading: PluginDefinition[] }>;
};

export type PluginHostProvides = {
  plugins: PluginContext;
};

export const isPluginHost = (plugin: Plugin): plugin is Plugin<PluginHostProvides> =>
  Boolean((plugin.provides as PluginHostProvides).plugins);

/**
 * Bootstraps an application by initializing plugins and rendering root components.
 */
export const createPluginHost = (params: BootstrapPluginsParams) => {
  const state = deepSignal<PluginContext>({ plugins: [], initializing: [], loading: [] });

  const definition: PluginDefinition<PluginHostProvides> = {
    meta: {
      id: 'dxos.org/plugin/host',
    },
    provides: {
      plugins: state,
      context: ({ children }) => <PluginProvider value={state}>{children}</PluginProvider>,
      root: () => {
        if (!state.plugins) {
          if (typeof params.fallback === 'function') {
            const FallbackComponent = params.fallback;
            return <FallbackComponent initializing={state.initializing} loading={state.loading} />;
          }
          return <>{params.fallback ?? null}</>;
        }

        const ComposedContext = composeContext(state.plugins);

        return <ComposedContext>{rootComponents(state.plugins)}</ComposedContext>;
      },
    },
  };

  const bootstrap = () => {
    const definitions: PluginDefinition[] = [definition, ...params.plugins];
    log('initializing plugins', { definitions });
    setTimeout(async () => {
      state.initializing = definitions;
      const plugins = await Promise.all(
        definitions.map(async (definition) => {
          const plugin = await initializePlugin(definition).catch((err) => {
            console.error('Failed to initialize plugin:', definition.meta.id, err);
            return undefined;
          });
          state.initializing = state.initializing.filter((plugin) => plugin !== definition);
          return plugin;
        }),
      ).then((plugins) => plugins.filter((plugin): plugin is Plugin => Boolean(plugin)));

      log('plugins initialized', { plugins });
      state.loading = definitions;
      await Promise.all(
        definitions.map(async (pluginDefinition) => {
          await pluginDefinition.ready?.(plugins);
          state.loading = state.loading.filter((plugin) => plugin !== pluginDefinition);
        }),
      );

      log('plugins ready', { plugins });
      state.plugins = plugins;
    });

    return () => {
      void Promise.all(definitions.map((definition) => definition.unload?.()));
    };
  };

  return { definition, bootstrap };
};

/**
 * Resolve a `PluginDefinition` into a fully initialized `Plugin`.
 */
export const initializePlugin = async <T, U>(pluginDefinition: PluginDefinition<T, U>): Promise<Plugin<T & U>> => {
  const provides = await pluginDefinition.initialize?.();
  return {
    ...pluginDefinition,
    provides: {
      ...pluginDefinition.provides,
      ...provides,
    } as PluginProvides<T & U>,
  };
};

const rootComponents = (plugins: Plugin[]) => {
  return plugins
    .map((plugin) => {
      const Component = plugin.provides.root;
      if (Component) {
        return <Component key={plugin.meta.id} />;
      } else {
        return null;
      }
    })
    .filter((node): node is JSX.Element => Boolean(node));
};

const compose = (contexts: FC<PropsWithChildren>[]) => {
  return [...contexts].reduce((Acc, Next) => ({ children }) => (
    <Acc>
      <Next>{children}</Next>
    </Acc>
  ));
};

const composeContext = (plugins: Plugin[]) => {
  return compose(plugins.map((p) => p.provides.context!).filter(Boolean));
};
