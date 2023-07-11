//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext, useEffect, useState } from 'react';

import { composeContext } from './Context';
import { Plugin, PluginDefinition } from './Plugin';

export type PluginContextValue = {
  plugins: Plugin[];
};

const defaultContext: PluginContextValue = { plugins: [] };

const PluginContext = createContext<PluginContextValue>(defaultContext);

export const usePluginContext = () => useContext(PluginContext);

export const PluginContextProvider = ({ plugins: definitions }: { plugins: PluginDefinition[] }) => {
  const [plugins, setPlugins] = useState<Plugin[]>();
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const plugins = await Promise.all(definitions.map(initializePlugin));
      await Promise.all(definitions.map((pluginDefinition) => pluginDefinition.ready?.(plugins)));
      setPlugins(plugins);
    });

    return () => {
      clearTimeout(timeout);
      void Promise.all(definitions.map((definition) => definition.unload?.()));
    };
  }, []);

  // TODO(wittjosiah): Fallback.
  if (!plugins) {
    return null;
  }

  const ComposedContext = composeContext(plugins);

  return (
    <PluginContext.Provider value={{ plugins }}>
      <ComposedContext>{defaultComponents(plugins)}</ComposedContext>
    </PluginContext.Provider>
  );
};

const initializePlugin = async (pluginDefinition: PluginDefinition): Promise<Plugin> => {
  const provides = await pluginDefinition.init?.();
  return {
    ...pluginDefinition,

    provides: {
      ...pluginDefinition.provides,
      ...provides,
    },
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
