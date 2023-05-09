//
// Copyright 2023 DXOS.org
//

import React, { createContext, FC, useContext } from 'react';

import { raise } from '@dxos/debug';

import { usePlugins } from './App';
import { Plugin } from './Plugin';

type SurfaceContextType = { plugin: Plugin<any, any>; data: any };

const SurfaceContext = createContext<SurfaceContextType | undefined>(undefined);

export type SurfaceProps = {
  id?: string; // TODO(burdon): Hierarchical ID.
  plugin?: string;
  component?: string;
  data?: any; // TODO(burdon): Rename context.
};

/**
 * A Surface is a UI portal that contains a single root component from a designated plugin.
 * Surfaces are dynamically configurable by the App based on the application state.
 * Surfaces are nested and can be used to create a hierarchy of UI components.
 */
export const Surface = ({ id, plugin: pluginId, component, data }: SurfaceProps) => {
  const plugins = usePlugins();

  let Component: FC | undefined;
  let plugin = pluginId ? plugins.find(({ config: { id } }) => id === pluginId) : undefined;
  if (plugin) {
    if (component) {
      Component = plugin.config.components[component];
    } else {
      Component = plugin.getComponent(data);
    }
  } else {
    // Get first matching component.
    for (const p of plugins) {
      Component = p.getComponent(data);
      if (Component) {
        plugin = p;
        break;
      }
    }
  }

  if (!plugin || !Component) {
    return <div>NO COMPONENT: {pluginId}</div>;
  }

  // TODO(burdon): Multiple instances of plugin components; requires single Plugin context.
  return (
    <SurfaceContext.Provider value={{ plugin, data }}>
      <Component />
    </SurfaceContext.Provider>
  );
};

export const useSurface = (): SurfaceContextType => {
  return useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext'));
};
