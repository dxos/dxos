//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { type SurfaceComponent, SurfaceProvider, type SurfaceRootContext } from './SurfaceRootContext';
import { type PluginDefinition } from '../PluginHost';
import { filterPlugins } from '../helpers';

export type SurfaceProvides = {
  /**
   * Used by the `Surface` resolver to find a component to render.
   */
  component: SurfaceComponent;
};

export type SurfacePluginProvides = {
  surface: SurfaceRootContext;
};

export const isSurfacePlugin = (plugin: PluginDefinition): plugin is PluginDefinition<SurfacePluginProvides> =>
  Boolean((plugin.provides as SurfacePluginProvides).surface);

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
      state.components = filterPlugins<SurfaceProvides>(
        plugins,
        (plugin) => typeof plugin.provides.component === 'function',
      ).reduce((acc, plugin) => {
        return { ...acc, [plugin.meta.id]: plugin.provides.component };
      }, {});
    },
    provides: {
      surface: state,
      context: ({ children }) => <SurfaceProvider value={state}>{children}</SurfaceProvider>,
    },
  };
};
