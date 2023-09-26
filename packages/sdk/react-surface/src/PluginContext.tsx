//
// Copyright 2023 DXOS.org
//

import React, { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { composeContext } from './Context';
import { Plugin, PluginDefinition, PluginProvides, findPlugin } from './Plugin';

type PluginContextValue = {
  plugins: Plugin[];
};

const defaultContext: PluginContextValue = { plugins: [] };

const PluginContext = createContext<PluginContextValue>(defaultContext);

/**
 * Get all plugins.
 */
// TODO(burdon): Factor out.
export const usePlugins = (): PluginContextValue => useContext(PluginContext);

/**
 * Get a plugin by ID.
 */
export const usePlugin = <T,>(id: string): Plugin<T> | undefined => {
  const { plugins } = usePlugins();
  return findPlugin<T>(plugins, id);
};

/**
 * This provider initializes plugins and provides them to the application.
 * It also provides a `PluginContext` which can be used to access plugins.
 * Expected usage is for this to be the entrypoint of the application.
 *
 * @example
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <PluginProvider
 *       fallback={<div>Initializing Plugins...</div>}
 *       plugins={[...]}
 *     />
 *   </StrictMode>,
 * );
 *
 * @param options.plugins List of plugin definitions to initialize.
 * @param options.fallback Fallback component to render while plugins are initializing.
 */
export const PluginProvider = ({
  plugins: definitions,
  fallback,
}: {
  plugins: PluginDefinition[];
  fallback?: ReactNode | FC<{ initializing: PluginDefinition[]; loading: PluginDefinition[] }>;
}) => {
  const [plugins, setPlugins] = useState<Plugin[]>();
  const [pluginsInitializing, setPluginsInitializing] = useState<PluginDefinition[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState<PluginDefinition[]>([]);
  useEffect(() => {
    const timeout = setTimeout(async () => {
      log('initializing plugins', { definitions });
      setPluginsInitializing(definitions);
      const plugins = await Promise.all(
        definitions.map(async (definition) => {
          const plugin = await initializePlugin(definition).catch((err) => {
            console.error('Failed to initialize plugin:', definition.meta.id, err);
            return undefined;
          });
          setPluginsInitializing((pluginsInitializing) =>
            pluginsInitializing.filter((pluginInitialized) => pluginInitialized !== definition),
          );
          return plugin;
        }),
      ).then((plugins) => plugins.filter((plugin): plugin is Plugin => Boolean(plugin)));

      log('plugins initialized', { plugins });
      setPluginsLoading(definitions);
      await Promise.all(
        definitions.map(async (pluginDefinition) => {
          await pluginDefinition.ready?.(plugins);
          setPluginsLoading((pluginsLoading) => pluginsLoading.filter((plugin) => plugin !== pluginDefinition));
        }),
      );

      log('plugins ready', { plugins });
      setPlugins(plugins);
    });

    return () => {
      clearTimeout(timeout);
      void Promise.all(definitions.map((definition) => definition.unload?.()));
    };
  }, []);

  if (!plugins) {
    if (typeof fallback === 'function') {
      const FallbackComponent = fallback;
      return <FallbackComponent initializing={pluginsInitializing} loading={pluginsLoading} />;
    }
    return <>{fallback ?? null}</>;
  }

  const ComposedContext = composeContext(plugins);

  return (
    <PluginContext.Provider value={{ plugins }}>
      <ComposedContext>{defaultComponents(plugins)}</ComposedContext>
    </PluginContext.Provider>
  );
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

const defaultComponents = (plugins: Plugin[]) => {
  return plugins
    .map((plugin) => {
      const Component = plugin.provides.components?.default;
      if (Component) {
        return <Component key={plugin.meta.id} />;
      } else {
        return null;
      }
    })
    .filter((node): node is JSX.Element => Boolean(node));
};
