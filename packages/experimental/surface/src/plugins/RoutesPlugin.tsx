//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { RouteObject, useRoutes } from 'react-router';
import { HashRouter } from 'react-router-dom';

import { definePlugin, Plugin, usePluginContext } from '../framework';

export type RouterPluginProvides = {
  router: {
    routes: () => RouteObject[];
  };
};

export type RouterPlugin = Plugin<RouterPluginProvides>;

const routerPlugins = (plugins: Plugin[]): RouterPlugin[] => {
  return (plugins as RouterPlugin[]).filter((p) => p.provides?.router);
};

export const RoutesPlugin = definePlugin({
  meta: {
    id: 'RoutesPlugin',
  },
  provides: {
    context: ({ children }) => <HashRouter>{children}</HashRouter>,
    components: {
      default: () => {
        const { plugins } = usePluginContext();
        const routes = routerPlugins(plugins)
          .map((plugin) => plugin.provides.router.routes())
          .flat();
        return useRoutes(routes);
      },
    },
  },
});
