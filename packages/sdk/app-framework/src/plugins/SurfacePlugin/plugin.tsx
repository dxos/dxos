//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { create } from '@dxos/echo-schema/schema';

import { SurfaceProvider, type SurfaceRootContext } from './SurfaceRootContext';
import SurfaceMeta from './meta';
import { parseSurfacePlugin, type SurfacePluginProvides } from './provides';
import type { PluginDefinition } from '../PluginHost';
import { filterPlugins } from '../helpers';

/**
 * Provides a registry of surface components.
 */
const SurfacePlugin = (): PluginDefinition<SurfacePluginProvides> => {
  const state = create<SurfaceRootContext>({ components: {} });

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

export default SurfacePlugin;
