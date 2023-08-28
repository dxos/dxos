//
// Copyright 2023 DXOS.org
//

import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { composeContext } from './Context';
import { Plugin, PluginDefinition, PluginProvides, findPlugin } from './Plugin';

export type PluginContextValue = {
  plugins: Plugin[];
};

const defaultContext: PluginContextValue = { plugins: [] };

const PluginContext = createContext<PluginContextValue>(defaultContext);

export const usePlugins = () => useContext(PluginContext);

export const usePlugin = <T,>(id: string): Plugin<T> | undefined => {
  const { plugins } = usePlugins();
  return findPlugin<T>(plugins, id);
};

export const PluginProvider = ({
  plugins: definitions,
  fallback,
}: {
  plugins: PluginDefinition[];
  fallback?: ReactNode;
}) => {
  const [plugins, setPlugins] = useState<Plugin[]>();
  useEffect(() => {
    const timeout = setTimeout(async () => {
      log('initializing plugins', { definitions });
      const plugins = await Promise.all(
        definitions.map(async (definition) => {
          return await initializePlugin(definition).catch((err) => {
            console.error('Failed to initialize plugin:', definition.meta.id, err);
            return undefined;
          });
        }),
      ).then((plugins) => plugins.filter((plugin): plugin is Plugin => Boolean(plugin)));
      log('plugins initialized', { plugins });
      await Promise.all(definitions.map((pluginDefinition) => pluginDefinition.ready?.(plugins)));
      log('plugins ready', { plugins });
      setPlugins(plugins);
    });

    return () => {
      clearTimeout(timeout);
      void Promise.all(definitions.map((definition) => definition.unload?.()));
    };
  }, []);

  if (!plugins) {
    return <>{fallback ?? null}</>;
  }

  const ComposedContext = composeContext(plugins);

  return (
    <PluginContext.Provider value={{ plugins }}>
      <ComposedContext>{defaultComponents(plugins)}</ComposedContext>
    </PluginContext.Provider>
  );
};

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
