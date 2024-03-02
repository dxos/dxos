//
// Copyright 2023 DXOS.org
//

import { RouterProvider, createRouter, createRootRoute, type AnyRoute, createRoute } from '@tanstack/react-router';
import { deepSignal, shallow } from 'deepsignal/react';
import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { nonNullable } from '@dxos/util';

import meta from './meta';
import { type RouterProvides, parseRoutesPlugin } from './schema';

/**
 * Plugin for collecting and resolving type metadata.
 */
export const NavigationPlugin = (): PluginDefinition<RouterProvides> => {
  const root = createRootRoute();
  const state = deepSignal({ router: shallow(createRouter({ routeTree: root })) });

  return {
    meta,
    ready: async (plugins) => {
      plugins
        .map(parseRoutesPlugin)
        .filter(nonNullable)
        .reduce(
          (acc, plugin) => {
            plugin.provides.navigation.routes((options) => {
              const { parentId, id, path, ...rest } = options;
              const parent = acc[parentId] || root;
              const route = createRoute({
                getParentRoute: () => parent,
                ...(path ? { path } : { id }),
                ...rest,
              });
              parent.addChildren([...(parent.children || []), route]);
              acc[id] = route;
            });

            return acc;
          },
          { root } as Record<string, AnyRoute>,
        );

      state.router = shallow(createRouter({ routeTree: root }));
    },
    provides: {
      root: () => <RouterProvider router={state.router} />,
      navigation: state,
    },
  };
};
