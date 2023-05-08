//
// Copyright 2023 DXOS.org
//

import React, { createContext } from 'react';

import { usePlugin } from './App';

type SurfaceContextType = {};

const SurfaceContext = createContext<SurfaceContextType | undefined>(undefined);

export type SurfaceProps = {
  id?: string; // TODO(burdon): Hierarchical ID.
  plugin: string;
  component?: string;
};

/**
 * A Surface is a UI portal that contains a single root component from a designated plugin.
 * Surfaces are dynamically configurable by the App based on the application state.
 * Surfaces are nested and can be used to create a hierarchy of UI components.
 */
export const Surface = ({ id, plugin: pluginId, component }: SurfaceProps) => {
  const plugin = usePlugin(pluginId);
  const Component = plugin.components[component || 'main'];
  if (!Component) {
    return null;
  }

  return (
    <SurfaceContext.Provider value={{}}>
      <Component />
    </SurfaceContext.Provider>
  );
};

export const useSurface = () => {};
