//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { create } from '@dxos/echo-schema';

import { SurfaceProvider, type SurfaceRootContext } from './SurfaceRootContext';
import SurfaceMeta from './meta';
import { parseSurfacePlugin, type SurfacePluginProvides } from './provides';
import { filterPlugins } from '../helpers';
import { type PluginDefinition } from '../plugin-host';

/**
 * Provides a registry of surface components.
 */
export const SurfacePlugin = (): PluginDefinition<SurfacePluginProvides> => {
  const state = create<SurfaceRootContext>({ components: {}, debugInfo: new Map() });

  return {
    meta: SurfaceMeta,
    ready: async (plugins) => {
      state.components = filterPlugins(plugins, parseSurfacePlugin).reduce((acc, plugin) => {
        return { ...acc, [plugin.meta.id]: plugin.provides.surface.component };
      }, {});
    },
    provides: {
      surface: state,
      context: ({ children }) => <SurfaceProvider value={state}>{children}</SurfaceProvider>,
    },
  };
};
