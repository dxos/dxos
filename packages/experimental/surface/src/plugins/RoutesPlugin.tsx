//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Outlet, RouteObject, useRoutes } from 'react-router';
import { HashRouter } from 'react-router-dom';

import { observer } from '@dxos/observable-object/react';

import { definePlugin, Plugin, usePluginContext } from '../framework';

export type RouterPluginProvides = {
  router: {
    routes?: () => RouteObject[];
    useNavigator?: () => void;
  };
};

export type RouterPlugin = Plugin<RouterPluginProvides>;

const routerPlugins = (plugins: Plugin[]): RouterPlugin[] => {
  return (plugins as RouterPlugin[]).filter((p) => p.provides?.router);
};

const Root = observer(({ plugins }: { plugins: RouterPlugin[] }) => {
  plugins.map((plugin) => plugin.provides.router.useNavigator?.());
  return <Outlet />;
});

export const RoutesPlugin = definePlugin({
  meta: {
    id: 'RoutesPlugin',
  },
  provides: {
    context: ({ children }) => <HashRouter>{children}</HashRouter>,
    components: {
      default: () => {
        const pluginContext = usePluginContext();
        const plugins = routerPlugins(pluginContext.plugins);
        const routes = plugins.map((plugin) => plugin.provides.router.routes?.() ?? []).flat();
        return useRoutes([
          {
            path: '/',
            element: <Root plugins={plugins} />,
            children: routes,
          },
        ]);
      },
    },
  },
});
