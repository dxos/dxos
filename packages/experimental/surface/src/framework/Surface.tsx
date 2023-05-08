//
// Copyright 2023 DXOS.org
//

import React, { createContext, FC, useContext } from 'react';

import { raise } from '@dxos/debug';

import { usePlugins } from './App';

type SurfaceContextType = { data: any };

const SurfaceContext = createContext<SurfaceContextType | undefined>(undefined);

export type SurfaceProps = {
  id?: string; // TODO(burdon): Hierarchical ID.
  plugin?: string;
  data?: any;
};

/**
 * A Surface is a UI portal that contains a single root component from a designated plugin.
 * Surfaces are dynamically configurable by the App based on the application state.
 * Surfaces are nested and can be used to create a hierarchy of UI components.
 */
export const Surface = ({ id, plugin: pluginId, data }: SurfaceProps) => {
  const plugins = usePlugins();

  let Component: FC | undefined;
  const plugin = pluginId ? plugins.find(({ id }) => id === pluginId) : undefined;
  if (plugin) {
    Component = plugin.getComponent(data);
  } else {
    // Get first matching component.
    for (const plugin of plugins) {
      Component = plugin.getComponent(data);
      if (Component) {
        break;
      }
    }
  }

  if (!Component) {
    return null;
  }

  return (
    <SurfaceContext.Provider value={{ data }}>
      <Component />
    </SurfaceContext.Provider>
  );
};

export const useSurface = (): SurfaceContextType => {
  return useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext'));
};
