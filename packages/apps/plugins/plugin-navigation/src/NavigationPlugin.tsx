//
// Copyright 2023 DXOS.org
//

import { RouterProvider, createRouter, createRootRoute } from '@tanstack/react-router';
import { deepSignal, shallow } from 'deepsignal/react';
import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { nonNullable } from '@dxos/util';

import meta from './meta';
import { type RouterProvides, parseRoutesPlugin, type RootRouteProvides, parseLayoutRouteProvides } from './schema';

type RouterPluginProvides = RouterProvides & RootRouteProvides;

/**
 * Plugin for collecting and resolving type metadata.
 */
export const NavigationPlugin = (): PluginDefinition<RouterPluginProvides> => {
  const root = createRootRoute();
  const state = deepSignal({ router: shallow(createRouter({ routeTree: root })), root: shallow(root) });

  return {
    meta,
    ready: async (plugins) => {
      const layouts = plugins
        .map(parseLayoutRouteProvides)
        .filter(nonNullable)
        .map((plugin) => plugin.provides.navigation.layouts(plugins, { root }))
        .reduce((acc, layouts) => ({ ...acc, ...layouts }), {});

      const routes = plugins
        .map(parseRoutesPlugin)
        .filter(nonNullable)
        .flatMap((plugin) => plugin.provides.navigation.routes(plugins, { root, layouts }));

      const routeTree = root.addChildren([...Object.values(layouts), ...routes]);
      state.router = shallow(createRouter({ routeTree }));
    },
    provides: {
      root: () => <RouterProvider router={state.router} />,
      navigation: state,
    },
  };
};
