//
// Copyright 2023 DXOS.org
//

import { shallow } from 'deepsignal/react';
import React, { useEffect, type FC, type PropsWithChildren, type ReactNode } from 'react';

import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';

import { type PluginContext, PluginProvider } from './PluginContext';
import { type Plugin, type PluginDefinition, type PluginProvides } from './plugin';

export type BootstrapPluginsParams = {
  order: PluginDefinition['meta'][];
  plugins: Record<string, () => Promise<PluginDefinition>>;
  core?: string[];
  defaults?: string[];
  fallback?: ReactNode;
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
  order,
  plugins: definitions,
  core = [],
  defaults = [],
  fallback = null,
}: BootstrapPluginsParams): PluginDefinition<PluginHostProvides> => {
  const state = new LocalStorageStore<PluginContext>(PLUGIN_HOST, {
    ready: false,
    enabled: [...defaults],
    plugins: [],
    available: order.filter(({ id }) => !core.includes(id)),
    setPlugin: (id: string, enabled: boolean) => {
      if (enabled) {
        state.values.enabled = [...state.values.enabled, id];
      } else {
        state.values.enabled = state.values.enabled.filter((enabled) => enabled !== id);
      }
    },
  });

  state.prop(state.values.$enabled!, 'enabled', LocalStorageStore.json);

  return {
    meta: {
      id: PLUGIN_HOST,
      name: 'Plugin host',
    },
    provides: {
      plugins: state.values,
      context: ({ children }) => <PluginProvider value={state.values}>{children}</PluginProvider>,
      root: () => {
        useEffect(() => {
          log('initializing plugins', { enabled: state.values.enabled });
          const timeout = setTimeout(async () => {
            const enabledIds = [...core, ...state.values.enabled].sort((a, b) => {
              const indexA = order.findIndex(({ id }) => id === a);
              const indexB = order.findIndex(({ id }) => id === b);
              return indexA - indexB;
            });

            const enabled = await Promise.all(
              enabledIds
                .map((id) => definitions[id])
                // If local storage indicates a plugin is enabled, but it is not available, ignore it.
                .filter((definition): definition is () => Promise<PluginDefinition> => Boolean(definition))
                .map((definition) => definition()),
            );

            const plugins = await Promise.all(
              enabled.map(async (definition) => {
                const plugin = await initializePlugin(definition).catch((err) => {
                  console.error('Failed to initialize plugin:', definition.meta.id, err);
                  return undefined;
                });
                return plugin;
              }),
            ).then((plugins) => plugins.filter((plugin): plugin is Plugin => Boolean(plugin)));
            log('plugins initialized', { plugins });

            await Promise.all(
              enabled.map(async (pluginDefinition) => {
                await pluginDefinition.ready?.(plugins);
              }),
            );
            log('plugins ready', { plugins });

            state.values.plugins = shallow(plugins);
            state.values.ready = true;
          });

          return () => {
            clearTimeout(timeout);
            state.values.ready = false;
            // TODO(wittjosiah): Does this ever need to be called prior to having dynamic plugins?
            // void Promise.all(enabled.map((definition) => definition.unload?.()));
          };
        }, []);

        if (!state.values.ready) {
          return <>{fallback}</>;
        }

        const ComposedContext = composeContext(state.values.plugins);

        return <ComposedContext>{rootComponents(state.values.plugins)}</ComposedContext>;
      },
    },
  };
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

const composeContext = (plugins: Plugin[]) => {
  return compose(plugins.map((p) => p.provides.context!).filter(Boolean));
};

const compose = (contexts: FC<PropsWithChildren>[]) => {
  return [...contexts].reduce((Acc, Next) => ({ children }) => (
    <Acc>
      <Next>{children}</Next>
    </Acc>
  ));
};
