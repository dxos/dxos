//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { type SurfaceComponent, SurfaceProvider, type SurfaceRootContext } from './SurfaceRootContext';
import type { Plugin, PluginDefinition } from '../PluginHost';
import { filterPlugins } from '../helpers';

export type SurfaceProvides = {
  surface: {
    /**
     * Used by the `Surface` resolver to find a component to render.
     */
    component: SurfaceComponent;
  };
};

export type SurfacePluginProvides = {
  surface: SurfaceRootContext;
};

export const parseRootSurfacePlugin = (plugin?: Plugin) =>
  (plugin?.provides as any)?.surface?.components ? (plugin as Plugin<SurfacePluginProvides>) : undefined;

export const parseSurfacePlugin = (plugin?: Plugin) =>
  (plugin?.provides as any)?.surface?.component ? (plugin as Plugin<SurfaceProvides>) : undefined;

/**
 *
 */
export const SurfacePlugin = (): PluginDefinition<SurfacePluginProvides> => {
  const state = deepSignal<SurfaceRootContext>({ components: {} });

  return {
    meta: {
      id: 'dxos.org/plugin/surface',
    },
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
