//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { create } from '@dxos/live-object';

import { SurfaceProvider, type SurfaceContextValue } from './SurfaceContext';
import SurfaceMeta from './meta';
import { parseSurfacePlugin, type SurfacePluginProvides, type SurfaceDefinitions } from './provides';
import { filterPlugins } from '../helpers';
import { type PluginDefinition } from '../plugin-host';

/**
 * Provides a registry of surface components.
 */
export const SurfacePlugin = (): PluginDefinition<SurfacePluginProvides> => {
  const state = create<SurfaceContextValue>({ surfaces: {}, debugInfo: new Map() });

  return {
    meta: SurfaceMeta,
    ready: async (context) => {
      state.surfaces = filterPlugins(context.plugins, parseSurfacePlugin).reduce(
        (acc, plugin) => reduceSurfaces(plugin.provides.surface.definitions(context), acc),
        {},
      );
    },
    provides: {
      surface: state,
      context: ({ children }) => <SurfaceProvider value={state}>{children}</SurfaceProvider>,
    },
  };
};

const reduceSurfaces = (
  definitions: SurfaceDefinitions,
  surfaces: SurfaceContextValue['surfaces'] = {},
): SurfaceContextValue['surfaces'] => {
  if (Array.isArray(definitions)) {
    return definitions.reduce((acc, definition) => reduceSurfaces(definition, acc), surfaces);
  }

  return { ...surfaces, [definitions.id]: definitions };
};
